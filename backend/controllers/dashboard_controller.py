import os
import pandas as pd
import json 
from datetime import datetime
from flask import Blueprint, request, jsonify
import traceback
import plotly.graph_objects as go

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
        # Get pagination and optional search
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("page_size", 50))
        search_term = request.args.get("search", "").lower()

        xl = pd.ExcelFile(filepath)
        df = xl.parse(sheet)
        xl.close()

        # Replace NaN / NaT with empty string and convert everything to string
        df = df.fillna("").applymap(lambda x: str(x))

        # Apply search if provided
        if search_term:
            mask = df.apply(lambda row: row.str.lower().str.contains(search_term).any(), axis=1)
            df = df[mask]

        # Pagination
        paged_df, total_rows = paginate(df, page, page_size)
        preview = paged_df.to_dict(orient="records")
        columns = df.columns.tolist()

        return jsonify({
            "columns": columns,
            "preview": preview,
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_rows + page_size - 1) // page_size
        })

    except Exception as e:
        traceback.print_exc()
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
        traceback.print_exc()
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

@dashboard_bp.route("/get_column_frequency/<file>/<sheet>/<column>", methods=["GET"])
def get_column_frequency(file, sheet, column):
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
        traceback.print_exc()
        return {"error": str(e)}
    
@dashboard_bp.route("/get_correlation_heatmap/<file>/<sheet>", methods=["GET"])
def get_correlation_heatmap(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)

        for date_col in ['active_date', 'last_boot_date', 'interval_date']:
            if date_col in df.columns:
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

        if 'last_boot_date' in df.columns and 'active_date' in df.columns:
            df['last boot - active'] = (df['last_boot_date'] - df['active_date']).dt.total_seconds() / (3600*24)
        if 'last_boot_date' in df.columns and 'interval_date' in df.columns:
            df['last boot - interval'] = (df['last_boot_date'] - df['interval_date']).dt.total_seconds() / (3600*24)

        # Keep only numeric columns for correlation
        numeric_df = df.select_dtypes(include=["number"])

        if numeric_df.empty:
            return jsonify({"message": "No numeric columns to calculate correlation"}), 200

        # Compute correlation matrix
        corr_df = numeric_df.corr().round(3)

        # Create Plotly heatmap
        fig = go.Figure(
            data=go.Heatmap(
                z=corr_df.values,
                x=corr_df.columns,
                y=corr_df.columns,
                colorscale='RdBu',
                zmin=-1,
                zmax=1,
                colorbar=dict(title="Correlation")
            )
        )

        fig.update_layout(
            xaxis_title="Columns",
            yaxis_title="Columns",
            autosize=True,
            margin=dict(l=100, r=100, t=100, b=100)
        )

        # Convert figure to JSON
        fig_json = fig.to_json()

        return jsonify({"plotly_json": json.loads(fig_json)}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/get_distribution_vs_churn/<file>/<sheet>/<column>", methods=["GET"])
def get_distribution_vs_churn(file, sheet, column):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)

        # Detect churn column
        churn_cols = ['Chrn Flag', 'Churn', 'Churn Flag']
        target = next((c for c in churn_cols if c in df.columns), None)
        if target is None:
            return jsonify({"message": "No churn column found"}), 200

        # Convert churn to numeric
        df[target] = pd.to_numeric(df[target], errors="coerce").fillna(0).astype(int)

        if column not in df.columns:
            return jsonify({"error": f"Column '{column}' not found"}), 404

        # Numeric column -> boxplot
        if pd.api.types.is_numeric_dtype(df[column]):
            fig = go.Figure()
            for val in sorted(df[target].unique()):
                fig.add_trace(
                    go.Box(
                        y=df[df[target] == val][column],
                        name=f"{column} (Churn={val})",
                        boxmean='sd'
                    )
                )
            fig.update_layout(title=f"{column} vs Churn", yaxis_title=column, xaxis_title="Churn")

        # Categorical column -> stacked bar
        else:
            counts = df.groupby([column, target]).size().unstack(fill_value=0)
            fig = go.Figure()
            for churn_val in counts.columns:
                fig.add_trace(
                    go.Bar(
                        x=counts.index.astype(str),
                        y=counts[churn_val],
                        name=f"Churn={churn_val}"
                    )
                )
            fig.update_layout(
                barmode='stack',
                title=f"{column} vs Churn",
                xaxis_title=column,
                yaxis_title="Count"
            )

        return jsonify({"column": column, "plotly_json": json.loads(fig.to_json())}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
