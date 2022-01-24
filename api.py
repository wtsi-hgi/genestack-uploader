"""
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021, 2022 Genome Research Limited

Author: Michael Grace <mg38@sanger.ac.uk>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
"""

from collections import OrderedDict
import csv
import importlib.metadata
from json.decoder import JSONDecodeError
import logging
import os
from pathlib import Path
import pathlib
import time
import typing as T

import botocore
import flask
import paramiko
import requests
import uploadtogenestack

from api_utils import *  # pylint: disable=wildcard-import
import config
import s3

# first up, we need to grab the genestack configuration
# this is typically in ~/.genestack.cfg
# we define in the config which genestack server we're using
gs_config = uploadtogenestack.GenestackStudy.get_gs_config(
    config.GENESTACK_SERVER)
ssh_key_path = f"{os.environ['HOME']}/.ssh/id_rsa_genestack"

# as we need to pull files from the S3 bucket, we need a connection to the bucket
# to start of with. this can throw an exception right at the start of the program
# if we can't access the bucket, so a public policy will need setting so we
# can start the app
try:
    s3_bucket = uploadtogenestack.S3BucketUtils(
        gs_config["genestackbucket"],
        ssh_key_filepath=ssh_key_path)
except (
    botocore.exceptions.ClientError,
    uploadtogenestack.genestackassist.BucketPermissionDenied,
    paramiko.ssh_exception.PasswordRequiredException
) as start_s3_err:
    raise PermissionError(
        "you must set a public S3 policy to start the app") from start_s3_err

api_blueprint = flask.Blueprint("api", "api")

logger: logging.Logger = logging.getLogger("API")
logger.setLevel(config.LOG_LEVEL)


@api_blueprint.app_errorhandler(404)
def _():
    return not_found(EndpointNotFoundError())


@api_blueprint.route("", methods=["GET"])
def api_version() -> Response:
    """
        Default API endpoint, returns the software version and server
    """
    return create_response({
        "version": config.VERSION,
        "server": config.SERVER_ENDPOINT,
        "package": importlib.metadata.version("uploadtogenestack")
    })


@api_blueprint.route("/", methods=["GET"])
def _():
    """Here, we need both `.../api` and `.../api/` to
    give us the status information
    """
    return api_version()


