# Device Registration Guide

## How to Register Your Device MAC Address

Since browsers cannot detect your real MAC address, you need to run this script once to register your device.

### Step 1: Make Sure Backend is Running

```bash
cd backend
python app.py
```

You should see:
```
🚀 Initializing Smart Campus API...
✅ MongoDB initialized
🤖 ML Models loaded successfully
```

### Step 2: Run the Registration Script

Open a **new terminal** and run:

```bash
cd d:\Desktop\smart_campus_access
python register_device.py
```

### Step 3: Enter Your Credentials

The script will ask for:
- 📧 **Email**: Your campus email (e.g., `student2@gmail.com`)
- 🔒 **Password**: Your account password
- 🌐 **Server URL**: Press Enter for default (`http://localhost:5000`)

### Example:

```
╔════════════════════════════════════════════════════════════╗
║   Smart Campus Access Control - Device Registration       ║
╚════════════════════════════════════════════════════════════╝

Please enter your campus credentials:
📧 Email: student2@gmail.com
🔒 Password: ********
🌐 Server URL (press Enter for http://localhost:5000): 

🔍 Detecting your MAC address...
✅ Detected MAC: F8:AC:65:07:59:12
💻 Device: DESKTOP-ABCD123 (Windows)

📡 Connecting to server: http://localhost:5000
🔑 Authenticating as: student2@gmail.com
✅ Login successful!
✅ MAC address registered successfully!

════════════════════════════════════════════════════════════
✨ Registration Complete!
════════════════════════════════════════════════════════════
Your device is now registered with MAC: F8:AC:65:07:59:12
You can now login from the web interface without issues.

✅ You can now close this window and login via the web interface!
```

### Step 4: Login Via Web

Now open your browser and go to `http://localhost:5173`

Your device's real MAC address is now registered!

---

## What This Script Does

1. **Detects your real MAC address** using system commands:
   - Windows: `ipconfig /all`
   - Linux: `ip link` or `ifconfig`
   - macOS: `ifconfig`

2. **Sends MAC to server** during login

3. **Auto-registers** the MAC address for your account

---

## For Multiple Devices

Run the script on **each device** you want to use:
- Your laptop
- Your desktop
- Your phone (if you can run Python on it)

Each device's MAC will be registered separately.

---

## Troubleshooting

**"Could not detect MAC address"**
- Try running script as administrator (Windows)
- Check if `ipconfig` or `ifconfig` commands work on your system

**"Could not connect to server"**
- Make sure backend is running on port 5000
- Check firewall settings

**"Login failed: Invalid password"**
- Double-check your email and password
- Make sure you have an account in the database

---

## Security Note

This script only runs **locally on your computer**. It detects your hardware MAC address and sends it securely to the backend during authentication. This is necessary because web browsers cannot access MAC addresses for security reasons.
