"""
Reset Admin Password Script
Run this to create or reset the admin user
"""

from database import get_database
from auth import hash_password
from datetime import datetime

def reset_admin():
    db = get_database()
    
    # Check if admin exists
    admin = db.users.find_one({'email': 'admin@smartcampus.edu'})
    if admin:
        # Update password
        new_hash = hash_password('Admin@123')
        db.users.update_one(
            {'email': 'admin@smartcampus.edu'},
            {'$set': {
                'password_hash': new_hash,
                'failed_attempts': 0,
                'lockout_until': None
            }}
        )
        print('✅ Admin password reset successfully!')
    else:
        # Create admin
        admin_data = {
            'name': 'System Admin',
            'username': 'admin_system',
            'email': 'admin@smartcampus.edu',
            'password_hash': hash_password('Admin@123'),
            'role': 'Admin',
            'known_devices': [],
            'failed_attempts': 0,
            'lockout_until': None,
            'created_at': datetime.utcnow(),
            'is_active': True
        }
        db.users.insert_one(admin_data)
        print('✅ Admin user created successfully!')
    
    print('📧 Login with: admin@smartcampus.edu')
    print('🔑 Password: Admin@123')

if __name__ == '__main__':
    reset_admin()
