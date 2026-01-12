import os
from flask import Blueprint, request, jsonify, send_file, Response
import tempfile
import joblib
import pandas as pd

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
predictions_bp = Blueprint("predictions", __name__)

# Load model and preprocessor
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # folder where this file is
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "churn_model_xgb.joblib")
PREPROCESSOR_PATH = os.path.join(BASE_DIR, "..", "models", "preprocessor.joblib")

xgb_model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)

target = 'Churn'

def preprocess_sheet(df):
    df = df.copy()

    churn_cols = ['Chrn Flag', 'Churn', 'Churn Flag']
    for col in churn_cols:
        if col in df.columns:
            df[target] = df[col]
            break
    for col in churn_cols:
        if col in df.columns and col != target:
            df.drop(columns=col, inplace=True)

    for date_col in ['active_date', 'last_boot_date', 'interval_date']:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

    df['last boot - active'] = ((df['last_boot_date'] - df['active_date']).dt.total_seconds() / (3600*24)
                                if 'last_boot_date' in df.columns and 'active_date' in df.columns else 0)
    df['last boot - interval'] = ((df['last_boot_date'] - df['interval_date']).dt.total_seconds() / (3600*24)
                                  if 'interval_date' in df.columns and 'last_boot_date' in df.columns else 0)

    df['last boot - active'] = df['last boot - active'].fillna(0)
    df['last boot - interval'] = df['last boot - interval'].fillna(0)

    # Ensure the relevant columns are in the dataframe
    relevant_columns = ['last boot - active', 'last boot - interval']
    missing_columns = [col for col in relevant_columns if col not in df.columns]
    if missing_columns:
        print(f"Warning: Missing columns: {', '.join(missing_columns)}")
        raise KeyError(f"Required columns missing: {', '.join(missing_columns)}")

    # Keep only the relevant columns (exclude 'Churn' from features for prediction)
    df = df[relevant_columns]

    if target in df.columns:
        df[target] = df[target].fillna(0)

    return df

def predict_df(df, df_orig):
    # Transform and predict using core_features
    X_transformed = preprocessor.transform(df)

    y_proba = xgb_model.predict_proba(X_transformed)[:, 1]
    y_label = (y_proba >= 0.5).astype(int)

    # Copy original sheet as-is
    response = df_orig.copy()

    # Add prediction columns
    response["Churn Prediction Probability"] = y_proba
    response["Churn Prediction"] = y_label

    # Replace all NaN/NaT with empty string
    response = response.fillna("").astype(str)

    return response

def paginate(df, page, page_size):
    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    return df.iloc[start:end], total

@predictions_bp.route("/predict_churn/<file>/<sheet>", methods=["GET"])
def get_predictions(file, sheet):
    print("Predicting...")
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))
    search_term = request.args.get("search", "").lower()

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)
        df_orig = df.copy()
        df = preprocess_sheet(df)
        response_df = predict_df(df, df_orig)

        if search_term:
            mask = response_df.apply(lambda row: row.astype(str).str.contains(search_term, case=False).any(), axis=1)
            response_df = response_df[mask]

        paged_df, total = paginate(response_df, page, page_size)
        total_pages = (total + page_size - 1) // page_size

        return jsonify({
            "preview": paged_df.to_dict(orient="records"),
            "columns": list(response_df.columns),
            "total_pages": total_pages
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@predictions_bp.route("/download_predictions/<file>/<sheet>", methods=["GET"])
def download_predictions(file, sheet):
    print("Downloading full predictions...")
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        # Load the Excel file
        df = pd.read_excel(filepath, sheet_name=sheet)
        df_orig = df.copy()
        df = preprocess_sheet(df)  # Preprocess the data
        response_df = predict_df(df, df_orig)  # Generate predictions
        
        # Create a temporary file to store the Excel output
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp_file:
            output_path = tmp_file.name
            response_df.to_excel(output_path, index=False)
            tmp_file.close()  # Close the file explicitly

        # Send the generated file to the client
        return send_file(output_path, 
                         as_attachment=True, 
                         download_name="predictions.xlsx", 
                         mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@predictions_bp.route("/predictions_stats/<file>/<sheet>", methods=["GET"])
def predictions_stats(file, sheet):
    filepath = os.path.join(UPLOAD_FOLDER, file)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404

    try:
        df = pd.read_excel(filepath, sheet_name=sheet)
        df_orig = df.copy()
        df = preprocess_sheet(df)
        response_df = predict_df(df, df_orig)

        # Compute statistics
        total = len(response_df)
        churn_count = (response_df["Churn Prediction"] == "1").sum()
        non_churn_count = total - churn_count
        avg_prob = response_df["Churn Prediction Probability"].astype(float).mean()

        stats = {
            "total_rows": total,
            "churn_count": int(churn_count),
            "non_churn_count": int(non_churn_count),
            "average_probability": float(avg_prob)
        }

        return jsonify(stats), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
