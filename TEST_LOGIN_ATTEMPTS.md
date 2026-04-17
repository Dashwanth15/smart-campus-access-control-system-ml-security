# Testing Login Attempts - Manual Test Instructions

## Quick Test Steps

1. **Open browser** to `http://localhost:3000`

2. **Create a fresh test account:**
   - Click "Sign up"
   - Name: `Test Student 2`
   - Email: `teststudent2@test.com`
   - Password: `Test123`
   - Role: Student
   - Click Sign up

3. **Test failed login attempts:**
   - Logout if logged in
   - Try to login with:
     - Email: `teststudent2@test.com`
     - Password: `WrongPassword` (wrong password)
   
4. **Expected Results:**
   - **Attempt 1**: Should show "2 attempts remaining"
   - **Attempt 2**: Should show "1 attempt remaining"
   - **Attempt 3**: Account should be BLOCKED (ML decision)

## What To Look For

✅ **Correct behavior:**
- Error message shows specific count: "2 attempts remaining", "1 attempt remaining"
- After 3rd failed attempt, account is blocked
- Blocking happens due to ML detection (not hard-coded check)

❌ **If still showing "incorrect password":**
- Open browser console (F12)
- Check Network tab → look for `/api/auth/login` request
- Check the Response to see if `remaining_attempts` field exists
- Report back what you see in the response

## Admin Unblock Test

After account is blocked:

1. Login as admin (or create admin account)
2. Go to user management/dashboard
3. Find the blocked student account
4. Click "Unblock"
5. Student should be able to login with correct password (`Test123`)
