"""
Test script to verify login attempt counting and blocking behavior
"""
import requests
import json

BASE_URL = "http://localhost:5000"

def test_failed_login_attempts():
    """Test failed login attempts with a test student account"""
    
    print("=" * 60)
    print("Testing Login Attempts and Blocking System")
    print("=" * 60)
    
    # Test credentials (using wrong password)
    test_email = "student@test.com"
    wrong_password = "wrongpassword123"
    
    # Attempt login multiple times with wrong password
    for attempt in range(1, 7):
        print(f"\n--- Attempt {attempt} ---")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": test_email,
                "password": wrong_password,
                "mac_address": "AA:BB:CC:DD:EE:FF"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        data = response.json()
        
        # Check response fields
        if "remaining_attempts" in data:
            print(f"✅ Remaining attempts shown: {data['remaining_attempts']}")
        else:
            print("❌ Remaining attempts NOT shown")
        
        if "message" in data:
            print(f"📝 Message: {data['message']}")
        
        if "locked" in data and data["locked"]:
            print(f"🔒 Account is locked!")
            if data.get("permanent"):
                print(f"⛔ Permanent block detected")
            else:
                print(f"⏰ Temporary block detected")
            break
        
        if response.status_code == 403:
            print("🚫 Access blocked by ML")
            break

if __name__ == "__main__":
    print("\n🔧 Make sure:")
    print("1. Backend server is running on port 5000")
    print("2. You have a student account with email: student@test.com")
    print("3. Delete/reset this account's failed_attempts before running\n")
    
    input("Press Enter to start test...")
    test_failed_login_attempts()
