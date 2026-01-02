import os
from flask import Blueprint, request, jsonify, current_app

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

@upload_bp.route("/get_files", methods=["GET"])
def get_files():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"files": files}), 200

@upload_bp.route("/delete_file/<filename>", methods=["DELETE"])
def delete_file(filename):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({"message": f"{filename} deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
