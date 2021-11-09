"""
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021 Genome Research Limited

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

import flask
from flask_swagger_ui import get_swaggerui_blueprint
import waitress

from api import api_blueprint

app = flask.Flask(__name__, static_url_path="", static_folder="frontend/out")
app.register_blueprint(api_blueprint, url_prefix="/api")


@app.errorhandler(404)
def _(_):
    return flask.send_from_directory(app.static_folder, "404.html"), 404


@app.route("/")
def _index():
    return flask.send_from_directory(app.static_folder, "index.html")


@app.route("/studies/")
def _studies_index():
    return flask.send_from_directory(app.static_folder, "studies.html")


@app.route("/studies/<_>")
def _studies_id(_):
    return flask.send_from_directory(app.static_folder + "/studies", "[studyid].html")


@app.route("/studies/<_>/signals")
def _signal_index(_):
    return flask.send_from_directory(app.static_folder + "/studies/[studyid]", "signals.html")


@app.route("/studies/<_a>/signals/<_b>")
def _signals_id(**_):
    return flask.send_from_directory(
        app.static_folder + "/studies/[studyid]/signals", "[signalid].html")


@app.route("/docs/openapi")
def _openapi():
    return flask.send_from_directory("", "openapi.yaml")


swaggerui_blueprint = get_swaggerui_blueprint(
    "/docs",
    "/docs/openapi",
)

app.register_blueprint(swaggerui_blueprint)


def production():
    """Run in production with waitress"""
    waitress.serve(app, host="0.0.0.0", port=5000)


if __name__ == "__main__":
    app.run()
