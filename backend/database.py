"""
Database Module - MongoDB Connection
Smart Campus Network Access Control
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, OperationFailure

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "smart_campus")

# Global MongoDB client
_client = None
_db = None


def get_mongo_client():
    """Get or create MongoDB client connection"""
    global _client
    if _client is None:
        try:
            _client = MongoClient(MONGO_URI)
            # Test connection
            _client.admin.command('ping')
            print("✅ Connected to MongoDB successfully!")
        except ConnectionFailure as e:
            print(f"❌ MongoDB connection failed: {e}")
            raise
    return _client


def get_database():
    """Get the MongoDB database instance"""
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client[MONGO_DB_NAME]
    return _db


def _ensure_index(collection, field, **kwargs):
    """
    Idempotently ensure an index exists with the given options.
    If an index with the same name but different spec already exists,
    drop it first to avoid IndexKeySpecsConflict errors.
    """
    index_name = f"{field}_1"
    try:
        collection.create_index(field, **kwargs)
    except OperationFailure as e:
        if e.code == 86:  # IndexKeySpecsConflict
            try:
                collection.drop_index(index_name)
                collection.create_index(field, **kwargs)
            except Exception as drop_err:
                print(f"⚠️  Could not recreate index '{index_name}' on "
                      f"{collection.name}: {drop_err}")
        else:
            print(f"⚠️  Index '{index_name}' on {collection.name}: {e}")


def init_mongodb():
    """Initialize MongoDB collections and indexes"""
    db = get_database()
    
    # Create collections if they don't exist
    if "login_logs" not in db.list_collection_names():
        db.create_collection("login_logs")
        print("📁 Created 'login_logs' collection")
    
    if "users" not in db.list_collection_names():
        db.create_collection("users")
        print("📁 Created 'users' collection")
    
    if "anomalies" not in db.list_collection_names():
        db.create_collection("anomalies")
        print("📁 Created 'anomalies' collection")
    
    if "students" not in db.list_collection_names():
        db.create_collection("students")
        print("📁 Created 'students' collection")
    
    # Create indexes for better query performance
    # Simple non-unique indexes for login_logs
    for field in ["timestamp", "role", "access", "intrusion", "username"]:
        _ensure_index(db.login_logs, field)

    # Unique + sparse indexes — drop conflicting old indexes before recreating
    _ensure_index(db.users, "username", unique=True, sparse=True)
    _ensure_index(db.users, "email", unique=True, sparse=True)
    _ensure_index(db.anomalies, "detected_at")
    _ensure_index(db.students, "user_id", unique=True, sparse=True)
    _ensure_index(db.students, "student_id", unique=True, sparse=True)
    
    # Create default admin if not exists
    create_default_admin(db)
    
    print("✅ MongoDB initialized with indexes")
    return db


def create_default_admin(db):
    """Create a default admin user if none exists"""
    from auth import hash_password
    
    admin_exists = db.users.find_one({"role": "Admin"})
    if not admin_exists:
        admin_user = {
            "name": "System Admin",
            "email": "admin@smartcampus.edu",
            "password_hash": hash_password("Admin@123"),
            "role": "Admin",
            "known_devices": [],
            "failed_attempts": 0,
            "lockout_until": None,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        db.users.insert_one(admin_user)
        print("👤 Created default admin user (admin@smartcampus.edu / Admin@123)")


def get_login_logs_collection():
    """Get the login_logs collection"""
    db = get_database()
    return db.login_logs


def get_users_collection():
    """Get the users collection"""
    db = get_database()
    return db.users


def get_anomalies_collection():
    """Get the anomalies collection"""
    db = get_database()
    return db.anomalies


def get_students_collection():
    """Get the students collection"""
    db = get_database()
    return db.students


# =========================
# USER OPERATIONS
# =========================

def create_user(user_data):
    """Create a new user in MongoDB"""
    collection = get_users_collection()
    user_data["created_at"] = datetime.utcnow()
    result = collection.insert_one(user_data)
    return str(result.inserted_id)


def get_user_by_email(email):
    """Get user by email"""
    collection = get_users_collection()
    return collection.find_one({"email": email.lower()})


def get_user_by_id(user_id):
    """Get user by ID"""
    from bson import ObjectId
    collection = get_users_collection()
    try:
        return collection.find_one({"_id": ObjectId(user_id)})
    except:
        return None


def update_user_failed_attempts(email, failed_attempts, lockout_until=None, had_temp_block=None):
    """Update user's failed login attempts, lockout status, and last failure timestamp.

    Args:
        email: User email (lowercased automatically).
        failed_attempts: New failed_attempts value to persist.
        lockout_until: datetime for temporary lockout expiry, or None.
        had_temp_block: If True, marks that the user has already consumed their
            one temporary block — next 3 failures will be permanent. Leave None
            to leave the existing value unchanged.
    """
    collection = get_users_collection()
    update_data = {
        "failed_attempts": failed_attempts,
        "lockout_until":   lockout_until,
        "last_failed_at":  datetime.utcnow(),
    }
    if had_temp_block is not None:
        update_data["had_temp_block"] = had_temp_block
    collection.update_one(
        {"email": email.lower()},
        {"$set": update_data}
    )


def reset_user_failed_attempts(email):
    """Reset user's failed attempts and all block flags after successful login."""
    collection = get_users_collection()
    collection.update_one(
        {"email": email.lower()},
        {"$set": {
            "failed_attempts": 0,
            "lockout_until":   None,
            "last_failed_at":  None,
            "had_temp_block":  False,   # reset first-cycle flag
            "is_blocked":      False,   # clear any residual block on success
            "last_login":      datetime.utcnow()
        }}
    )


