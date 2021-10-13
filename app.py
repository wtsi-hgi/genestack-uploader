"""
    Entrypoint for Flask app
"""

import flask

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


if __name__ == "__main__":
    app.run()
