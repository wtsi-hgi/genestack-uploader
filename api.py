"""
    API Endpoints
"""

from collections import OrderedDict
import csv
import importlib.metadata
from json.decoder import JSONDecodeError
import time
import typing as T

import botocore
import flask
import requests
import uploadtogenestack

import config
import s3

gs_config = uploadtogenestack.GenestackStudy.get_gs_config(
    config.GENESTACK_SERVER)

try:
    s3_bucket = uploadtogenestack.S3BucketUtils(gs_config["genestackbucket"])
except botocore.exceptions.ClientError as start_s3_err:
    raise PermissionError(
        "you must set a public S3 policy to start the app") from start_s3_err

api_blueprint = flask.Blueprint("api", "api")

Response = T.Tuple[T.Dict[str, T.Any], int]


def _create_response(data: T.Any, code: int = 200) -> Response:
    return {
        "status": "OK" if code // 100 == 2 else "FAIL",
        "data": data
    }, code


INVALID_BODY = _create_response({"error": "no valid json body"}, 400)
MISSING_TOKEN = _create_response({"error": "missing token"}, 401)
FORBIDDEN = _create_response({"error": "forbidden"}, 403)
NOT_IMPLEMENTED = _create_response({"error": "not implemented"}, 501)
METHOD_NOT_ALLOWED = _create_response({"error": "method not allowed"}, 405)

CREATED = _create_response("Created", 201)


