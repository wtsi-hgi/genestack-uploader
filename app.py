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
    return f"<h1>Not Found</h1>{err}"

@app.route("/")
def _():
    return flask.redirect("/index.html")

if __name__ == "__main__":
    app.run()
