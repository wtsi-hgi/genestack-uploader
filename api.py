"""
    API Endpoints
"""

from json.decoder import JSONDecodeError
import typing as T

import flask
import uploadtogenestack

import config

api_blueprint = flask.Blueprint("api", "api")

Response = T.Tuple[T.Dict[str, T.Any], int]


def _create_response(data: T.Any, code: int = 200) -> Response:
    return {
        "status": "OK" if code // 100 == 2 else "FAIL",
        "data": data
    }, code


INVALID_BODY = _create_response({"error": "no valid json body"}, 400)
MISSING_TOKEN = _create_response({"error": "missing token"}, 403)
UNAUTHORISED = _create_response({"error": "unauthorised"}, 403)
NOT_IMPLEMENTED = _create_response({"error": "not implemented"}, 501)
METHOD_NOT_ALLOWED = _create_response({"error": "method not allowed"}, 405)


def _internal_server_error(err: T.List[str]):
    """
        500 Internal Server Error Response
    """

    return _create_response({"error": "internal server error", "detail": err}, 500)


@api_blueprint.app_errorhandler(404)
def _not_found(err: T.Any) -> Response:
    """
        404 Not Found Response
    """
    return _create_response({"error": f"not found: {err}"}, 404)


@api_blueprint.route("", methods=["GET"])
def api_version() -> Response:
    """
        Default API endpoint, returns the software version
    """
    return _create_response({"version": config.VERSION})


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
        body = flask.request.json
        if body is None:
            return INVALID_BODY
        try:
            # Required Body Fields

            #     - studyName

            # Optional Body Fields

            #     - localDirectory
            #     - sampleFile

            study = uploadtogenestack.genestackstudy(
                studyname=body["studyName"],
                study_local=body.get("localDirectory"),
                samplefile=body.get("sampleFile"),
                genestackserver=config.GENESTACK_SERVER,
                genestacktoken=token
            )
            # TODO Method in uploadtogenestack
            return _create_response(study.allstudydict)
        except KeyError as err:
            return _create_response({"error": f"missing key: {err}"}, 400)
        except Exception as err:
            # should this maybe be a 500?
            return _create_response({"error": err}, 500)
    if flask.request.method == "GET":
        # TODO
        return NOT_IMPLEMENTED
    return METHOD_NOT_ALLOWED


@api_blueprint.route("/studies/<study_id>", methods=["GET", "POST"])
def single_study(study_id: str) -> Response:
    """
        GET: return information about single study
        POST: update a single study
    """
    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN
    if flask.request.method == "POST":
        # TODO
        return NOT_IMPLEMENTED
    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.genestack_utils(token=token)
            study = gsu.ApplicationsODM(gsu, None).get_study(study_id)
            return _create_response(study.json())
        except PermissionError:
            return UNAUTHORISED
        except JSONDecodeError:
            if "Object cannot be found" in study.text:
                return _not_found(study.text)
            raise
        except Exception as err:
            return _internal_server_error(err.args)
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
        return NOT_IMPLEMENTED
    if flask.request.method == "GET":
        return NOT_IMPLEMENTED
    return METHOD_NOT_ALLOWED


@api_blueprint.route("/studies/<study_id>/signals/<signal_id>", methods=["GET", "POST"])
def single_signal(study_id: str, signal_id: str) -> Response:
    """
        GET: get information about single dataset
        POST: update a single dataset
    """
    token: str = flask.request.headers.get("Genestack-API-Token")
    if not token:
        return MISSING_TOKEN
    if flask.request.method == "POST":
        return NOT_IMPLEMENTED
    if flask.request.method == "GET":
        return NOT_IMPLEMENTED
    return METHOD_NOT_ALLOWED
