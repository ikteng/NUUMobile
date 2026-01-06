import os
import pandas as pd
import numpy as np
from sklearn.metrics import confusion_matrix
from river import preprocessing, linear_model, metrics
import joblib

# ------------------------------
# Target column
# ------------------------------
target = 'Churn'

# ------------------------------
# Preprocess sheet function
# ------------------------------
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

    if 'sim_info' in df.columns:
        df['sim_info'] = df['sim_info'].apply(lambda x: 'inserted' if x != 'uninserted' else 'uninserted')
    else:
        df['sim_info'] = 'uninserted'
    df['sim_info'] = df['sim_info'].astype(str)

    for col in df.select_dtypes(include=np.number).columns:
        df[col] = df[col].fillna(0)

    df[target] = df[target].fillna(0).astype(int)

    for col in df.select_dtypes(include='object').columns:
        df[col] = df[col].astype(str)

    return df

# ------------------------------
# Load sheets
# ------------------------------
uw_path = "backend/userfiles/UW_Churn_Pred_Data.xls"
sheets_with_churn = ["N10", "B30 Pro"]
dfs = {s: preprocess_sheet(pd.read_excel(uw_path, sheet_name=s)) for s in sheets_with_churn}
train_df = pd.concat(dfs.values(), ignore_index=True)

# ------------------------------
# Features
# ------------------------------
numeric_features = train_df.select_dtypes(include=np.number).columns.tolist()
categorical_features = train_df.select_dtypes(include='object').columns.tolist()
if target in numeric_features: numeric_features.remove(target)
if target in categorical_features: categorical_features.remove(target)

# ------------------------------
# River preprocessing
# ------------------------------
numeric_pipeline = preprocessing.StandardScaler()
categorical_pipeline = preprocessing.OneHotEncoder()

def preprocess_row(row):
    row_dict = row.to_dict()
    x_num = {k: row_dict[k] for k in numeric_features if k in row_dict}
    x_cat = {k: row_dict[k] for k in categorical_features if k in row_dict}
    x_num = numeric_pipeline.transform_one(x_num)
    x_cat = categorical_pipeline.transform_one(x_cat)
    return {**x_num, **x_cat}

# ------------------------------
# River model
# ------------------------------
model = linear_model.LogisticRegression()
metric = metrics.Accuracy()

for _, row in train_df.iterrows():
    x = preprocess_row(row)
    y = row[target]
    y_pred = model.predict_one(x)
    if y_pred is not None:
        metric.update(y, y_pred)
    model.learn_one(x, y)

print(f"Initial training accuracy: {metric.get():.4f}")

# ------------------------------
# Optional: incremental update on future sheet
# ------------------------------
df_future = preprocess_sheet(pd.read_excel(uw_path, sheet_name='Data Before Feb 13'))
metric_future = metrics.Accuracy()

for _, row in df_future.iterrows():
    x = preprocess_row(row)
    y = row[target]
    y_pred = model.predict_one(x)
    if y_pred is not None:
        metric_future.update(y, y_pred)
    model.learn_one(x, y)

print(f"Accuracy on df_future after incremental updates: {metric_future.get():.4f}")

# ------------------------------
# Save model & preprocessors
# ------------------------------
model_dir = os.path.join(os.getcwd(), "backend", "models")
os.makedirs(model_dir, exist_ok=True)

joblib.dump(model, os.path.join(model_dir, "churn_model_river.joblib"))
joblib.dump(numeric_pipeline, os.path.join(model_dir, "numeric_pipeline_river.joblib"))
joblib.dump(categorical_pipeline, os.path.join(model_dir, "categorical_pipeline_river.joblib"))

print("Model and preprocessors saved!")
