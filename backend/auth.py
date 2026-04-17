"""
Authentication Module - JWT, Password Hashing, Lockout Management
Smart Campus Network Access Control
"""

import os
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "smart_campus_secret_key_2024")
JWT_EXPIRATION_HOURS = 24

# Login Security Configuration
# These values drive the real blocking logic — do NOT hardcode them elsewhere.
MAX_FAILED_ATTEMPTS = 3           # Wrong attempts before a block is triggered
TEMP_BLOCK_HOURS = 8              # Hours for the first (temporary) block
TEMP_LOCKOUT_DURATION_MINUTES = TEMP_BLOCK_HOURS * 60  # Kept for backward compat



def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(password, hashed):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def generate_token(user_data):
    """Generate JWT token for authenticated user"""
    payload = {
        "user_id": str(user_data.get("_id", "")),
        "email": user_data.get("email"),
        "name": user_data.get("name"),
        "role": user_data.get("role"),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_token(token):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def token_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"error": "Authentication token is missing"}), 401
        
        payload = decode_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Add user info to request
        request.current_user = payload
        return f(*args, **kwargs)
    
    return decorated


def role_required(*roles):
    """Decorator to restrict access to specific roles"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user'):
                return jsonify({"error": "Authentication required"}), 401
            
            user_role = request.current_user.get('role')
            if user_role not in roles:
                return jsonify({"error": "Access denied. Insufficient permissions."}), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator


def check_lockout(user):
    """Check if user account is locked"""
    if not user:
        return False, 0
    
    lockout_until = user.get("lockout_until")
    if lockout_until:
        if isinstance(lockout_until, str):
            lockout_until = datetime.fromisoformat(lockout_until)
        
        if datetime.utcnow() < lockout_until:
            remaining = (lockout_until - datetime.utcnow()).total_seconds()
            return True, int(remaining)
    
    return False, 0


def get_lockout_duration_minutes():
    """Get temporary lockout duration in minutes (8 hours)."""
    return TEMP_LOCKOUT_DURATION_MINUTES


def get_remaining_attempts(failed_attempts):
    """
    Return how many wrong-password attempts remain before a block is triggered.
    Returns 0 when the limit has been reached.
    """
    if failed_attempts >= MAX_FAILED_ATTEMPTS:
        return 0
    return MAX_FAILED_ATTEMPTS - failed_attempts


def validate_email(email):
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """
    Validate password strength
    - At least 6 characters
    - Contains at least one letter and one number
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    if not has_letter:
        return False, "Password must contain at least one letter"
    if not has_digit:
        return False, "Password must contain at least one number"
    
    return True, "Password is valid"