def save_user(user_data):
    """Save or update user in MongoDB"""
    collection = get_users_collection()
    user_data["updated_at"] = datetime.utcnow()
    result = collection.update_one(
        {"username": user_data.get("username")},
        {"$set": user_data},
        upsert=True
    )
    return result.modified_count > 0 or result.upserted_id is not None


def get_user(username):
    """Get user by username"""
    collection = get_users_collection()
    return collection.find_one({"username": username})


def get_all_users():
    """Get all users"""
    collection = get_users_collection()
    return list(collection.find())


# =========================
# LOGIN LOG OPERATIONS
# =========================

def save_login_log(log_data):
    """Save a login attempt to MongoDB"""
    collection = get_login_logs_collection()
    log_data["created_at"] = datetime.utcnow()
    result = collection.insert_one(log_data)
    return str(result.inserted_id)


def get_all_login_logs(limit=100):
    """Get recent login logs"""
    collection = get_login_logs_collection()
    logs = collection.find().sort("timestamp", -1).limit(limit)
    return list(logs)


def get_access_stats():
    """Get login success vs failure statistics"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$group": {"_id": "$access", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[item["_id"], item["count"]] for item in result]


def get_intrusion_stats():
    """Get intrusion statistics by date"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$match": {"intrusion": True}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[item["_id"], item["count"]] for item in result]


def get_time_period_stats():
    """Get day vs night usage statistics"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$project": {
            "hour": {"$hour": "$timestamp"},
            "access": 1
        }},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$and": [{"$gte": ["$hour", 6]}, {"$lte": ["$hour", 18]}]},
                    "Day",
                    "Night"
                ]
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[item["_id"], item["count"]] for item in result]


def get_role_stats():
    """Get login statistics by role"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$group": {"_id": "$role", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[item["_id"], item["count"]] for item in result]


def get_hourly_trends():
    """Get login trends by hour of day"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$project": {"hour": {"$hour": "$timestamp"}}},
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[f"{item['_id']}:00", item["count"]] for item in result]


def get_daily_trends(days=7):
    """Get login trends for the last N days"""
    collection = get_login_logs_collection()
    pipeline = [
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
            "total": {"$sum": 1},
            "allowed": {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
            "blocked": {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
            "intrusions": {"$sum": {"$cond": ["$intrusion", 1, 0]}}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": days}
    ]
    result = list(collection.aggregate(pipeline))
    return list(reversed(result))


# =========================
# ANOMALY OPERATIONS
# =========================

def save_anomaly(anomaly_data):
    """Save detected anomaly to MongoDB"""
    collection = get_anomalies_collection()
    anomaly_data["detected_at"] = datetime.utcnow()
    result = collection.insert_one(anomaly_data)
    return str(result.inserted_id)


def get_recent_anomalies(limit=50):
    """Get recent anomalies"""
    collection = get_anomalies_collection()
    anomalies = collection.find().sort("detected_at", -1).limit(limit)
    return list(anomalies)


def get_anomaly_stats():
    """Get anomaly statistics by type"""
    collection = get_anomalies_collection()
    pipeline = [
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    result = list(collection.aggregate(pipeline))
    return [[item["_id"], item["count"]] for item in result]