@api_blueprint.route("/studies", methods=["GET", "POST"])
def all_studies() -> Response:
    """
        GET for returning all studies
        POST for creating new study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("missing token")
        return MISSING_TOKEN

    # ************ #
    # POST Handler #
    # ************ #
    if flask.request.method == "POST":

        # Here we going to be creating a new study
        # The information we need will be stored in the response body
        # This should be JSON, and should actually exist
        body: T.Dict[str, T.Any] = flask.request.json
        if body is None:
            logger.error("invalid body")
            return INVALID_BODY

        logger.info("starting an upload")

        try:
            # If we aren't given a specific Study Title, we're going to
            # use the Study Source as a placeholder
            if "Study Title" not in body or body["Study Title"] == "":
                body["Study Title"] = body["Study Source"]

            sample_file: T.Optional[Path] = None

            with s3.S3PublicPolicy(s3_bucket):
                if body.get("Sample File"):
                    # We need to download the sample file from the S3 bucket and
                    # store it locally so it can get uploaded.
                    # Once it has been uploaded, we don't care about it anymore,
                    # so we'll just store it in /tmp
                    sample_file = f"/tmp/samples_{int(time.time()*1000)}.tsv"

                    # Getting Data from S3
                    logger.info(
                        f"downloading sample file from S3 ({body['Sample File']}) to {sample_file}")
                    s3_bucket.download_file(body["Sample File"].strip().replace(
                        f"s3://{gs_config['genestackbucket']}/", ""), sample_file)

                    # Reanming Sample File Columns

                    # The user has the oppurtunity to rename columns in the sample file,
                    # or create new columns in the sample file before it gets uploaded.
                    # We get passed {old: ..., new: ..., colValue: ...} objects giving us
                    # the column name to rename, the new column name and the value that should
                    # be in the column. Leaving colValue blank shows we want to use the values
                    # that are already in that column (which can be different in every row).
                    # Filling in colValue means we want the same value in each cell, which
                    # can be used when making new columns. This involves leaving `old` as
                    # an empty string

                    # The other important thing is that is a column isn't included, it'll be
                    # deleted. We don't give the user the option to delete columns, so we need
                    # to ensure that ALL current columns are also included. For this, we read
                    # the headers of the sample file, and add those records in, keeping old and
                    # new the same, and leaving colValue blank, so it uses the already existing
                    # values.

                    # Then we open a file to write this all to, how the uploadtogenestack package
                    # expects it to be. This is a `|` separated file, with a header row:
                    # old|new|fillvalue
                    # where fillvalue is what we've called colValue up to now
                    # Then we can pass the samples file, this new temp file to the package, and
                    # get back the path of a new samples file, which we'll use later on.

                    # all this is under the assumption that we're going to rename anything,
                    # hence `if len(body["renamedColumns"]) != 0:`
                    if len(body["renamedColumns"]) != 0:
                        logger.info(
                            f"we have some columns to rename: {body['renamedColumns']}")

                        with open(sample_file, encoding="UTF-8") as samples:
                            reader = csv.reader(samples, delimiter="\t")
                            headers = next(reader)

                        for header in headers:
                            if header not in [x["old"].strip() for x in body["renamedColumns"]]:
                                body["renamedColumns"].append({
                                    "old": header,
                                    "new": header,
                                    "colValue": ""
                                })

                        tmp_rename_fp: str = f"/tmp/gs-rename-{int(time.time()*1000)}.tsv"
                        logger.info(
                            f"we're going to write the rename information to {tmp_rename_fp}")

                        with open(tmp_rename_fp, "w", encoding="UTF-8") as tmp_rename:
                            tmp_rename.write("old|new|fillvalue\n")
                            for col_rename in body["renamedColumns"]:
                                tmp_rename.write(
                                    "|".join([
                                        col_rename["old"].strip(),
                                        col_rename["new"].strip(),
                                        col_rename["colValue"].strip()
                                        if col_rename["colValue"].strip() != ""
                                        else "[fillvalue]"
                                    ]) + "\n")

                        if uploadtogenestack.GenestackUploadUtils.check_suggested_columns(
                            tmp_rename_fp,
                            sample_file
                        ):
                            logger.info(
                                "the rename file was fine, now we'll modify the sample file")
                            sample_file = pathlib.Path(
                                uploadtogenestack.GenestackUploadUtils.renamesamplefilecolumns(
                                    sample_file,
                                    tmp_rename_fp
                                )
                            )

                        else:
                            logger.error("failed to validate the sample file")
                            return bad_request_error(FailedToVerifyColumnRenamingError())

                    else:
                        logger.info("no columns to rename")

                # Although these are passed to us in our API,
                # it would be invalid in what we pass to genestack, so we
                # need rid of it now we've downloaded the file from S3
                del body["Sample File"]
                del body["renamedColumns"]

                # Creating Metadata TSV

                # Genestack needs us to give it the metadata in a TSV file, which has
                # two rows, the top row being the metadata keys, and the second row being
                # the metadata values.

                # We can then create a new `GenestackStudy` to upload everything to Genestack
                tmp_fp: str = f"/tmp/genestack-{int(time.time()*1000)}.tsv"
                logging.info(f"using {tmp_fp} as the metadata file")

                with open(tmp_fp, "w", encoding="UTF-8") as tmp_tsv:
                    logger.info("writing to metadata file")
                    body = OrderedDict(body)
                    tmp_tsv.write("\t".join(x.strip()
                                  for x in body.keys()) + "\n")
                    tmp_tsv.write("\t".join(x.strip()
                                  for x in body.values()) + "\n")

                logger.info("creating study")
                study = uploadtogenestack.GenestackStudy(
                    samplefile=sample_file,
                    genestackserver=config.GENESTACK_SERVER,
                    genestacktoken=token,
                    studymetadata=tmp_fp,
                    ssh_key_filepath=ssh_key_path
                )

            logger.info(f"study created all good: {study.study_accession}")
            return create_response({"accession": study.study_accession}, 201)

        except KeyError as err:
            logger.error("missing key")
            logger.exception(err)
            return create_response({"error": f"missing key: {err}"}, 400)

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
            logger.error("request forbidden")
            logger.exception(err)
            return FORBIDDEN

        except FileNotFoundError as err:
            logger.error("File Not Found")
            logger.exception(err)
            return not_found(err)

        except (
            botocore.exceptions.ClientError,
            uploadtogenestack.genestackassist.BucketPermissionDenied
        ) as err:
            logger.error("S3 Bucket Permission Denied")
            logger.exception(err)
            return S3_PERMISSION_DENIED

        except EOFError as err:
            # package asks for confirmation, user can't give it
            logger.error("uploadtogenestack package can't read stdin")
            logger.exception(err)
            return FILE_IN_BUCKET

        except Exception as err:
            logger.error("Error")
            logger.exception(err)
            return internal_server_error(err)

    # *********** #
    # GET Handler #
    # *********** #
    try:
        logger.info("Getting all Studies")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)
        # Note: This doesn't take into account pagination
        # will return max. 2000 results
        studies = gsu.ApplicationsODM(gsu, None).get_all_studies()
        return create_response(studies.json()["data"])

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Request Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/studies/<study_id>", methods=["GET"])
def single_study(study_id: str) -> Response:
    """
        GET: return information about single study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("Request for Single Study missing Token")
        return MISSING_TOKEN

    study: T.Optional[requests.Response] = None
    try:
        logger.info(f"Getting single study: {study_id}")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)
        study = gsu.ApplicationsODM(gsu, None).get_study(study_id.strip())
        return create_response(study.json())

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except JSONDecodeError:
        if study and "Object cannot be found" in study.text:
            logger.error(f"Study Not Found: {study_id}: {study.text}")
            return not_found(StudyNotFoundError(study.text))
        raise

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/studies/<study_id>/signals", methods=["GET", "POST"])
def all_signals(study_id: str) -> Response:
    """
        GET: get all signal datasets for a study
        POST: create new dataset for study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error(
            "request for all signals (either GET or POST) with no token")
        return MISSING_TOKEN

    # ************ #
    # POST Handler #
    # ************ #
    if flask.request.method == "POST":
        logger.info("POST request: let's make a new signal dataset")

        # As with the POST to create a new study, all the information we want
        # is in the JSON body
        body: T.Dict[str, T.Any] = flask.request.json
        if body is None:
            logger.error("no body provided in request")
            return INVALID_BODY

        # The user can specify what attributes in the signal file they want to use to link
        # it to the samples. By default we use Sample Source ID, so we don't care if that's already
        # in the list. It will be if coming from our frontend, cause we give it to the user to
        # clearly show what's going on

        # We basically need to replace the list of strings we get, with a list of objects,
        # {"column": value} for value in list
        try:
            body["linkingattribute"] = [
                {"column": x.strip()} for x in body["linkingattribute"] if x != "Sample Source ID"]

            # Creating Metadata TSV

            # As with creating the study, genestack needs the metadata to be in a TSV file
            # with the first line being the keys, and the second line being the values
            tmp_fp: str = f"/tmp/genestack-{int(time.time()*1000)}.tsv"
            logger.info(f"using {tmp_fp} as the metadata file")

            with open(tmp_fp, "w", encoding="UTF-8") as tmp_tsv:
                body["metadata"] = OrderedDict(body["metadata"])
                tmp_tsv.write("\t".join(x.strip()
                              for x in body["metadata"].keys()) + "\n")
                tmp_tsv.write("\t".join(x.strip()
                              for x in body["metadata"].values()) + "\n")

            body["metadata"] = tmp_fp

            with s3.S3PublicPolicy(s3_bucket):
                # Downloading S3 File
                logger.info(
                    f"downloading {body['data']} from S3 to /tmp/{body['data'].strip().replace('/', '_')}")
                s3_bucket.download_file(
                    body["data"].strip().replace(f"s3://{gs_config['genestackbucket']}/", ""), f"/tmp/{body['data'].strip().replace('/', '_')}")

                body["data"] = f"/tmp/{body['data'].strip().replace('/', '_')}"

                # Generating a Minimal VCF File if we need it
                # This generates the tmp file, and replaces our data file
                # with it
                if body["type"].strip().lower() == "variant" and body.get("generateMinimalVCF"):
                    new_body = f"/tmp/minimalvcf-{int(time.time()*1000)}.tsv"
                    logger.info(f"generating minimal VCF {new_body}")

                    uploadtogenestack.GenestackUploadUtils.writeonelinevcf(
                        uploadtogenestack.GenestackUploadUtils.get_vcf_samples(
                            body["data"]),
                        new_body
                    )

                    body["data"] = new_body
                    logger.info("successfully made new minimal VCF")

                # By "creating" a GenestackStudy with a study accession, we'll actually
                # be able to modify the study - in our case we want to add a signal_dict
                logger.info(f"adding signal for study {study_id.strip()}")

                uploadtogenestack.GenestackStudy(
                    study_genestackaccession=study_id.strip(),
                    genestackserver=config.GENESTACK_SERVER,
                    genestacktoken=token,
                    signal_dict=body,
                    ssh_key_filepath=ssh_key_path
                )

            logger.info(f"successfully made signal dataset for {study_id}")
            return CREATED

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
            logger.error("Forbidden")
            logger.exception(err)
            return FORBIDDEN

        except FileNotFoundError as err:
            logger.error("File Not Found")
            logger.exception(err)
            return not_found(err)

        except uploadtogenestack.genestackassist.LinkingNotPossibleError as err:
            logger.error("Bad Request")
            logger.exception(err)
            return bad_request_error(err)

        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            logger.error("Study Not Found")
            logger.exception(err)
            return not_found(err)

        except (
            botocore.exceptions.ClientError,
            uploadtogenestack.genestackassist.BucketPermissionDenied
        ) as err:
            logger.error("S3 Bucket Permission Denied")
            logger.exception(err)
            return S3_PERMISSION_DENIED

        except EOFError as err:
            # package asks for confirmation, user can't give it
            logger.error("can't read stdin")
            logger.exception(err)
            return FILE_IN_BUCKET

        except Exception as err:
            logger.error("Error")
            logger.exception(err)
            return internal_server_error(err)

    # *********** #
    # GET Handler #
    # *********** #
    try:
        logger.info(f"getting info for all signals for study {study_id}")

        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)
        signals = [signal for type in ["variant", "expression"]
                   for signal in gsu.get_signals_by_group(study_id.strip(), type)]

        logger.info("got signals OK")
        return create_response({"studyAccession": study_id.strip(), "signals": signals})

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except uploadtogenestack.genestackETL.StudyAccessionError as err:
        logger.error(f"Study {study_id} not found")
        logger.exception(err)
        return not_found(err)

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/studies/<study_id>/signals/<signal_id>", methods=["GET"])
def single_signal(study_id: str, signal_id: str) -> Response:
    """
        GET: get information about single dataset
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("request for single signal missing token")
        return MISSING_TOKEN

    try:
        logger.info(f"getting info for signal {signal_id}")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)

        signals = [signal for type in ["variant", "expression"]
                   for signal in gsu.get_signals_by_group(study_id.strip(), type)
                   if signal["itemId"] == signal_id.strip()]

        if len(signals) == 1:
            logger.info("found 1 signal: all good")
            return create_response({"studyAccession": study_id.strip(), "signal": signals[0]})

        if len(signals) == 0:
            logger.error(f"signal not found: {signal_id} on study {study_id}")
            return not_found(
                SignalNotFoundError(
                    f"signal {signal_id} not found on study {study_id}")
            )

        logger.error("multiple signals found")
        return internal_server_error(MultipleSignalsFoundError("multiple signals found"))

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except uploadtogenestack.genestackETL.StudyAccessionError as err:
        logger.error(f"Study not found: {study_id}")
        logger.exception(err)
        return not_found(err)

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/templates", methods=["GET"])
def get_all_templates():
    """
        Gets all the templates from genestack
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("request for all templates without token")
        return MISSING_TOKEN

    try:
        logger.info("getting all templates")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)
        template = gsu.ApplicationsODM(gsu, None).get_all_templates()
        return create_response(template.json()["result"])

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/templates/<template_id>", methods=["GET"])
def get_template(template_id: str):
    """
        Gets the details about template <template_id> (accession)
        from genestack
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("request for single template without token")
        return MISSING_TOKEN

    try:
        logger.error(f"getting single template {template_id}")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT)
        template = gsu.ApplicationsODM(
            gsu, None).get_template_detail(template_id.strip())

        if "Failed to found template" in template.text:
            # OK, here we go
            # Time for a bit of complaining about the Genestack API

            # What I wanted to do here was:
            # if template.status_code == 404:
            # you know, like I should be able to do, as 404 is the status code
            # for when something isn't found.

            # But Genestack doesn't return a 404 when it can't find the template,
            # instead it returns "201 Created". **mindblow**
            # It's not like its even creating the template when it doesn't find it

            # So, here we are. I'm searching for "Failed to found template" in
            # the response text. Which doesn't even really make sense.

            # ¯\_(ツ)_/¯
            # Complaining Over.

            logger.error("Template not Found")
            logger.error(template.json()["error"])
            return not_found(TemplateNotFoundError(template.json()["error"]))

        logger.info(f"template {template_id} found")
        return create_response({
            "accession": template_id.strip(),
            "template": template.json()["result"]
        })

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)


@api_blueprint.route("/templateTypes", methods=["GET"])
def get_template_types():
    """
        Gets the display names and datatypes for templates
        to make it more presentable to the user
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        logger.error("request for template types with missing token")
        return MISSING_TOKEN

    try:
        logger.info("getting template types")
        gsu = uploadtogenestack.GenestackUtils(
            token=token, server=config.SERVER_ENDPOINT
        )
        types = gsu.ApplicationsODM(gsu, None).get_template_types()

        logger.info("happily got template types")
        return create_response(types.json()["result"])

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return FORBIDDEN

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return internal_server_error(err)
