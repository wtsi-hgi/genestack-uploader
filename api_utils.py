"""
    Provides some helper functions and exceptions for the API
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


INVALID_BODY = create_response({"error": "no valid json body"}, 400)
MISSING_TOKEN = create_response({"error": "missing token"}, 401)
FORBIDDEN = create_response({"error": "forbidden"}, 403)
# NOT_IMPLEMENTED = create_response({"error": "not implemented"}, 501)
METHOD_NOT_ALLOWED = create_response({"error": "method not allowed"}, 405)

CREATED = create_response("Created", 201)


def internal_server_error(err: Exception):
    """
        500 Internal Server Error Response
    """

    return create_response({
        "error": "internal server error",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 500)


def bad_request_error(err: Exception):
    """
        400 Bad Request Error Response
    """

    return create_response({
        "error": "bad request",
        "name": err.__class__.__name__,
        "detail": err.args
    }, 400)


def not_found(err: T.Any) -> Response:
    """
        404 Not Found Response
    """
    return create_response({"error": f"not found: {err}"}, 404)


class EndpointNotFoundError(Exception):
    """
        For default 404 in the API
    """
    super().__init__("Not Found")


class SignalNotFoundError(Exception):
    """For when signal not found"""
    ...


class MultipleSignalsFoundError(Exception):
    """
    When multiple signals are found
    given the criteria
    """
    ...


class TemplateNotFoundError(Exception):
    """
    When a template isn't found
    """
    ...


class StudyNotFoundError(Exception):
    """
    When a study isn't found
    """
    ...
