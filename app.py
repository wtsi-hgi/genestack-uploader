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

import logging
from multiprocessing import freeze_support
import flask
from flask_swagger_ui import get_swaggerui_blueprint
from api import api_blueprint, start_multiproc
import config

# We're going to make our Flask app, using the root as the path to static files
# and frontend/out as the location of our static files.
# frontend/out is where the next js frontend gets built to.
# We also need to register our api_blueprint (defined in api.py) to every
# path starting with /api.
app = flask.Flask(__name__, static_url_path="", static_folder="frontend/out")
app.register_blueprint(api_blueprint, url_prefix="/api")

logging.basicConfig()


@app.errorhandler(404)
def _(_):
    return flask.send_from_directory(app.static_folder, "404.html"), 404

# as next js produces files with [square brackets] indicating URL parameters
# we need to use those files when given parameters, so we tell Flask to ignore
# them and just serve the static files


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

# The API spec is given in the openapi.yaml file, which is in the root
# of the project, and is served at /docs/openapi


@app.route("/docs/openapi")
def _openapi():
    return flask.send_from_directory("", "openapi.yaml")


# as we want interactive swagger docs, we can get a blueprint for it
# and register it to our app on /docs using the spec at /docs/openapi
swaggerui_blueprint = get_swaggerui_blueprint(
    f"{config.BASE_URL}/docs",
    f"{config.BASE_URL}/docs/openapi",
)

app.register_blueprint(swaggerui_blueprint, url_prefix="/docs")

if __name__ == "__main__":
    freeze_support()
    start_multiproc()
    app.run("0.0.0.0")