def _internal_server_error(err: Exception):
    """
        500 Internal Server Error Response
    """

    return _create_response({
        "error": "internal server error",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 500)


def _bad_request_error(err: Exception):
    """
        400 Bad Request Error Response
    """

    return _create_response({
        "error": "bad request",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 400)


class SignalNotFoundError(Exception):
    """For when signal not found"""
    ...


class MultipleSignalsFoundError(Exception):
    """
    When multiple signals are found
    given the criteria
    """
    ...


@api_blueprint.app_errorhandler(404)
def _not_found(err: T.Any) -> Response:
    """
        404 Not Found Response
    """
    return _create_response({"error": f"not found: {err}"}, 404)


@api_blueprint.route("", methods=["GET"])
def api_version() -> Response:
    """
        Default API endpoint, returns the software version and server
    """
    return _create_response({
        "version": config.VERSION,
        "server": config.SERVER_ENDPOINT,
        "package": importlib.metadata.version("uploadtogenestack")
    })


@api_blueprint.route("/studies", methods=["GET", "POST"])
def all_studies() -> Response:
    """
        GET for returning all studies
        POST for creating new study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "POST":
        body: T.Dict[str, T.Any] = flask.request.json
        if body is None:
            return INVALID_BODY
        try:
            if "Study Title" not in body or body["Study Title"] == "":
                body["Study Title"] = body["Study Source"]

            sample_file = f"/tmp/{body['Sample File'].replace('/', '_')}"

            with s3.S3PublicPolicy(s3_bucket):
                # Getting Data from S3
                s3_bucket.download_file(body["Sample File"], sample_file)

                del body["Sample File"]

                # Reanming Sample File Columns
                if len(body["renamedColumns"]) != 0:
                    with open(sample_file, encoding="UTF-8") as samples:
                        reader = csv.reader(samples, delimiter="\t")
                        headers = next(reader)

                    for header in headers:
                        if header not in [x["old"] for x in body["renamedColumns"]]:
                            body["renamedColumns"].append({
                                "old": header,
                                "new": header,
                                "colValue": ""
                            })

                    tmp_rename_fp: str = f"/tmp/gs-rename-{int(time.time()*1000)}.tsv"
                    with open(tmp_rename_fp, "w", encoding="UTF-8") as tmp_rename:
                        tmp_rename.write("old|new|fillvalue\n")
                        for col_rename in body["renamedColumns"]:
                            tmp_rename.write(
                                "|".join([
                                    col_rename["old"],
                                    col_rename["new"],
                                    col_rename["colValue"]
                                    if col_rename["colValue"] != ""
                                    else "[fillvalue]"
                                ]) + "\n")

                    if uploadtogenestack.GenestackUploadUtils.check_suggested_columns(
                        tmp_rename_fp,
                        sample_file
                    ):
                        sample_file = uploadtogenestack.GenestackUploadUtils. \
                            renamesamplefilecolumns(sample_file, tmp_rename_fp)

                del body["renamedColumns"]

                # Creating Metadata TSV
                tmp_fp: str = f"/tmp/genestack-{int(time.time()*1000)}.tsv"
                with open(tmp_fp, "w", encoding="UTF-8") as tmp_tsv:
                    body = OrderedDict(body)
                    tmp_tsv.write("\t".join(body.keys()) + "\n")
                    tmp_tsv.write("\t".join(body.values()) + "\n")

                study = uploadtogenestack.GenestackStudy(
                    samplefile=sample_file,
                    genestackserver=config.GENESTACK_SERVER,
                    genestacktoken=token,
                    studymetadata=tmp_fp
                )

            return _create_response({"accession": study.study_accession}, 201)

        except KeyError as err:
            return _create_response({"error": f"missing key: {err}"}, 400)

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except botocore.exceptions.ClientError:
            return _create_response({"error": "S3 bucket permission denied"}, 403)

        except Exception as err:
            return _internal_server_error(err)

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)
            # Note: This doesn't take into account pagination
            # will return max. 2000 results
            studies = gsu.ApplicationsODM(gsu, None).get_all_studies()
            return _create_response(studies.json()["data"])

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except Exception as err:
            return _internal_server_error(err)

    return METHOD_NOT_ALLOWED


@api_blueprint.route("/studies/<study_id>", methods=["GET"])
def single_study(study_id: str) -> Response:
    """
        GET: return information about single study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "GET":
        study: T.Optional[requests.Response] = None
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)
            study = gsu.ApplicationsODM(gsu, None).get_study(study_id)
            return _create_response(study.json())

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except JSONDecodeError:
            if study and "Object cannot be found" in study.text:
                return _not_found(study.text)
            raise

        except Exception as err:
            return _internal_server_error(err)

    return METHOD_NOT_ALLOWED


@api_blueprint.route("/studies/<study_id>/signals", methods=["GET", "POST"])
def all_signals(study_id: str) -> Response:
    """
        GET: get all signal datasets for a study
        POST: create new dataset for study
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "POST":
        body: T.Dict[str, T.Any] = flask.request.json
        if body is None:
            return INVALID_BODY
        try:
            body["linkingattribute"] = [
                {"column": x} for x in body["linkingattribute"] if x != "Sample Source ID"]

            # Creating Metadata TSV
            tmp_fp: str = f"/tmp/genestack-{int(time.time()*1000)}.tsv"
            with open(tmp_fp, "w", encoding="UTF-8") as tmp_tsv:
                tmp_tsv.write("\t".join(body["metadata"].keys()) + "\n")
                tmp_tsv.write("\t".join(body["metadata"].values()) + "\n")
            body["metadata"] = tmp_fp

            with s3.S3PublicPolicy(s3_bucket):
                # Downloading S3 File
                s3_bucket.download_file(
                    body["data"], f"/tmp/{body['data'].replace('/', '_')}")

                body["data"] = f"/tmp/{body['data'].replace('/', '_')}"

                uploadtogenestack.GenestackStudy(
                    study_genestackaccession=study_id,
                    genestackserver=config.GENESTACK_SERVER,
                    genestacktoken=token,
                    signal_dict=body
                )

            return CREATED

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except (
            FileNotFoundError,
            uploadtogenestack.genestackassist.LinkingNotPossibleError
        ) as err:
            return _bad_request_error(err)

        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            return _not_found(err)

        except botocore.exceptions.ClientError:
            return _create_response({"error": "S3 bucket permission denied"}, 403)

        except Exception as err:
            return _internal_server_error(err)

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)
            signals = [signal for type in ["variant", "expression"]
                       for signal in gsu.get_signals_by_group(study_id, type)]
            return _create_response({"studyAccession": study_id, "signals": signals})

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            return _not_found(err)

        except Exception as err:
            return _internal_server_error(err)

    return METHOD_NOT_ALLOWED


@api_blueprint.route("/studies/<study_id>/signals/<signal_id>", methods=["GET"])
def single_signal(study_id: str, signal_id: str) -> Response:
    """
        GET: get information about single dataset
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)

            signals = [signal for type in ["variant", "expression"]
                       for signal in gsu.get_signals_by_group(study_id, type)
                       if signal["itemId"] == signal_id]

            if len(signals) == 1:
                return _create_response({"studyAccession": study_id, "signal": signals[0]})

            if len(signals) == 0:
                return _not_found(
                    SignalNotFoundError(
                        f"signal {signal_id} not found on study {study_id}")
                )

            return _internal_server_error(MultipleSignalsFoundError("multiple signals found"))

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            return _not_found(err)

        except Exception as err:
            return _internal_server_error(err)

    return METHOD_NOT_ALLOWED


@api_blueprint.route("/templates", methods=["GET"])
def get_all_templates():
    """
        Gets all the templates from genestack
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)
            template = gsu.ApplicationsODM(gsu, None).get_all_templates()
            return _create_response(template.json()["result"])

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except Exception as err:
            return _internal_server_error(err)


@api_blueprint.route("/templates/<template_id>", methods=["GET"])
def get_template(template_id: str):
    """
        Gets the details about template <template_id> (accession)
        from genestack
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT)
            template = gsu.ApplicationsODM(
                gsu, None).get_template_detail(template_id)
            return _create_response({
                "accession": template_id,
                "template": template.json()["result"]
            })

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except Exception as err:
            return _internal_server_error(err)


@api_blueprint.route("/templateTypes", methods=["GET"])
def get_template_types():
    """
        Gets the display names and datatypes for templates
        to make it more presentable to the user
    """

    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN

    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.GenestackUtils(
                token=token, server=config.SERVER_ENDPOINT
            )
            types = gsu.ApplicationsODM(gsu, None).get_template_types()
            return _create_response(types.json()["result"])

        except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed):
            return FORBIDDEN

        except Exception as err:
            return _internal_server_error(err)
