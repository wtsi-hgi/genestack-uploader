"""
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2022 Genome Research Limited

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

import typing as T

from uploader.common import JobStatus

JobResponse = T.Tuple[JobStatus, T.Dict[str, T.Any]]

INVALID_BODY: JobResponse = JobStatus.Failed, {"error": "no valid json body"}
FORBIDDEN: JobResponse = JobStatus.Failed, {"error": "forbidden"}
S3_PERMISSION_DENIED: JobResponse = JobStatus.Failed, {
    "error": "S3 bucket permission denied"}


def bad_request_error(err: Exception) -> JobResponse:
    """returns a failed response when the user
    provides invalid information for the upload"""

    return JobStatus.Failed, {
        "error": "bad request",
        "name": err.__class__.__name__,
        "detail": err.args
    }


def study_created(accession: str) -> JobResponse:
    """returns a completed succesful response
    when a study has been uploaded and
    gives the newly created studyAccession"""

    return JobStatus.Completed, {
        "studyAccession": accession
    }


def signal_created(study_accession: str) -> JobResponse:
    """returns a completed succesful response
    when a signal has been uploaded and
    gives the accession of the study it
    was uploaded to (yes, the user did
    provide this anyway)"""

    return JobStatus.Completed, {
        "signal": "created",
        "studyAccession": study_accession
    }


def other_error(err: Exception) -> JobResponse:
    """returns a failure response when something
    not covered anywhere else happens"""

    return JobStatus.Failed, {
        "error": "error",
        "name": err.__class__.__name__,
        "detail": err.args
    }


def not_found(err: Exception) -> JobResponse:
    """returns a failure response when something
    the user provides can't be found, such as
    a study id"""

    return JobStatus.Failed, {
        "error": "not found",
        "name": err.__class__.__name__,
        "detail": err.args
    }
