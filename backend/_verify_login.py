import json
import urllib.request
import time
from database import get_database

print("--- Starting Verification ---")
try:
    db = get_database()

    # Reset Admin
    admin_email = "admin@gmail.com"
    db.users.update_one(
        {"email": admin_email},
        {"$set": {
            "role": "Admin",
            "is_blocked": False,
            "failed_attempts": 0,
            "lockout_until": None
        }}
    )
    print(f"Reset {admin_email}")

    # Reset Student1
    student = db.users.find_one({"email": {"$regex": "student1", "$options": "i"}})
    if student:
        db.users.update_one(
            {"_id": student["_id"]},
            {"$set": {
                "is_blocked": False,
                "failed_attempts": 0,
                "lockout_until": None
            }}
        )
        print(f"Reset {student['email']}")
    else:
        print("Student1 not found")
        
    # Wait a moment for DB propagation 
    time.sleep(1)

    # Test Login
    url = "http://localhost:5000/api/auth/login"
    payload = json.dumps({"email": admin_email, "password": "admin@127"}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})

    print(f"Testing Login for {admin_email}...")
    try:
        with urllib.request.urlopen(req) as response:
            print(f"Status: {response.getcode()}")
            data = json.load(response)
            print("Success!")
            print(f"Token: {'Yes' if data.get('token') else 'No'}")
    except urllib.error.HTTPError as e:
        print(f"Failed Status: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"Request Error: {e}")

except Exception as e:
    print(f"Script Error: {e}")
