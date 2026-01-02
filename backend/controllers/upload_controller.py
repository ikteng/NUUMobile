import os
from flask import Blueprint, request, jsonify

upload_bp = Blueprint("upload", __name__)

# Folder to store uploaded files
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@upload_bp.route("/upload", methods=["POST"])
def upload_files():
    if "files" not in request.files:
        return jsonify({"error": "No files part in the request"}), 400

    files = request.files.getlist("files")
    saved_files = []

    for f in files:
        # Save each file
        filepath = os.path.join(UPLOAD_FOLDER, f.filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        f.save(filepath)
        saved_files.append(f.filename)

    return jsonify({"message": "Files uploaded successfully", "files": saved_files}), 200
