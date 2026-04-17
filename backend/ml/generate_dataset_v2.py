"""
Smart Campus – Improved Dataset Generator v2
Features: device_known, login_hour, failed_attempts,
          ip_change, browser_change, login_frequency
Label: Allowed / Restricted / Blocked
"""
import pandas as pd
import numpy as np
import random

random.seed(42)
np.random.seed(42)

N = 15_000
data = []

for _ in range(N):
    device_known    = random.choices([0, 1], weights=[20, 80])[0]
    login_hour      = random.randint(0, 23)
    failed_attempts = random.choices(range(8), weights=[40, 25, 15, 10, 5, 3, 1, 1])[0]
    ip_change       = random.choices([0, 1], weights=[75, 25])[0]
    browser_change  = random.choices([0, 1], weights=[80, 20])[0]
    login_frequency = random.randint(1, 20)

    # ── Ground-truth labelling ────────────────────────────────
    label = "Allowed"  # default

    # HARD BLOCK rules
    if device_known == 0:
        label = "Blocked"
    elif failed_attempts >= 3:
        label = "Blocked"
    elif ip_change == 1 and browser_change == 1 and failed_attempts >= 1:
        label = "Blocked"
    elif login_hour in range(1, 5) and failed_attempts >= 2:
        label = "Blocked"

    # RESTRICTED / WARNING
    elif failed_attempts == 2:
        label = "Restricted"
    elif ip_change == 1 and failed_attempts >= 1:
        label = "Restricted"
    elif browser_change == 1 and failed_attempts >= 1:
        label = "Restricted"
    elif login_hour in range(22, 24) or login_hour in range(0, 6):
        if failed_attempts >= 1:
            label = "Restricted"
    elif login_frequency >= 15 and failed_attempts >= 1:
        label = "Restricted"

    data.append([
        device_known,
        login_hour,
        failed_attempts,
        ip_change,
        browser_change,
        login_frequency,
        label
    ])

df = pd.DataFrame(data, columns=[
    "device_known",
    "login_hour",
    "failed_attempts",
    "ip_change",
    "browser_change",
    "login_frequency",
    "label"
])

df.to_csv("smart_campus_dataset.csv", index=False)

print("✅ Dataset generated: smart_campus_dataset.csv")
print(f"   Total samples : {len(df)}")
print(f"   Allowed       : {(df.label == 'Allowed').sum()}")
print(f"   Restricted    : {(df.label == 'Restricted').sum()}")
print(f"   Blocked       : {(df.label == 'Blocked').sum()}")
