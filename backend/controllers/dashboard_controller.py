import os
import pandas as pd
from flask import Blueprint, request, jsonify

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/get_files", methods=["GET"])
def get_files():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"files": files}), 200

@dashboard_bp.route("/delete_file/<filename>", methods=["DELETE"])
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

@dashboard_bp.route("/get_sheets/<filename>", methods=["GET"])
def get_sheets(filename):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        xl = pd.ExcelFile(filepath)
        sheet_names = xl.sheet_names
        xl.close()
        return jsonify({"sheets": sheet_names})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@dashboard_bp.route("/get_sheets/<filename>/<sheet_name>", methods=["GET"])
def get_sheets_data(filename, sheet_name):
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    n_rows = int(request.args.get("rows", 5))
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        xl = pd.ExcelFile(filepath)
        df = xl.parse(sheet_name)

        # Replace NaN / NaT with empty string for JSON safety
        df = df.fillna("")

        preview = df.head(n_rows).to_dict(orient="records")  # convert to JSON
        columns = df.columns.tolist()
        xl.close()
        return jsonify({"columns": columns, "preview": preview})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
