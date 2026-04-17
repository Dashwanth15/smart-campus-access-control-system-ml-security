"""
MAC Address Detection Utility
Detects the system's real MAC address(es) for network identification
"""

import uuid
import socket
import subprocess
import platform
import re


def get_mac_address():
    """Get the primary MAC address of the system"""
    try:
        # Method 1: Using uuid (works cross-platform)
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0, 48, 8)][::-1])
        return mac.upper()
    except Exception as e:
        print(f"UUID method failed: {e}")
        return None


def get_all_mac_addresses():
    """Get all MAC addresses from network interfaces"""
    mac_addresses = []
    system = platform.system()
    
    try:
        if system == "Windows":
            # Use ipconfig /all on Windows
            result = subprocess.run(['ipconfig', '/all'], capture_output=True, text=True)
            output = result.stdout
            
            # Find all MAC addresses (Physical Address)
            pattern = r'Physical Address[.\s]*:\s*([0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2}[:-][0-9A-Fa-f]{2})'
            matches = re.findall(pattern, output)
            
            for mac in matches:
                # Normalize to colon-separated uppercase
                mac_normalized = mac.replace('-', ':').upper()
                if mac_normalized not in mac_addresses and mac_normalized != '00:00:00:00:00:00':
                    mac_addresses.append(mac_normalized)
                    
        elif system == "Linux":
            # Use ip link or ifconfig on Linux
            try:
                result = subprocess.run(['ip', 'link'], capture_output=True, text=True)
                output = result.stdout
            except:
                result = subprocess.run(['ifconfig', '-a'], capture_output=True, text=True)
                output = result.stdout
            
            pattern = r'([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})'
            matches = re.findall(pattern, output)
            
            for mac in matches:
                mac_upper = mac.upper()
                if mac_upper not in mac_addresses and mac_upper != '00:00:00:00:00:00':
                    mac_addresses.append(mac_upper)
                    
        elif system == "Darwin":  # macOS
            result = subprocess.run(['ifconfig'], capture_output=True, text=True)
            output = result.stdout
            
            pattern = r'ether\s+([0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2})'
            matches = re.findall(pattern, output)
            
            for mac in matches:
                mac_upper = mac.upper()
                if mac_upper not in mac_addresses and mac_upper != '00:00:00:00:00:00':
                    mac_addresses.append(mac_upper)
                    
    except Exception as e:
        print(f"Error getting MAC addresses: {e}")
    
    # Always include the UUID-based MAC as fallback
    uuid_mac = get_mac_address()
    if uuid_mac and uuid_mac not in mac_addresses:
        mac_addresses.insert(0, uuid_mac)
    
    return mac_addresses


def get_network_info():
    """Get comprehensive network information"""
    info = {
        "hostname": socket.gethostname(),
        "primary_mac": get_mac_address(),
        "all_macs": get_all_mac_addresses(),
        "platform": platform.system(),
        "ip_addresses": []
    }
    
    try:
        # Get local IP addresses
        hostname = socket.gethostname()
        ips = socket.gethostbyname_ex(hostname)[2]
        info["ip_addresses"] = [ip for ip in ips if not ip.startswith("127.")]
    except:
        pass
    
    return info


if __name__ == "__main__":
    print("=" * 50)
    print("MAC Address Detection Utility")
    print("=" * 50)
    
    info = get_network_info()
    
    print(f"\nHostname: {info['hostname']}")
    print(f"Platform: {info['platform']}")
    print(f"\nPrimary MAC Address: {info['primary_mac']}")
    
    print(f"\nAll MAC Addresses Found:")
    for i, mac in enumerate(info['all_macs'], 1):
        print(f"  {i}. {mac}")
    
    print(f"\nIP Addresses:")
    for ip in info['ip_addresses']:
        print(f"  - {ip}")
    
    print("\n" + "=" * 50)
