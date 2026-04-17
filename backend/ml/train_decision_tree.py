import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# Load dataset
df = pd.read_csv("synthetic_login_data.csv")

# Encode categorical columns
role_encoder = LabelEncoder()
access_encoder = LabelEncoder()

df["role"] = role_encoder.fit_transform(df["role"])
df["access_decision"] = access_encoder.fit_transform(df["access_decision"])

X = df.drop("access_decision", axis=1)
y = df["access_decision"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train Decision Tree
model = DecisionTreeClassifier(max_depth=5)
model.fit(X_train, y_train)

# Save model and encoders
joblib.dump(model, "access_model.pkl")
joblib.dump(role_encoder, "role_encoder.pkl")
joblib.dump(access_encoder, "access_encoder.pkl")

print("✅ Decision Tree model trained and saved successfully")
