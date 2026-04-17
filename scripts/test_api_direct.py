"""
Direct API test - check what the backend actually returns
This will create a test student and try logging in with wrong password
"""
import requests
import json

BASE_URL = "http://localhost:5000"

print("=" * 70)
print("STEP 1: Create a fresh test student account")
print("=" * 70)

# Create a fresh test account
signup_response = requests.post(
    f"{BASE_URL}/api/auth/signup",
    json={
        "name": "API Test Student",
        "email": "apitest@test.com",
        "password": "Correct123",
        "role": "Student"
    }
)

print(f"Signup Status: {signup_response.status_code}")
if signup_response.status_code == 201:
    print("✅ Account created successfully")
elif signup_response.status_code == 409:
    print("⚠️  Account already exists - that's okay, continuing...")
else:
    print(f"Response: {signup_response.json()}")

print("\n" + "=" * 70)
print("STEP 2: Try logging in with WRONG password (Attempt 1)")
print("=" * 70)

response1 = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "email": "apitest@test.com",
        "password": "WrongPassword",
        "mac_address": "AA:BB:CC:DD:EE:FF"
    }
)

print(f"\nStatus Code: {response1.status_code}")
print(f"\nFull Response:")
print(json.dumps(response1.json(), indent=2))

data1 = response1.json()
print("\n" + "-" * 70)
print("CHECKING KEY FIELDS:")
print(f"  'error' field: {data1.get('error', 'NOT FOUND')}")
print(f"  'message' field: {data1.get('message', 'NOT FOUND')}")
print(f"  'remaining_attempts' field: {data1.get('remaining_attempts', 'NOT FOUND')}")
print(f"  'ml_decision' field: {data1.get('ml_decision', 'NOT FOUND')}")
print("-" * 70)

if 'remaining_attempts' in data1:
    print(f"\n✅ remaining_attempts IS in response: {data1['remaining_attempts']}")
else:
    print(f"\n❌ remaining_attempts is NOT in response!")
    print("This means the backend is NOT sending the field at all.")

print("\n" + "=" * 70)
print("STEP 3: Try logging in with WRONG password again (Attempt 2)")
print("=" * 70)

response2 = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={
        "email": "apitest@test.com",
        "password": "WrongPassword",
        "mac_address": "AA:BB:CC:DD:EE:FF"
    }
)

print(f"\nStatus Code: {response2.status_code}")
data2 = response2.json()
print(f"Response: {json.dumps(data2, indent=2)}")
print(f"\nremaining_attempts: {data2.get('remaining_attempts', 'NOT FOUND')}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print("If 'remaining_attempts' is NOT FOUND, the backend is not sending it.")
print("If it IS found, then the issue is in the frontend display logic.")
print("=" * 70)
