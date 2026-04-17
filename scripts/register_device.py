"""
MAC Address Registration Script
Students run this once to register their device MAC address with the server
"""

import uuid
import requests
import platform
import subprocess
import re


def get_real_mac_address():
    """Get the real MAC address of this computer"""
    try:
        # Method 1: Using uuid.getnode() - most reliable
        mac_int = uuid.getnode()
        mac = ':'.join(['{:02x}'.format((mac_int >> elements) & 0xff) 
                       for elements in range(0, 2*6, 8)][::-1])
        
        # Verify it's not a fake MAC (all zeros or random)
        if mac != '00:00:00:00:00:00':
            return mac.upper()
        
        # Method 2: System-specific detection
        system = platform.system()
        
        if system == "Windows":
            result = subprocess.run(['ipconfig', '/all'], capture_output=True, text=True)
            pattern = r'Physical Address[.\s]*:\s*([0-9A-Fa-f]{2}[-][0-9A-Fa-f]{2}[-][0-9A-Fa-f]{2}[-][0-9A-Fa-f]{2}[-][0-9A-Fa-f]{2}[-][0-9A-Fa-f]{2})'
            matches = re.findall(pattern, result.stdout)
            if matches:
                return matches[0].replace('-', ':').upper()
        
        elif system == "Linux":
            result = subprocess.run(['ip', 'link'], capture_output=True, text=True)
            pattern = r'link/ether\s+([0-9A-Fa-f:]{17})'
            matches = re.findall(pattern, result.stdout)
            if matches:
                return matches[0].upper()
        
        elif system == "Darwin":  # macOS
            result = subprocess.run(['ifconfig'], capture_output=True, text=True)
            pattern = r'ether\s+([0-9A-Fa-f:]{17})'
            matches = re.findall(pattern, result.stdout)
            if matches:
                return matches[0].upper()
        
        return None
        
    except Exception as e:
        print(f"Error detecting MAC: {e}")
        return None


def get_device_info():
    """Get device information for better identification"""
    return {
        "hostname": platform.node(),
        "platform": platform.system(),
        "platform_release": platform.release(),
        "machine": platform.machine()
    }


def register_mac_with_server(email, password, server_url="http://localhost:5000"):
    """Register MAC address with the server"""
    
    print("=" * 60)
    print("🔐 Smart Campus - MAC Address Registration")
    print("=" * 60)
    
    # Detect MAC address
    print("\n🔍 Detecting your MAC address...")
    mac_address = get_real_mac_address()
    
    if not mac_address:
        print("❌ Could not detect MAC address!")
        return
    
    print(f"✅ Detected MAC: {mac_address}")
    
    # Get device info
    device_info = get_device_info()
    print(f"💻 Device: {device_info['hostname']} ({device_info['platform']})")
    
    # Login and register MAC
    print(f"\n📡 Connecting to server: {server_url}")
    
    try:
        # First, login to get token
        print(f"🔑 Authenticating as: {email}")
        login_response = requests.post(
            f"{server_url}/api/auth/login",
            json={
                "email": email,
                "password": password,
                "mac_address": mac_address  # Send MAC during login
            }
        )
        
        if login_response.status_code == 200:
            print("✅ Login successful!")
            data = login_response.json()
            
            # Check if MAC was registered
            if "mac_registered" in data:
                print(f"✅ MAC address registered successfully!")
                print(f"📱 Device name: {device_info['hostname']}")
            else:
                print("✅ MAC address already registered for your account")
            
            print("\n" + "=" * 60)
            print("✨ Registration Complete!")
            print("=" * 60)
            print(f"Your device is now registered with MAC: {mac_address}")
            print("You can now login from the web interface without issues.")
            
        else:
            error_data = login_response.json()
            print(f"❌ Login failed: {error_data.get('error', 'Unknown error')}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to server at {server_url}")
        print("   Make sure the backend is running!")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("\n")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║   Smart Campus Access Control - Device Registration       ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Get user credentials
    print("\nPlease enter your campus credentials:")
    email = input("📧 Email: ").strip()
    password = input("🔒 Password: ").strip()
    
    # Optional: Custom server URL
    server = input("🌐 Server URL (press Enter for http://localhost:5000): ").strip()
    if not server:
        server = "http://localhost:5000"
    
    print("\n")
    
    # Register MAC
    register_mac_with_server(email, password, server)
    
    print("\n✅ You can now close this window and login via the web interface!")
    input("\nPress Enter to exit...")
