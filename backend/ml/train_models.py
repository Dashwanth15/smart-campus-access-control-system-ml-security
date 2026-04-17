"""
Smart Campus Access Control
ML Training Script — v2
========================
Models produced:
  rf.pkl   — RandomForestClassifier (access decision: Allowed/Restricted/Blocked)
  svm.pkl  — SVC with RBF kernel    (anomaly/intrusion: 0=normal, 1=suspicious)

Features (6, no role/MAC):
  device_known, login_hour, failed_attempts,
  ip_change, browser_change, login_frequency
"""

import os, sys, json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# ── Config ───────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "smart_campus_dataset.csv")
FEATURES = [
    "device_known",
    "login_hour",
    "failed_attempts",
    "ip_change",
    "browser_change",
    "login_frequency",
]

# ── 1. Generate dataset if missing ───────────────────────────────
if not os.path.exists(CSV_PATH):
    print("📊 Dataset not found — generating…")
    import random
    random.seed(42); np.random.seed(42)
    rows = []
    for _ in range(15_000):
        dk  = random.choices([0, 1], weights=[20, 80])[0]
        lh  = random.randint(0, 23)
        fa  = random.choices(range(8), weights=[40,25,15,10,5,3,1,1])[0]
        ipc = random.choices([0, 1], weights=[75, 25])[0]
        bc  = random.choices([0, 1], weights=[80, 20])[0]
        lf  = random.randint(1, 20)
        # Label logic
        if dk == 0:                                              lbl = "Blocked"
        elif fa >= 3:                                            lbl = "Blocked"
        elif ipc and bc and fa >= 1:                             lbl = "Blocked"
        elif lh in range(1,5) and fa >= 2:                       lbl = "Blocked"
        elif fa == 2:                                            lbl = "Restricted"
        elif ipc and fa >= 1:                                    lbl = "Restricted"
        elif bc and fa >= 1:                                     lbl = "Restricted"
        elif (lh >= 22 or lh < 6) and fa >= 1:                  lbl = "Restricted"
        elif lf >= 15 and fa >= 1:                               lbl = "Restricted"
        else:                                                    lbl = "Allowed"
        rows.append([dk, lh, fa, ipc, bc, lf, lbl])
    df = pd.DataFrame(rows, columns=FEATURES + ["label"])
    df.to_csv(CSV_PATH, index=False)
    print(f"   ✅ Generated {len(df)} rows → {CSV_PATH}")

# ── 2. Load ───────────────────────────────────────────────────────
print("\n📂 Loading dataset…")
df = pd.read_csv(CSV_PATH)
print(f"   Rows: {len(df)}")
print(f"   Distribution:\n{df['label'].value_counts().to_string()}")

X = df[FEATURES].values
y = df["label"].values
y_bin = (y != "Allowed").astype(int)   # binary for SVM (0=normal, 1=suspicious)

# ── 3. Encode multi-class labels ──────────────────────────────────
enc = LabelEncoder()
y_enc = enc.fit_transform(y)
print(f"\n   Label classes: {list(enc.classes_)}")

# ── 4. Splits ─────────────────────────────────────────────────────
X_tr, X_te, y_tr, y_te   = train_test_split(X, y_enc, test_size=.2, random_state=42, stratify=y_enc)
Xi_tr,Xi_te, yi_tr,yi_te = train_test_split(X, y_bin, test_size=.2, random_state=42, stratify=y_bin)

# ── 5. Train Random Forest ────────────────────────────────────────
print("\n🌲 Training RandomForestClassifier…")
rf = RandomForestClassifier(
    n_estimators=200, max_depth=12, min_samples_split=4,
    class_weight="balanced", random_state=42, n_jobs=-1
)
rf.fit(X_tr, y_tr)
rf_acc = accuracy_score(y_te, rf.predict(X_te))
print(f"   Accuracy : {rf_acc:.4f}")
print(classification_report(y_te, rf.predict(X_te), target_names=enc.classes_))

print("   Feature importances:")
for f, v in sorted(zip(FEATURES, rf.feature_importances_), key=lambda x: -x[1]):
    print(f"     {f:<22}: {v:.4f}")

# ── 6. Train SVM ──────────────────────────────────────────────────
print("\n🔮 Training SVM (intrusion detection)…")
svm = SVC(kernel="rbf", C=5.0, gamma="scale",
          class_weight="balanced", probability=True, random_state=42)
svm.fit(Xi_tr, yi_tr)
svm_acc = accuracy_score(yi_te, svm.predict(Xi_te))
print(f"   Accuracy : {svm_acc:.4f}")
print(classification_report(yi_te, svm.predict(Xi_te), target_names=["Normal","Suspicious"]))

# ── 7. Save ───────────────────────────────────────────────────────
print("\n💾 Saving models…")

# Primary canonical names (what this script produces)
joblib.dump(rf,  os.path.join(BASE_DIR, "rf.pkl"),  compress=3)
joblib.dump(svm, os.path.join(BASE_DIR, "svm.pkl"), compress=3)
joblib.dump(enc, os.path.join(BASE_DIR, "label_encoder.pkl"))

# Also save under the names used by app.py so no code change needed
joblib.dump(rf,  os.path.join(BASE_DIR, "rf_model.pkl"),          compress=3)
joblib.dump(rf,  os.path.join(BASE_DIR, "access_model.pkl"),      compress=3)
joblib.dump(svm, os.path.join(BASE_DIR, "svm_model_v2.pkl"),      compress=3)
joblib.dump(svm, os.path.join(BASE_DIR, "svm_model.pkl"),         compress=3)
joblib.dump(enc, os.path.join(BASE_DIR, "access_encoder_v2.pkl"))
joblib.dump(enc, os.path.join(BASE_DIR, "access_encoder.pkl"))

# Metadata
meta = {
    "features":      FEATURES,
    "label_classes": list(enc.classes_),
    "rf_accuracy":   round(rf_acc,  4),
    "svm_accuracy":  round(svm_acc, 4),
    "trained_rows":  len(df),
    "trained_at":    pd.Timestamp.utcnow().isoformat(),
    "models": {
        "access_control":   "rf.pkl / rf_model.pkl",
        "intrusion_detect": "svm.pkl / svm_model_v2.pkl",
        "label_encoder":    "label_encoder.pkl / access_encoder_v2.pkl"
    }
}
with open(os.path.join(BASE_DIR, "model_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("\n✅ All done!")
print(f"   rf.pkl   accuracy  : {rf_acc:.2%}")
print(f"   svm.pkl  accuracy  : {svm_acc:.2%}")
print(f"   Saved to           : {BASE_DIR}")
