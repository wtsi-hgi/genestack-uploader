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

import typing as T

Response = T.Tuple[T.Dict[str, T.Any], int]


def create_response(data: T.Any, code: int = 200) -> Response:
    """
    Return an API response that complies to the API

    Params:
        - data: the main body of the response
        - code: HTTP code, anything 200-299 is considered OK, anything else is FAIL

    Returns:
        - Tuple[Dict, int]
            Dict: The API response containing status and data as in the spec
            int: HTTP Response code
    """
    return {
        "status": "OK" if code // 100 == 2 else "FAIL",
        "data": data
    }, code


MISSING_TOKEN = create_response({"error": "missing token"}, 401)
FORBIDDEN = create_response({"error": "forbidden"}, 403)


def internal_server_error(err: Exception):
    """
        500 Internal Server Error Response
    """

    return create_response({
        "error": "internal server error",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 500)


def not_found(err: Exception) -> Response:
    """
        404 Not Found Response
    """
    return create_response({
        "error": "not found",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 404)


class EndpointNotFoundError(Exception):
    """
        For default 404 in the API
    """

    def __init__(self) -> None:
        super().__init__("Not Found")


class SignalNotFoundError(Exception):
    """For when signal not found"""


class MultipleSignalsFoundError(Exception):
    """
    When multiple signals are found
    given the criteria
    """


class TemplateNotFoundError(Exception):
    """When a template isn't found"""


class StudyNotFoundError(Exception):
    """When a study isn't found"""


class JobIDNotFound(KeyError):
    """when a job ID isn't found.
    this could be because it expired"""

    def __init__(self, *args: object) -> None:
        super().__init__(
            "Job ID not found. The job may have expired if it finished more than a week ago",
            *args
        )
