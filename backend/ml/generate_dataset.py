import pandas as pd
import random

data = []

roles = ["Faculty", "Student", "Guest"]

# Generate 10,000 samples for better training
for _ in range(10000):
    role = random.choice(roles)
    mac_known = random.choice([0, 1])
    login_hour = random.randint(0, 23)
    failed_attempts = random.randint(0, 7)  # Extended to 7 for permanent block cases
    login_frequency = random.randint(1, 10)

    # Enhanced ground-truth labeling for ML to learn
    access = "Allowed"  # Default
    
    # BLOCKING CONDITIONS (ML will learn these patterns)
    
    # 1. Unknown MAC address -> Always block
    if mac_known == 0:
        access = "Blocked"
    
    # 2. Failed attempts >= 3 with known MAC -> Temporary block (8 hours)
    elif failed_attempts >= 3:
        access = "Blocked"
    
    # 3. Guest at odd hours (0-5 AM) with any failed attempts -> Block
    elif role == "Guest" and login_hour < 6 and failed_attempts > 0:
        access = "Blocked"
    
    # 4. Any user at very odd hours (2-4 AM) with failed attempts -> Block
    elif 2 <= login_hour <= 4 and failed_attempts >= 2:
        access = "Blocked"
    
    # RESTRICTED CONDITIONS (Warning states)
    
    # 5. Exactly 2 failed attempts with known MAC -> Restricted (warning)
    elif failed_attempts == 2 and mac_known == 1:
        access = "Restricted"
    
    # 6. Late night access for Student/Faculty (22-6) -> Restricted
    elif role in ["Student", "Faculty"] and (login_hour >= 22 or login_hour < 6) and failed_attempts == 0:
        access = "Restricted"
    
    # 7. Guest during business hours with 1 failed attempt -> Restricted
    elif role == "Guest" and 9 <= login_hour <= 17 and failed_attempts == 1:
        access = "Restricted"
    
    # ALLOWED CONDITIONS
    # All other cases remain "Allowed"

    data.append([
        mac_known,
        role,
        login_hour,
        failed_attempts,
        login_frequency,
        access
    ])

df = pd.DataFrame(data, columns=[
    "mac_known",
    "role",
    "login_hour",
    "failed_attempts",
    "login_frequency",
    "access_decision"
])

df.to_csv("synthetic_login_data.csv", index=False)
print("✅ Enhanced synthetic dataset generated with 10,000 samples")
print(f"   Total samples: {len(df)}")
print(f"   Allowed: {len(df[df['access_decision'] == 'Allowed'])}")
print(f"   Blocked: {len(df[df['access_decision'] == 'Blocked'])}")
print(f"   Restricted: {len(df[df['access_decision'] == 'Restricted'])}")
