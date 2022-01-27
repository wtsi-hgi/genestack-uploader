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
import logging
import os
import shutil
import typing as T
import time

import botocore

import uploadtogenestack

from uploader import job_responses, s3
from uploader.job_responses import JobResponse


def new_signal(
    token: str,
    body: T.Dict[str, T.Any],
    logger: logging.Logger,
    env: T.Dict[str, T.Any],
    study_id: str
) -> JobResponse:
    """
        Creating a New Signal

        Args:
            token: str: genestack token
            body: Dict[str, Any]: all the metadata needed - given
                from the body of the API request
            logger: logging.Logger: the job's logger object
            env: Dict[str, Any]: the environment the jobs are run in
            study_id: str: the study id of the study the signal is
                linked to

        Returns:
            JobResponse: the response containing both a JobStatus
                and Dict[str, Any] as the output for the user
    """

    # As with the POST to create a new study, all the information we want
    # is in the JSON body
    if body is None:
        logger.error("no body provided in request")
        return job_responses.INVALID_BODY

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

        s3_bucket = env["s3_bucket"]

        with s3.S3PublicPolicy(s3_bucket):
            # Downloading S3 File
            logger.info(
                f"downloading {body['data']} from S3 to /tmp/{body['data'].strip().replace('/', '_')}")  # pylint: disable=line-too-long

            gs_config = env["gs_config"]
            s3_bucket.download_file(
                body["data"].strip().replace(
                    f"s3://{gs_config['genestackbucket']}/", ""),
                f"/tmp/{body['data'].strip().replace('/', '_')}"
            )

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

            study = uploadtogenestack.GenestackStudy(
                study_genestackaccession=study_id.strip(),
                genestackserver=env["gs_server"],
                genestacktoken=token,
                signal_dict=body,
                ssh_key_filepath=env["ssh_key_path"]
            )

        logger.info(f"successfully made signal dataset for {study_id}")
        return job_responses.signal_created(study_id)

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("Forbidden")
        logger.exception(err)
        return job_responses.FORBIDDEN

    except (
        FileNotFoundError,
        uploadtogenestack.genestackassist.LinkingNotPossibleError
    ) as err:
        logger.error("Bad Request")
        logger.exception(err)
        return job_responses.bad_request_error(err)

    except uploadtogenestack.genestackETL.StudyAccessionError as err:
        logger.error("Study Not Found")
        logger.exception(err)
        return job_responses.not_found(err)

    except (
        botocore.exceptions.ClientError,
        uploadtogenestack.genestackassist.BucketPermissionDenied
    ) as err:
        logger.error("S3 Bucket Permission Denied")
        logger.exception(err)
        return job_responses.S3_PERMISSION_DENIED

    except Exception as err:
        logger.error("Error")
        logger.exception(err)
        return job_responses.other_error(err)

    finally:
        try:
            os.remove(tmp_fp)  # type: ignore
            os.remove(body["data"])  # type: ignore
            shutil.rmtree(study.local_dir)  # type: ignore
        except (FileNotFoundError, UnboundLocalError, TypeError):
            pass
