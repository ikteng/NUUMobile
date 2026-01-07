import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from imblearn.over_sampling import SMOTE
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import xgboost as xgb
import joblib

# Load the Excel file
filepath = "backend/userfiles/UW_Churn_Pred_Data.xls"
xls = pd.ExcelFile(filepath)

# List of churn-related columns we want to unify
churn_cols = ['Chrn Flag', 'Churn', 'Churn Flag']

# Load all sheets into a dictionary of dataframes
dfs = {s: pd.read_excel(xls, sheet_name=s) for s in xls.sheet_names}

# Loop through each sheet and clean the churn column
for name, df in dfs.items():
    # Find the churn column and standardize the name
    for col in churn_cols:
        if col in df.columns:
            df['Churn'] = df[col]  # unify churn column
            break
    # Drop the original churn-like columns after renaming
    for col in churn_cols:
        if col in df.columns and col != 'Churn':
            df.drop(columns=col, inplace=True)

# Focus on the "B30 Pro" sheet for training the model
df_b30 = dfs["B30 Pro"]

# Filter out rows where Churn is missing
df_b30_filtered = df_b30.dropna(subset=['Churn'])

# Focus only on 'last boot - active' and 'last boot - interval' columns for features
X = df_b30_filtered[['last boot - active', 'last boot - interval']]
y = df_b30_filtered['Churn']

# Split the dataset into training and testing sets (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Handle class imbalance using SMOTE (Synthetic Minority Over-sampling Technique)
smote = SMOTE(random_state=42)
X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)

# Scale the numerical features (StandardScaler)
scaler = StandardScaler()
X_train_resampled_scaled = scaler.fit_transform(X_train_resampled)
X_test_scaled = scaler.transform(X_test)

# Initialize the XGBoost Classifier
xgb_model = xgb.XGBClassifier(
    scale_pos_weight=5,  # Adjust this for class imbalance
    random_state=42,
    eval_metric='logloss'  # Avoid warning related to XGBoost 1.3+
)

# Train the XGBoost model
xgb_model.fit(X_train_resampled_scaled, y_train_resampled)

# Predict
y_pred = xgb_model.predict(X_test_scaled)
y_pred_proba = xgb_model.predict_proba(X_test_scaled)[:, 1]

# Print the classification report and confusion matrix
print("Classification Report:")
print(classification_report(y_test, y_pred))

print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Calculate and print the AUC-ROC score
print("AUC-ROC Score:", roc_auc_score(y_test, y_pred_proba))

# Save the model
joblib.dump(xgb_model, './backend/models/churn_model_xgb.joblib')

# Save the preprocessor (scaler)
joblib.dump(scaler, './backend/models/preprocessor.joblib')

# # Focus on the "N10" sheet for prediction
# df_n10 = dfs["N10"]

# # Filter out rows where Churn is missing in the N10 sheet (for evaluation purposes)
# df_n10_filtered = df_n10.dropna(subset=['Churn'])

# # Focus on 'last boot - active' and 'last boot - interval' columns for features in N10
# X_n10 = df_n10_filtered[['last boot - active', 'last boot - interval']]
# y_n10 = df_n10_filtered['Churn']

# # Scale the features for prediction
# X_n10_scaled = scaler.transform(X_n10)

# # Predict churn using the trained XGBoost model
# y_pred_n10 = xgb_model.predict(X_n10_scaled)
# y_pred_proba_n10 = xgb_model.predict_proba(X_n10_scaled)[:, 1]

# # Print the classification report and confusion matrix for N10 sheet
# print("Classification Report (N10 Sheet):")
# print(classification_report(y_n10, y_pred_n10))

# print("Confusion Matrix (N10 Sheet):")
# print(confusion_matrix(y_n10, y_pred_n10))

# # Calculate and print the AUC-ROC score for the N10 predictions
# print("AUC-ROC Score (N10 Sheet):", roc_auc_score(y_n10, y_pred_proba_n10))

# # Compare the predicted churn vs. actual churn for rows with known churn
# comparison = pd.DataFrame({'Actual Churn': y_n10, 'Predicted Churn': y_pred_n10})
# print("\nComparison of Actual vs Predicted Churn (N10 Sheet):")
# print(comparison)