"""
Simple test to verify backend is responding correctly
"""
import requests
import json
import time

BASE_URL = "http://localhost:5000"

print("=" * 70)
print("TESTING BACKEND API - DIRECT CONNECTION")
print("=" * 70)

# Test 1: Check if backend is alive
print("\n1. Testing if backend is running...")
try:
    response = requests.get(f"{BASE_URL}/", timeout=5)
    print(f"✅ Backend is running! Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"❌ Cannot connect to backend: {e}")
    exit(1)

# Test 2: Create test account
print("\n2. Creating test account...")
signup_data = {
    "name": "Quick Test",
    "email": "quicktest@example.com",
    "password": "Test123",
    "role": "Student"
}

try:
    response = requests.post(f"{BASE_URL}/api/auth/signup", json=signup_data, timeout=5)
    if response.status_code in [201, 409]:  # 201 = created, 409 = already exists
        print(f"✅ Account ready (Status: {response.status_code})")
    else:
        print(f"Response: {response.json()}")
except Exception as e:
    print(f"⚠️  Signup issue: {e}")

# Test 3: Wrong password login (Attempt 1)
print("\n3. Testing failed login (WRONG password) - Attempt 1")
print("-" * 70)

login_data = {
    "email": "quicktest@example.com",
    "password": "WRONGPASSWORD",
    "mac_address": "AA:BB:CC:DD:EE:FF"
}

try:
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data, timeout=5)
    print(f"Status Code: {response.status_code}")
    
    data = response.json()
    print(f"\nResponse JSON:")
    print(json.dumps(data, indent=2))
    
    print("\n" + "=" * 70)
    print("CHECKING CRITICAL FIELDS:")
    print("=" * 70)
    
    if "remaining_attempts" in data:
        print(f"✅ 'remaining_attempts' FOUND: {data['remaining_attempts']}")
        if data['remaining_attempts'] == 2:
            print("✅ Correct! Should be 2 after 1st failed attempt")
        else:
            print(f"⚠️  Expected 2, got {data['remaining_attempts']}")
    else:
        print("❌ 'remaining_attempts' NOT in response!")
    
    if "message" in data:
        print(f"✅ 'message' found: {data['message']}")
    else:
        print("❌ 'message' NOT in response!")
    
    if "ml_decision" in data:
        print(f"✅ 'ml_decision' found: {data['ml_decision']}")
    else:
        print("⚠️  'ml_decision' NOT in response")
        
except Exception as e:
    print(f"❌ Login request failed: {e}")
    exit(1)

print("\n" + "=" * 70)
print("CONCLUSION:")
if "remaining_attempts" in data and data["remaining_attempts"] == 2:
    print("✅ BACKEND IS WORKING CORRECTLY!")
    print("✅ The fix is working - backend sends remaining_attempts")
    print("\nIf you're still seeing errors in browser console:")
    print("1. Clear browser cache (Ctrl+Shift+Delete)")
    print("2. Hard refresh the page (Ctrl+Shift+R)")
    print("3. Check browser console for CORS or network errors")
else:
    print("❌ Backend is not sending remaining_attempts correctly")
    print("The ML models might not be loaded or there's a logic error")
print("=" * 70)
