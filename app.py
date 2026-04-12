from pathlib import Path

from flask import Flask, send_from_directory


BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"

app = Flask(__name__, static_folder=str(DIST_DIR), static_url_path="")


@app.route("/")
def index() -> object:
    return send_from_directory(DIST_DIR, "index.html")


@app.route("/<path:path>")
def assets(path: str) -> object:
    file_path = DIST_DIR / path
    if file_path.exists() and file_path.is_file():
        return send_from_directory(DIST_DIR, path)
    return send_from_directory(DIST_DIR, "index.html")


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)