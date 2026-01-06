import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import confusion_matrix
import xgboost as xgb
import joblib

# ------------------------------
# Core features & target
# ------------------------------
core_features = [
    'register_email', 'sim_info', 'last boot - active', 'last boot - interval', 
]
target = 'Churn'

# ------------------------------
# Preprocess sheet function
# ------------------------------
def preprocess_sheet(df):
    df = df.copy()

    # 1. Unify churn column
    churn_cols = ['Chrn Flag', 'Churn', 'Churn Flag']
    for col in churn_cols:
        if col in df.columns:
            df[target] = df[col]
            break
    for col in churn_cols:
        if col in df.columns and col != target:
            df.drop(columns=col, inplace=True)

    # 2. Datetime columns
    for date_col in ['active_date', 'last_boot_date', 'interval_date']:
        if date_col in df.columns:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')

    # 3. Derived features
    df['last boot - active'] = ((df['last_boot_date'] - df['active_date']).dt.total_seconds() / (3600*24)
                                if 'last_boot_date' in df.columns and 'active_date' in df.columns else 0)
    df['last boot - interval'] = ((df['last_boot_date'] - df['interval_date']).dt.total_seconds() / (3600*24)
                                  if 'interval_date' in df.columns and 'last_boot_date' in df.columns else 0)

    # 4. Handle sim_info
    df['sim_info'] = df['sim_info'].apply(lambda x: 'inserted' if x != 'uninserted' else 'uninserted')
    df['sim_info'] = df['sim_info'].astype(str)

    # 5. Fill missing numeric values
    df['last boot - active'] = df['last boot - active'].fillna(0)
    df['last boot - interval'] = df['last boot - interval'].fillna(0)
    df['register_email'] = df['register_email'].fillna(0)

    # 6. Fill missing churn as 0
    df[target] = df[target].fillna(0)

    return df

# ------------------------------
# Load initial sheets
# ------------------------------
uw_path = "backend/userfiles/UW_Churn_Pred_Data.xls"
sheets_with_churn = ["N10", "B30 Pro"]
dfs = {s: preprocess_sheet(pd.read_excel(uw_path, sheet_name=s)) for s in sheets_with_churn}

# Combine for initial training
train_df = pd.concat(dfs.values(), ignore_index=True)
X_train = train_df[core_features].copy()
y_train = train_df[target].astype(int)

# ------------------------------
# Preprocessing pipeline
# ------------------------------
numeric_features = ['last boot - active', 'last boot - interval', 'register_email']
categorical_features = ['sim_info']

preprocessor = ColumnTransformer(transformers=[
    ('num', StandardScaler(), numeric_features),
    ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), categorical_features)
])

# Transform training data
X_train_transformed = preprocessor.fit_transform(X_train)

# ------------------------------
# Compute class weights
# ------------------------------
classes = np.array([0, 1])
class_weights = compute_class_weight('balanced', classes=classes, y=y_train)
weight_dict = dict(zip(classes, class_weights))
sample_weight = y_train.map(weight_dict)

# ------------------------------
# Initialize XGBoost classifier
# ------------------------------
xgb_model = xgb.XGBClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=4,
    eval_metric='logloss',
    random_state=42
)

# Initial training
xgb_model.fit(X_train_transformed, y_train, sample_weight=sample_weight)

# ------------------------------
# Memory buffer for continual learning
# ------------------------------
memory_buffer_size = 500
buffer_df = train_df.sample(memory_buffer_size, random_state=42)
buffer_X = buffer_df[core_features].copy()
buffer_y = buffer_df[target].astype(int)

# ------------------------------
# Incremental update function
# ------------------------------
def incremental_update_xgb(model, df_new, buffer_X, buffer_y, buffer_size=200):
    df_new = preprocess_sheet(df_new)
    X_new = df_new[core_features].copy()
    y_new = df_new[target].astype(int)

    # Limit new data to buffer size
    if len(X_new) > buffer_size:
        X_new = X_new.sample(buffer_size, random_state=42)
        y_new = y_new.loc[X_new.index]

    # Combine with buffer
    X_update = pd.concat([buffer_X, X_new], ignore_index=True)
    y_update = pd.concat([buffer_y, y_new], ignore_index=True)

    # Transform features
    X_transformed = preprocessor.transform(X_update)

    # Class weights
    weight_update = y_update.map(weight_dict)

    # Incremental XGBoost: fit new trees on buffer+new
    model.fit(X_transformed, y_update, sample_weight=weight_update, xgb_model=model.get_booster())

    # Update buffer
    combined_df = pd.concat([buffer_X.assign(_y=buffer_y), X_new.assign(_y=y_new)], ignore_index=True)
    buffer_sample = combined_df.sample(buffer_size, random_state=42)
    buffer_X[:] = buffer_sample[core_features].astype(buffer_X.dtypes.to_dict())
    buffer_y[:] = buffer_sample['_y'].astype(buffer_y.dtype)

    return model, buffer_X, buffer_y

