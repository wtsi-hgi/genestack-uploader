"""
    API Endpoints
"""

from json.decoder import JSONDecodeError
import time
import typing as T

import flask
import requests
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


def _internal_server_error(err: T.Tuple[T.Any, ...]):
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
        body: T.Dict[str, T.Any] = flask.request.json
        if body is None:
            return INVALID_BODY
        try:

            sample_file = body["Sample File"]
            del body["Sample File"]

            tmp_fp: str = f"/tmp/genestack-{int(time.time()*1000)}.tsv"
            with open(tmp_fp, "w") as f:
                f.write("\t".join(body.keys()) + "\n")
                f.write("\t".join(body.values()) + "\n")

            study = uploadtogenestack.genestackstudy(
                studyname=body.get("Study Title") or body.get("Study Source"),
                samplefile=sample_file,
                genestackserver=config.GENESTACK_SERVER,
                genestacktoken=token,
                studymetadata=tmp_fp
            )
            # TODO Method in uploadtogenestack
            return _create_response(study.allstudydict)
        except KeyError as err:
            return _create_response({"error": f"missing key: {err}"}, 400)
        except PermissionError:
            return UNAUTHORISED
        except Exception as err:
            return _internal_server_error(err.args)
    if flask.request.method == "GET":
        try:
            gsu = uploadtogenestack.genestack_utils(token=token)
            # Note: This doesn't take into account pagination
            # will return max. 2000 results
            studies = gsu.ApplicationsODM(gsu, None).get_all_studies()
            return _create_response(studies.json()["data"])
        except PermissionError:
            return UNAUTHORISED
        except Exception as err:
            return _internal_server_error(err.args)
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
        study: T.Optional[requests.Response] = None
        try:
            gsu = uploadtogenestack.genestack_utils(token=token)
            study = gsu.ApplicationsODM(gsu, None).get_study(study_id)
            return _create_response(study.json())
        except PermissionError:
            return UNAUTHORISED
        except JSONDecodeError:
            if study and "Object cannot be found" in study.text:
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
        try:
            gsu = uploadtogenestack.genestack_utils(token=token)
            signals = [signal for type in ["variant", "expression"]
                       for signal in gsu.get_signals_by_group(study_id, type)]
            return _create_response({"studyAccession": study_id, "signals": signals})
        except PermissionError:
            return UNAUTHORISED
        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            return _not_found(err)
        except Exception as err:
            return _internal_server_error(*err.args)
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
        try:
            gsu = uploadtogenestack.genestack_utils(token=token)
            signals = [signal for type in ["variant", "expression"]
                       for signal in gsu.get_signals_by_group(study_id, type)
                       if signal["itemId"] == signal_id]
            if len(signals) == 1:
                return _create_response({"studyAccession": study_id, "signal": signals[0]})
            if len(signals) == 0:
                return _not_found(f"signal {signal_id} not found on study {study_id}")
            return _internal_server_error(("multiple signals found",))
        except PermissionError:
            return UNAUTHORISED
        except uploadtogenestack.genestackETL.StudyAccessionError as err:
            return _not_found(err)
        except Exception as err:
            return _internal_server_error(*err.args)
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
            gsu = uploadtogenestack.genestack_utils(token=token)
            template = gsu.ApplicationsODM(gsu, None).get_all_templates()
            return _create_response(template.json()["result"])
        except PermissionError:
            return UNAUTHORISED
        except Exception as err:
            return _internal_server_error(*err.args)


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
            gsu = uploadtogenestack.genestack_utils(token=token)
            template = gsu.ApplicationsODM(
                gsu, None).get_template_detail(template_id)
            return _create_response({"accession": template_id, "template": template.json()["result"]})
        except PermissionError:
            return UNAUTHORISED
        except Exception as err:
            return _internal_server_error(*err.args)
