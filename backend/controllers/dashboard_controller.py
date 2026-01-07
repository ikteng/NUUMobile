import os
import pandas as pd
import json 
from datetime import datetime
from collections import defaultdict
from flask import Blueprint, request, jsonify

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/get_files", methods=["GET"])
def get_files():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify({"files": files}), 200

@dashboard_bp.route("/delete_file/<file>", methods=["DELETE"])
def delete_file(file):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, file)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({"message": f"{file} deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/get_sheets/<file>", methods=["GET"])
def get_sheets(file):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        xl = pd.ExcelFile(filepath)
        sheet_names = xl.sheet_names
        xl.close()
        return jsonify({"sheets": sheet_names})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def paginate(df, page, page_size):
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    return df.iloc[start:end], total

@dashboard_bp.route("/get_sheets_data/<file>/<sheet>", methods=["GET"])
def get_sheets_data(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        # Get pagination parameters from query
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))  # default 50 rows per page

        xl = pd.ExcelFile(filepath)
        df = xl.parse(sheet)
        df = df.fillna("")

        paged_df, total_rows = paginate(df, page, page_size)
        preview = paged_df.to_dict(orient="records")
        columns = df.columns.tolist()
        xl.close()

        return jsonify({
            "columns": columns,
            "preview": preview,
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_rows + page_size - 1) // page_size
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@dashboard_bp.route("/get_sheets_data/<file>/<sheet>/search", methods=["GET"])
def get_sheets_data_by_search(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        # Get pagination parameters from query
        searchTerm = request.args.get("search", "").lower()  # from query string
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))  # default 50 rows per page

        xl = pd.ExcelFile(filepath)
        df = xl.parse(sheet)
        df = df.fillna("")  # replace NaN / NaT with empty string

        # Filter by searchTerm if provided
        if searchTerm:
            # Check if any column contains the searchTerm (case-insensitive)
            mask = df.apply(lambda row: row.astype(str).str.lower().str.contains(searchTerm).any(), axis=1)
            df = df[mask]

        paged_df, total_rows = paginate(df, page, page_size)
        preview = paged_df.to_dict(orient="records")

        columns = df.columns.tolist()
        xl.close()

        return jsonify({
            "columns": columns,
            "preview": preview,
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_rows + page_size - 1) // page_size
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

MISSING_LABEL = "Missing"
MISSING_LIST = ["unknown", "nknown", "invalid json", "null", "none", "empty", "missing"]

@dashboard_bp.route("/get_all_columns/<file>/<sheet>", methods=["GET"])
def get_all_columns(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)
        return jsonify({"columns": df.columns.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def extract_json(value):
    # True NaN
    if pd.isna(value):
        return MISSING_LABEL

    # Empty containers / strings
    if value in ["", [], {}, "[]"]:
        return MISSING_LABEL

    # String-specific checks
    if isinstance(value, str):
        v = value.strip().lower()

        # Catch common missing/invalid indicators
        if v in MISSING_LIST:
            return MISSING_LABEL

        # Try parsing JSON
        if v.startswith("[{"):
            try:
                data = json.loads(value)
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                    # Check for multiple possible keys
                    for key in ["carrier_name", "name"]:
                        if key in data[0]:
                            return data[0][key] if data[0][key] else MISSING_LABEL
                return MISSING_LABEL
            except Exception:
                return MISSING_LABEL

    # Otherwise return the value as-is
    return value

def parse_datetime(value):
    if pd.isna(value):
        return None
    try:
        # Replace Persian/Arabic numerals with Latin digits
        value = value.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        # Try ISO parsing first
        return datetime.fromisoformat(value)
    except:
        try:
            # Fallback to generic parsing
            return pd.to_datetime(value, errors='coerce')
        except:
            return None

@dashboard_bp.route("/get_column_data/<file>/<sheet>/<column>", methods=["GET"])
def get_column_data(file, sheet, column):
    file_path = os.path.join(UPLOAD_FOLDER, file)

    if not os.path.exists(file_path):
        return {"error": "File not found"}

    try:
        df = pd.read_excel(file_path, sheet_name=sheet)

        if column not in df.columns:
            return {"error": f"Column '{column}' not found in the sheet."}

        # Normalize values
        df[column] = df[column].apply(extract_json)
        df[column] = df[column].astype(str).str.strip().str.title()  # trims and standardizes

        # Check for datetime column
        df['parsed_dates'] = df[column].apply(parse_datetime)
        if df['parsed_dates'].notna().any():
            # Group by month
            df['month'] = df['parsed_dates'].dt.to_period('M')
            frequency_series = df['month'].value_counts().sort_index()
            frequency = {str(k): int(v) for k, v in frequency_series.items()}
        else:
            # Normal categorical / string column
            frequency_series = df[column].value_counts(dropna=False)
            frequency = frequency_series.to_dict()

        # Ensure numeric values for frontend highest/lowest
        numeric_freq = {}
        for k, v in frequency.items():
            if isinstance(v, (int, float)):
                numeric_freq[k] = v
            else:
                numeric_freq[k] = int(v) if str(v).isdigit() else 0

        print(numeric_freq)
        return {"frequency": numeric_freq}

    except Exception as e:
        return {"error": str(e)}