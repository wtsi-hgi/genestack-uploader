"""
    Entrypoint for Flask app
"""

import typing as T
import flask

from api import api_blueprint

app = flask.Flask(__name__, static_url_path="", static_folder="frontend/out")
app.register_blueprint(api_blueprint, url_prefix="/api")


@app.errorhandler(404)
def _(err: T.Any):
    return flask.send_from_directory(app.static_folder, "404.html"), 404

@app.route("/")
def _index():
    return flask.send_from_directory(app.static_folder, "index.html")

@app.route("/studies/")
def _studies_index():
    return flask.send_from_directory(app.static_folder, "studies.html")

@app.route("/studies/<_>")
def _studies_id(_):
    return flask.send_from_directory(app.static_folder + "/studies", "[id].html")

if __name__ == "__main__":
    app.run()
