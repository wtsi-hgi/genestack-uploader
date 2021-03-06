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
import logging
import os
from pathlib import Path
import shutil
import time
import typing as T

import botocore
import uploadtogenestack

from uploader import job_responses, s3
from uploader.job_responses import JobResponse


def new_study(
        token: str,
        body: T.Dict[str, T.Any],
        logger: logging.Logger,
        env: T.Dict[str, T.Any],
        _) -> JobResponse:
    """
        Create a new study

        Args:
            token: str: genestack API token
            body: Dict[str, Any]: all the metadata for the study,
                this comes from the body of the API call
            logger: logging.Logger: the job's logger object
            env: Dict[str, Any]: the environment the jobs are run in

        Returns:
            JobResponse: containing both a JobStatus and Dict[str, Any],
                which is the output for the user
    """

    # Here we going to be creating a new study
    # The information we need will be stored in the response body
    # This should be JSON, and should actually exist
    if body is None:
        logger.error("invalid body")
        return job_responses.INVALID_BODY

    logger.info("starting an upload")

    try:
        # If we aren't given a specific Study Title, we're going to
        # use the Study Source as a placeholder
        if "Study Title" not in body or body["Study Title"] == "":
            body["Study Title"] = body["Study Source"]

        sample_file: T.Optional[Path] = None
        s3_bucket = env["s3_bucket"]

        template: str = body["template"]

        with s3.S3PublicPolicy(s3_bucket):
            if body.get("Sample File"):
                # We need to download the sample file from the S3 bucket and
                # store it locally so it can get uploaded.
                # Once it has been uploaded, we don't care about it anymore,
                # so we'll just store it in /tmp
                sample_file = Path(f"/tmp/samples_{int(time.time()*1000)}.tsv")

                # Getting Data from S3
                logger.info(
                    f"downloading sample file from S3 ({body['Sample File']}) to {sample_file}")

                gs_config = env["gs_config"]
                s3_bucket.download_file(body["Sample File"].strip().replace(
                    f"s3://{gs_config['genestackbucket']}/", ""), sample_file)

                # Changing Sample File Columns

                # The user has the oppurtunity to rename columns in the sample file,
                # create new columns in the sample file or delete them before it gets uploaded.

                # We open a file to write this all to, how the uploadtogenestack package
                # expects it to be. This is a `|` separated file, with a header row:
                # old|new|fillvalue
                # where fillvalue is what we've called colValue up to now
                # Then we can pass the samples file, this new temp file to the package, and
                # get back the path of a new samples file, which we'll use later on.

                # all this is under the assumption that we're going to change anything,
                # hence `if len(body["renamedColumns"]) + ... != 0:`

                if len(body["renamedColumns"]) + \
                    len(body["addedColumns"]) + \
                        len(body["deletedColumns"]) != 0:
                    logger.info("we have some columns to change")
                    logger.info(f"Change: {body['renamedColumns']}")
                    logger.info(f"Insert: {body['addedColumns']}")
                    logger.info(f"Delete: {body['deletedColumns']}")

                    with open(sample_file, encoding="UTF-8") as samples:
                        reader = csv.reader(samples, delimiter="\t")
                        headers = next(reader)

                    # Let's remove any records that are fully blank""
                    body["renamedColumns"] = [
                        x for x in body["renamedColumns"] if x["old"] != "" and x["new"] != ""]
                    body["addedColumns"] = [x for x in body["addedColumns"]
                                            if x["title"] != "" and x["value"] != ""]

                    # Let's check there's no entries not fully filled in
                    if [x for x in body["renamedColumns"] if x["old"] == "" or x["new"] == ""] or \
                            [x for x in body["addedColumns"]
                             if x["title"] == "" or x["value"] == ""]:
                        logger.error(
                            "records not complete in added/renamed columns")
                        return job_responses.bad_request_error(
                            ValueError(
                                "records not complete in added/renamed columns")
                        )

                    # Everything's going to go into the renamedColumns dict
                    # First, we need to add [fillvalue] to the values as the file requires
                    for col in body["renamedColumns"]:
                        col["colValue"] = "[fillvalue]"

                    # We'll now go through the columns left in the samples file, and add
                    # them if they're not to be deleted
                    for header in headers:
                        if header not in [x["old"].strip() for x in body["renamedColumns"]] \
                                and header not in [x.strip() for x in body["deletedColumns"]]:
                            body["renamedColumns"].append({
                                "old": header,
                                "new": header,
                                "colValue": "[fillvalue]"
                            })

                    # We'll now add the columns that are getting added
                    for col in body["addedColumns"]:
                        body["renamedColumns"].append({
                            "old": "",
                            "new": col["title"],
                            "colValue": col["value"]
                        })

                    tmp_rename_fp: Path = Path(
                        f"/tmp/gs-rename-{int(time.time()*1000)}.tsv")
                    logger.info(
                        f"we're going to write the rename information to {tmp_rename_fp}")

                    # We can now open the file, and write all that information to it
                    with open(tmp_rename_fp, "w", encoding="UTF-8") as tmp_rename:
                        tmp_rename.write("old|new|fillvalue\n")
                        for col_rename in body["renamedColumns"]:
                            tmp_rename.write(
                                "|".join([
                                    col_rename["old"].strip(),
                                    col_rename["new"].strip(),
                                    col_rename["colValue"].strip()
                                ]) + "\n")

                    try:
                        uploadtogenestack.GenestackUploadUtils.check_suggested_columns(
                            tmp_rename_fp,
                            sample_file
                        )
                        logger.info(
                            "the rename file was fine, now we'll modify the sample file")
                        sample_file = Path(
                            uploadtogenestack.GenestackUploadUtils.renamesamplefilecolumns(
                                sample_file,
                                tmp_rename_fp
                            )
                        )

                    except uploadtogenestack.genestackassist.ColumnRenamingError as err:
                        logger.error("failed to validate the sample file")
                        logger.exception(err)
                        return job_responses.bad_request_error(err)

                else:
                    logger.info("no columns to rename")

            # Although these are passed to us in our API,
            # it would be invalid in what we pass to genestack, so we
            # need rid of it now we've downloaded the file from S3
            del body["Sample File"]
            del body["renamedColumns"]
            del body["addedColumns"]
            del body["deletedColumns"]
            del body["template"]

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
                genestackserver=env["gs_server"],
                genestacktoken=token,
                studymetadata=tmp_fp,
                ssh_key_filepath=env["ssh_key_path"],
                genestack_template=template
            )

        logger.info(f"study created all good: {study.study_accession}")
        return job_responses.study_created(study.study_accession)

    except KeyError as err:
        logger.error("missing key")
        logger.exception(err)
        return job_responses.bad_request_error(err)

    except (PermissionError, uploadtogenestack.genestackETL.AuthenticationFailed) as err:
        logger.error("request forbidden")
        logger.exception(err)
        return job_responses.FORBIDDEN

    except FileNotFoundError as err:
        logger.error("File Not Found")
        logger.exception(err)
        return job_responses.bad_request_error(err)

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
            os.remove(sample_file)  # type: ignore
            os.remove(tmp_rename_fp)  # type: ignore
            os.remove(tmp_fp)  # type: ignore
            shutil.rmtree(study.local_dir)  # type: ignore
        except (FileNotFoundError, UnboundLocalError, TypeError):
            pass