# ------------------------------
# Predict function
# ------------------------------
def predict_churn_xgb(model, df):
    df = preprocess_sheet(df)
    X = df[core_features]
    X_transformed = preprocessor.transform(X)
    y_pred_proba = model.predict_proba(X_transformed)[:, 1]
    return y_pred_proba

# ------------------------------
# Predict on original sheets
# ------------------------------
for sheet_name, df in dfs.items():
    print(f"\n--- Predictions for sheet: {sheet_name} ---")
    
    X_sheet = df[core_features]
    y_sheet = df[target].astype(int)
    
    X_transformed = preprocessor.transform(X_sheet)
    y_pred_proba = xgb_model.predict_proba(X_transformed)[:, 1]
    y_pred_label = (y_pred_proba >= 0.5).astype(int)
    
    accuracy = (y_pred_label == y_sheet).mean()
    cm = confusion_matrix(y_sheet, y_pred_label)
    
    comparison_df = df[core_features].copy()
    comparison_df['Churn_actual'] = y_sheet
    comparison_df['Churn_pred'] = y_pred_label
    comparison_df['Churn_pred_proba'] = y_pred_proba
    
    print(f"Accuracy: {accuracy:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("Sample predictions:")
    print(comparison_df.head())

# ------------------------------
# Load future sheet for prediction
# ------------------------------
df_future = preprocess_sheet(pd.read_excel(uw_path, sheet_name='Data Before Feb 13'))

# ------------------------------
# Continual learning on df_future in batches
# ------------------------------
batch_size = 200
num_rows = len(df_future)

for start in range(0, num_rows, batch_size):
    end = start + batch_size
    df_batch = df_future.iloc[start:end]
    
    # Predict before update
    y_batch_actual = df_batch[target].astype(int)
    y_batch_proba = predict_churn_xgb(xgb_model, df_batch)
    y_batch_pred = (y_batch_proba >= 0.5).astype(int)
    
    batch_accuracy = (y_batch_pred == y_batch_actual).mean()
    batch_cm = confusion_matrix(y_batch_actual, y_batch_pred)
    
    print(f"\n--- Batch {start} to {end} ---")
    print(f"Prediction accuracy before update: {batch_accuracy:.4f}")
    print("Confusion Matrix:")
    print(batch_cm)
    
    # Incrementally update model
    xgb_model, buffer_X, buffer_y = incremental_update_xgb(
        xgb_model, df_batch, buffer_X, buffer_y, buffer_size=memory_buffer_size
    )
    
    # Predict after update
    y_batch_proba_post = predict_churn_xgb(xgb_model, df_batch)
    y_batch_pred_post = (y_batch_proba_post >= 0.5).astype(int)
    batch_accuracy_post = (y_batch_pred_post == y_batch_actual).mean()
    
    print(f"Prediction accuracy after update: {batch_accuracy_post:.4f}")

# ------------------------------
# Final prediction on full df_future
# ------------------------------
y_pred_proba = predict_churn_xgb(xgb_model, df_future)
y_pred_label = (y_pred_proba >= 0.5).astype(int)
y_actual = df_future[target].astype(int)

comparison_df = df_future[core_features].copy()
comparison_df['Churn_actual'] = y_actual
comparison_df['Churn_pred'] = y_pred_label
comparison_df['Churn_pred_proba'] = y_pred_proba

accuracy = (y_pred_label == y_actual).mean()
cm = confusion_matrix(y_actual, y_pred_label)

print(f"\nFinal prediction accuracy on df_future: {accuracy:.4f}")
print("Confusion Matrix:")
print(cm)
print("Sample predictions:")
print(comparison_df.head())

# ------------------------------
# Re-check predictions on original sheets after continual learning
# ------------------------------
for sheet_name, df in dfs.items():
    print(f"\n--- Post-update Predictions for sheet: {sheet_name} ---")
    
    X_sheet = df[core_features]
    y_sheet = df[target].astype(int)
    
    X_transformed = preprocessor.transform(X_sheet)
    y_pred_proba = xgb_model.predict_proba(X_transformed)[:, 1]
    y_pred_label = (y_pred_proba >= 0.5).astype(int)
    
    accuracy = (y_pred_label == y_sheet).mean()
    cm = confusion_matrix(y_sheet, y_pred_label)
    
    comparison_df = df[core_features].copy()
    comparison_df['Churn_actual'] = y_sheet
    comparison_df['Churn_pred'] = y_pred_label
    comparison_df['Churn_pred_proba'] = y_pred_proba
    
    print(f"Accuracy after update: {accuracy:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("Sample predictions:")
    print(comparison_df.head())

# Save trained model
joblib.dump(xgb_model, "./backend/models/churn_model_xgb.joblib")

# Save preprocessor
joblib.dump(preprocessor, "./backend/models/preprocessor.joblib")
