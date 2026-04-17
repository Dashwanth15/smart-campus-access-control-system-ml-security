import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
import joblib

# Load dataset
df = pd.read_csv("synthetic_login_data.csv")

# Intrusion label
# 1 = Suspicious, 0 = Normal
df["intrusion"] = df.apply(
    lambda row: 1 if row["mac_known"] == 0 or row["failed_attempts"] >= 3 else 0,
    axis=1
)

# Encode role
role_encoder = LabelEncoder()
df["role"] = role_encoder.fit_transform(df["role"])

X = df[[
    "mac_known",
    "role",
    "login_hour",
    "failed_attempts",
    "login_frequency"
]]

y = df["intrusion"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train SVM with linear kernel (faster than RBF for large datasets)
svm_model = SVC(kernel="linear", probability=True)
svm_model.fit(X_train, y_train)

# Save model
joblib.dump(svm_model, "svm_model.pkl")

print("✅ SVM intrusion detection model trained and saved")
