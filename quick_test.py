"""
Quick test to see what the backend actually returns on failed login
"""
import requests
import json

# Test with a student account
response = requests.post(
    "http://localhost:5000/api/auth/login",
    json={
        "email": "student@test.com",  # Use an existing student email
        "password": "wrongpassword123",
        "mac_address": "AA:BB:CC:DD:EE:FF"
    }
)

print("=" * 60)
print(f"Status Code: {response.status_code}")
print("=" * 60)
print("Full Response JSON:")
print(json.dumps(response.json(), indent=2))
print("=" * 60)

# Check specific fields
data = response.json()
if "remaining_attempts" in data:
    print(f"✅ remaining_attempts found: {data['remaining_attempts']}")
else:
    print("❌ remaining_attempts NOT in response")

if "message" in data:
    print(f"✅ message found: {data['message']}")
else:
    print("❌ message NOT in response")

if "ml_decision" in data:
    print(f"✅ ml_decision found: {data['ml_decision']}")
else:
    print("❌ ml_decision NOT in response")
