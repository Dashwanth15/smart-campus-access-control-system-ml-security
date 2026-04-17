"""
Smart Campus – ML Training Script v2
Trains:
  1. Random Forest  → access decision  (Allowed / Restricted / Blocked)
  2. SVM            → anomaly/intrusion detection (0 = normal, 1 = suspicious)
Saves all artefacts to the same directory as this script.
"""

import os, sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# ── Paths ────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
CSV  = os.path.join(BASE, "smart_campus_dataset.csv")

# ── 1. Generate dataset if missing ───────────────────────────────
if not os.path.exists(CSV):
    print("⚠️  Dataset not found – generating...")
    import subprocess
    subprocess.run([sys.executable, os.path.join(BASE, "generate_dataset_v2.py")], check=True)

# ── 2. Load dataset ──────────────────────────────────────────────
print("\n📂 Loading dataset...")
df = pd.read_csv(CSV)
print(f"   Rows   : {len(df)}")
print(f"   Columns: {list(df.columns)}")

FEATURES = ["device_known", "login_hour", "failed_attempts",
            "ip_change", "browser_change", "login_frequency"]

X = df[FEATURES].values
y = df["label"].values          # Allowed / Restricted / Blocked

# Create binary intrusion label: 1 if Blocked or Restricted, 0 otherwise
y_intrusion = (df["label"] != "Allowed").astype(int).values

# ── 3. Encode access label ───────────────────────────────────────
access_enc = LabelEncoder()
y_encoded  = access_enc.fit_transform(y)
print(f"\n   Label classes    : {list(access_enc.classes_)}")

# ── 4. Train / test split ────────────────────────────────────────
X_tr, X_te, y_tr, y_te = train_test_split(X, y_encoded,  test_size=0.2, random_state=42, stratify=y_encoded)
Xi_tr,Xi_te, yi_tr,yi_te = train_test_split(X, y_intrusion, test_size=0.2, random_state=42, stratify=y_intrusion)

# ── 5. Random Forest (access control) ───────────────────────────
print("\n🌲 Training Random Forest (access control)...")
rf = RandomForestClassifier(
    n_estimators=200,
    max_depth=12,
    min_samples_split=4,
    class_weight="balanced",
    random_state=42,
    n_jobs=-1
)
rf.fit(X_tr, y_tr)

rf_preds = rf.predict(X_te)
rf_acc   = accuracy_score(y_te, rf_preds)
print(f"   Accuracy : {rf_acc:.4f}")
print(classification_report(y_te, rf_preds, target_names=access_enc.classes_))

# Feature importance
feat_imp = dict(zip(FEATURES, rf.feature_importances_))
print("   Feature importances:")
for f, v in sorted(feat_imp.items(), key=lambda x: -x[1]):
    print(f"     {f:<20}: {v:.4f}")

# ── 6. SVM (anomaly / intrusion detection) ──────────────────────
print("\n🔮 Training SVM (intrusion detection)...")
svm = SVC(
    kernel="rbf",
    C=5.0,
    gamma="scale",
    class_weight="balanced",
    probability=True,
    random_state=42
)
svm.fit(Xi_tr, yi_tr)

svm_preds = svm.predict(Xi_te)
svm_acc   = accuracy_score(yi_te, svm_preds)
print(f"   Accuracy : {svm_acc:.4f}")
print(classification_report(yi_te, svm_preds, target_names=["Normal", "Suspicious"]))

# ── 7. Save models ───────────────────────────────────────────────
print("\n💾 Saving models...")

joblib.dump(rf,         os.path.join(BASE, "rf_model.pkl"),      compress=3)
joblib.dump(svm,        os.path.join(BASE, "svm_model_v2.pkl"),  compress=3)
joblib.dump(access_enc, os.path.join(BASE, "access_encoder_v2.pkl"))

# Also overwrite the legacy filenames so app.py keeps working
# without immediate code changes if desired
joblib.dump(rf,         os.path.join(BASE, "access_model.pkl"),  compress=3)
joblib.dump(access_enc, os.path.join(BASE, "access_encoder.pkl"))
joblib.dump(svm,        os.path.join(BASE, "svm_model.pkl"),     compress=3)

print("   ✅ rf_model.pkl          (Random Forest – access)")
print("   ✅ svm_model_v2.pkl      (SVM – intrusion)")
print("   ✅ access_encoder_v2.pkl (label encoder)")
print("   ✅ Legacy .pkl names also updated")

# ── 8. Save feature list for backend reference ───────────────────
import json
meta = {
    "features":       FEATURES,
    "label_classes":  list(access_enc.classes_),
    "rf_accuracy":    round(rf_acc,  4),
    "svm_accuracy":   round(svm_acc, 4),
    "trained_at":     pd.Timestamp.utcnow().isoformat()
}
with open(os.path.join(BASE, "model_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("\n✅ Training complete!")
print(f"   RF  accuracy : {rf_acc:.2%}")
print(f"   SVM accuracy : {svm_acc:.2%}")
