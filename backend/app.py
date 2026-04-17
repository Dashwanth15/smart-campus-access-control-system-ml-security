"""
Smart Campus Network Access Control API
Flask Backend with MongoDB, ML Models, Analytics, and Authentication
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import joblib
import os
import uuid

# =========================
# DATABASE IMPORTS (MongoDB)
# =========================
from database import (
    init_mongodb,
    save_login_log,
    save_anomaly,
    get_access_stats,
    get_intrusion_stats,
    get_time_period_stats,
    get_role_stats,
    get_hourly_trends,
    get_daily_trends,
    get_recent_anomalies,
    get_anomaly_stats,
    get_all_login_logs,
    get_user_by_email,
    create_user,
    update_user_failed_attempts,
    reset_user_failed_attempts,
    get_database
)

# =========================
# AUTH IMPORTS
# =========================
from auth import (
    hash_password,
    verify_password,
    generate_token,
    decode_token,
    token_required,
    role_required,
    check_lockout,
    get_lockout_duration_minutes,
    get_remaining_attempts,
    validate_email,
    validate_password,
    MAX_FAILED_ATTEMPTS,
    TEMP_BLOCK_HOURS,
)

# =========================
# ROUTE IMPORTS
# =========================
from student_routes import student_bp, init_student_data
from admin_routes import admin_bp
from campus_routes import campus_bp

# =========================
# FLASK SETUP
# =========================
app = Flask(__name__)

# CORS — reads FRONTEND_URL from environment (set in Render dashboard)
# Trailing slash is stripped so both forms of the URL match correctly.
_raw_frontend = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://smart-campus-access-control-system-ml.onrender.com",  # production
]
# Also add the env var dynamically (handles any future domain changes)
_env_origin = _raw_frontend.strip().rstrip("/")
if _env_origin and _env_origin not in _allowed_origins:
    _allowed_origins.append(_env_origin)

CORS(app,
     origins=_allowed_origins,
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])

app.register_blueprint(student_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(campus_bp)

# Initialize MongoDB
print("🚀 Initializing Smart Campus API...")
try:
    init_mongodb()
    print("✅ MongoDB initialized successfully!")
except Exception as e:
    print(f"❌ MongoDB connection failed on startup: {e}")
    print("⚠️  Server will start but database features won't work until MongoDB is reachable.")
    print("   Please check your MONGO_URI in .env and ensure your Atlas cluster is running.")

# =========================
# LOAD ML MODELS  v2 (Random Forest + SVM)
# =========================
ml_models = {}

# Groq AI Configuration (API key must be set in .env)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"
if not GROQ_API_KEY:
    print("⚠️  WARNING: GROQ_API_KEY is not set in .env — AI chat will not work.")

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ml_dir   = os.path.join(BASE_DIR, 'ml')

    # Random Forest — access decision (Allowed / Restricted / Blocked)
    ml_models['random_forest']  = joblib.load(os.path.join(ml_dir, 'rf_model.pkl'))
    ml_models['access_encoder'] = joblib.load(os.path.join(ml_dir, 'access_encoder_v2.pkl'))

    # SVM — intrusion / anomaly detection (0 = normal, 1 = suspicious)
    ml_models['svm'] = joblib.load(os.path.join(ml_dir, 'svm_model_v2.pkl'))

    print("🤖 ML Models v2 loaded successfully:")
    print("   ✅ Random Forest  (Access Control)")
    print("   ✅ SVM            (Intrusion Detection)")
except Exception as e:
    print(f"⚠️  Warning: Could not load ML models v2: {e}")
    print("   Trying legacy model files...")
    try:
        ml_models['random_forest']  = joblib.load(os.path.join(ml_dir, 'access_model.pkl'))
        ml_models['access_encoder'] = joblib.load(os.path.join(ml_dir, 'access_encoder.pkl'))
        ml_models['svm']            = joblib.load(os.path.join(ml_dir, 'svm_model.pkl'))
        print("   ✅ Legacy models loaded as fallback")
    except Exception as e2:
        print(f"❌ All ML models failed: {e2}")
        ml_models = None

# Convenience aliases
try:
    if ml_models:
        rf_model       = ml_models['random_forest']
        svm_model      = ml_models['svm']
        access_encoder = ml_models['access_encoder']
        # Keep legacy names for any old code paths
        decision_tree_model = rf_model
        role_encoder        = None  # No longer needed — no role feature
        print("✅ ML model aliases ready")
    else:
        rf_model = decision_tree_model = svm_model = access_encoder = role_encoder = None
except Exception as e:
    print(f"⚠️  Could not set ML aliases: {e}")
    rf_model = decision_tree_model = svm_model = access_encoder = role_encoder = None


# =========================
# HELPER FUNCTIONS
# =========================
def generate_device_id():
    """Generate a random fallback device ID (only used when client sends nothing)"""
    return uuid.uuid4().hex



def extract_browser_info(request_obj):
    """Parse User-Agent into a human-readable device string"""
    ua = request_obj.headers.get('User-Agent', '')
    if not ua:
        return 'Unknown'
    # Lightweight UA parsing without external lib
    browser = 'Unknown'
    os_info = 'Unknown'
    for b in ['Edg', 'Chrome', 'Firefox', 'Safari', 'Opera']:
        if b.lower() in ua.lower():
            browser = b if b != 'Edg' else 'Edge'
            break
    for o in [('Windows NT', 'Windows'), ('Macintosh', 'macOS'),
              ('Linux', 'Linux'), ('Android', 'Android'), ('iPhone', 'iOS')]:
        if o[0] in ua:
            os_info = o[1]
            break
    return f"{browser} / {os_info}"


def compute_risk_score(device_known, failed_attempts, ip_change,
                       browser_change, login_frequency, is_intrusion,
                       access_decision):
    """Return a 0-100 risk score based on ML outputs + features"""
    score = 0
    if not device_known:          score += 35
    score += min(failed_attempts * 12, 30)
    if ip_change:                 score += 10
    if browser_change:            score += 8
    if is_intrusion:              score += 20
    if access_decision == 'Blocked':     score += 15
    elif access_decision == 'Restricted': score += 8
    if login_frequency >= 15:     score += 5
    return min(score, 100)




# =========================
# HOME ROUTE
# =========================
@app.route("/")
def home():
    return jsonify({
        "message": "Smart Campus Access Control API (MongoDB + ML + Auth)",
        "status": "Running",
        "version": "3.1",
        "database": "MongoDB",
        "features": ["Authentication", "Role-based Access", "ML Detection", "Analytics", "Device Fingerprinting"]
    })


# =========================
# DEBUG / HEALTH CHECK
# =========================
@app.route("/api/debug/status", methods=["GET"])
def debug_status():
    """
    Quick health check — visit http://localhost:5000/api/debug/status
    to confirm DB connectivity and collection counts.
    No auth required (remove in production).
    """
    try:
        db = get_database()
        return jsonify({
            "db_connected":  True,
            "db_name":       db.name,
            "collections":   db.list_collection_names(),
            "counts": {
                "users":      db.users.count_documents({}),
                "login_logs": db.login_logs.count_documents({}),
                "anomalies":  db.anomalies.count_documents({}),
            },
            "ml_loaded": bool(ml_models),
            "ml_models": list(ml_models.keys()) if ml_models else [],
        })
    except Exception as e:
        return jsonify({"db_connected": False, "error": str(e)}), 500


# =========================
# AUTHENTICATION ROUTES
# =========================
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """User registration endpoint"""
    data = request.json
    
    # Validate required fields
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "Guest")
    
    if not name:
        return jsonify({"error": "Name is required"}), 400
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
    
    if not validate_email(email):
        return jsonify({"error": "Invalid email format"}), 400
    
    is_valid, msg = validate_password(password)
    if not is_valid:
        return jsonify({"error": msg}), 400
    
    if role not in ["Student", "Faculty", "Guest", "Admin"]:
        return jsonify({"error": "Invalid role"}), 400
    
    # Check if user already exists
    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409
    
    # Create user
    # Generate username from email to satisfy unique index
    username = email.split('@')[0] + '_' + str(uuid.uuid4())[:8]
    
    user_data = {
        "name": name,
        "username": username,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "known_devices": [],
        "failed_attempts": 0,
        "lockout_until": None,
        "created_at": datetime.utcnow(),
        "is_active": True
    }
    
    user_id = create_user(user_data)
    
    # Initialize student data if role is Student
    if role == "Student":
        init_student_data(user_id, name)
    
    return jsonify({
        "message": "Registration successful",
        "user_id": user_id,
        "role": role
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """User login — device fingerprint, Random Forest + SVM, risk score v2"""
    data = request.json or {}

    email     = data.get("email", "").strip().lower()
    password  = data.get("password", "")
    device_id = (
        data.get("device_id")
        or data.get("mac_address")
        or generate_device_id()
    )

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if user.get("is_blocked"):
        return jsonify({
            "error": "Account permanently blocked. Contact admin.",
            "locked": True, "permanent": True
        }), 403

    is_locked, remaining_seconds = check_lockout(user)
    if is_locked:
        mins = remaining_seconds // 60
        secs = remaining_seconds % 60
        return jsonify({
            "error": "Account temporarily blocked",
            "locked": True,
            "remaining_seconds": remaining_seconds,
            "message": f"Try again in {mins}m {secs}s"
        }), 403

    # ── Contextual feature extraction ─────────────────────────────
    login_hour   = datetime.utcnow().hour
    ip_address   = request.headers.get('X-Forwarded-For', request.remote_addr or 'unknown')
    browser_info = extract_browser_info(request)

    known_devices   = user.get("known_devices", user.get("mac_addresses", []))
    device_is_known = device_id in known_devices

    db = get_database()

    # Dynamic login_frequency (logins in last 24 h)
    since_24h = datetime.utcnow() - timedelta(hours=24)
    login_frequency = db.login_logs.count_documents({
        "username": email,
        "timestamp": {"$gte": since_24h}
    }) + 1

    # ip_change & browser_change vs last successful login
    last_log     = db.login_logs.find_one(
        {"username": email, "access": "Allowed"},
        sort=[("timestamp", -1)]
    )
    last_ip      = last_log.get("ip_address",   ip_address)   if last_log else ip_address
    last_browser = last_log.get("browser_info", browser_info) if last_log else browser_info
    ip_change      = 0 if last_ip == ip_address        else 1
    browser_change = 0 if last_browser == browser_info  else 1

    # ── Helper: build 6-feature vector ───────────────────────────
    def make_features(dev_known, failed):
        return [[
            1 if dev_known else 0,
            login_hour,
            failed,
            ip_change,
            browser_change,
            login_frequency
        ]]

    # ── Helper: run RF + SVM ──────────────────────────────────────
    def run_ml(features, fallback_failed):
        if ml_models:
            try:
                rf_pred    = ml_models['random_forest'].predict(features)
                decision   = ml_models['access_encoder'].inverse_transform(rf_pred)[0]
                svm_pred   = ml_models['svm'].predict(features)[0]
                intrusion  = bool(svm_pred == 1)
                return decision, intrusion
            except Exception as ex:
                print(f"ML error: {ex}")
        # Fallback heuristic
        decision  = "Blocked" if fallback_failed >= 3 else ("Restricted" if fallback_failed >= 1 else "Allowed")
        intrusion = fallback_failed >= 2
        return decision, intrusion

    # ═══════════════════════════════════════════════════════════
    # WRONG PASSWORD
    # ═══════════════════════════════════════════════════════════
    if not verify_password(password, user.get("password_hash", "")):

        # ── Admin bypass: no attempt counting, no lockout, no ML ──────────
        if user.get("role") == "Admin":
            save_login_log({
                "timestamp":       datetime.utcnow(),
                "username":        email,
                "role":            "Admin",
                "device_id":       device_id,
                "device_known":    bool(device_is_known),
                "ip_address":      ip_address,
                "browser_info":    browser_info,
                "ip_change":       ip_change,
                "browser_change":  browser_change,
                "failed_attempts": 0,
                "login_frequency": login_frequency,
                "login_hour":      login_hour,
                "access":          "Restricted",
                "intrusion":       False,
                "alert":           False,
                "risk_score":      0,
                "reason":          "invalid_password"
            })
            return jsonify({
                "error":   "Invalid password",
                "message": "Incorrect password. Please try again."
            }), 401
        # ─────────────────────────────────────────────────────────────────

        # ── Time-window auto-reset: if the temp block has EXPIRED, give a fresh cycle ──
        lockout_until_val = user.get("lockout_until")
        if lockout_until_val:
            if isinstance(lockout_until_val, str):
                lockout_until_val = datetime.fromisoformat(lockout_until_val)
            if datetime.utcnow() >= lockout_until_val:
                # Temp block has expired — reset attempts so they get a fresh 3-attempt cycle
                db.users.update_one(
                    {"email": email},
                    {"$set": {"failed_attempts": 0, "lockout_until": None, "last_failed_at": None}}
                )
                user["failed_attempts"] = 0
                user["lockout_until"]   = None
        # ─────────────────────────────────────────────────────────────────────────────────

        failed_attempts = user.get("failed_attempts", 0) + 1

        # Run ML purely for analytics logging — it does NOT control blocking anymore
        features        = make_features(device_is_known, failed_attempts)
        access_decision, is_intrusion = run_ml(features, failed_attempts)

        risk = compute_risk_score(
            device_is_known, failed_attempts, ip_change,
            browser_change, login_frequency, is_intrusion, access_decision
        )
        remaining = get_remaining_attempts(failed_attempts)

        save_login_log({
            "timestamp":       datetime.utcnow(),
            "username":        email,
            "role":            user.get("role", "Unknown"),
            "device_id":       device_id,
            "device_known":    bool(device_is_known),
            "ip_address":      ip_address,
            "browser_info":    browser_info,
            "ip_change":       ip_change,
            "browser_change":  browser_change,
            "failed_attempts": int(failed_attempts),
            "login_frequency": login_frequency,
            "login_hour":      login_hour,
            "access":          str(access_decision),
            "intrusion":       bool(is_intrusion),
            "alert":           bool(is_intrusion),
            "risk_score":      risk,
            "reason":          "invalid_password"
        })

        # ── COUNT-BASED BLOCKING (3-strike rule) ──────────────────────────────────────
        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            had_temp_block = user.get("had_temp_block", False)

            if had_temp_block:
                # Second cycle: 3 failures AFTER the temp block expired → PERMANENT block
                db.users.update_one(
                    {"email": email},
                    {"$set": {
                        "is_blocked":      True,
                        "blocked_at":      datetime.utcnow(),
                        "blocked_reason":  "Permanently blocked after exhausting temp block",
                        "failed_attempts": int(failed_attempts),
                    }}
                )
                return jsonify({
                    "error":     "Account permanently blocked. Contact admin.",
                    "locked":    True,
                    "permanent": True,
                    "risk_score": risk
                }), 403
            else:
                # First cycle: temp block for TEMP_BLOCK_HOURS, reset attempt counter
                lockout_until = datetime.utcnow() + timedelta(hours=TEMP_BLOCK_HOURS)
                update_user_failed_attempts(
                    email,
                    0,                   # reset counter so it starts fresh after unblock
                    lockout_until,
                    had_temp_block=True  # mark that the one-time temp block was used
                )
                remaining_seconds = int(TEMP_BLOCK_HOURS * 3600)
                return jsonify({
                    "error":             f"Account temporarily blocked for {TEMP_BLOCK_HOURS} hours.",
                    "locked":            True,
                    "remaining_seconds": remaining_seconds,
                    "message":           f"Too many failed attempts. Try again in {TEMP_BLOCK_HOURS} hours.",
                    "risk_score":        risk
                }), 403
        else:
            # Still within the allowed attempts — just save the count
            update_user_failed_attempts(email, failed_attempts, None)
            return jsonify({
                "error":              "Invalid password",
                "remaining_attempts": remaining,
                "message":            f"Incorrect password. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                "warning":            True,
                "risk_score":         risk
            }), 401
        # ─────────────────────────────────────────────────────────────────────────────

    # ═══════════════════════════════════════════════════════════
    # CORRECT PASSWORD
    # ═══════════════════════════════════════════════════════════

    # Auto-register new device fingerprint
    if not device_is_known and device_id and device_id not in ('unknown', 'fallback-device'):
        db.users.update_one(
            {"email": email},
            {"$addToSet": {"known_devices": device_id}}
        )
        device_is_known = True
        print(f"✅ Device registered for {email}: {device_id[:16]}…")

    if not device_id or device_id == 'unknown':
        device_is_known = True

    features = make_features(device_is_known, 0)

    access_decision    = "Allowed"
    intrusion_detected = False
    if user["role"] != "Admin":
        access_decision, intrusion_detected = run_ml(features, 0)

    risk_score = compute_risk_score(
        device_is_known, 0, ip_change,
        browser_change, login_frequency, intrusion_detected, access_decision
    )

    reset_user_failed_attempts(email)

    save_login_log({
        "timestamp":       datetime.utcnow(),
        "username":        email,
        "role":            user["role"],
        "device_id":       device_id,
        "device_known":    True,
        "ip_address":      ip_address,
        "browser_info":    browser_info,
        "ip_change":       ip_change,
        "browser_change":  browser_change,
        "failed_attempts": 0,
        "login_frequency": login_frequency,
        "login_hour":      login_hour,
        "access":          str(access_decision),
        "intrusion":       bool(intrusion_detected),
        "alert":           bool(intrusion_detected),
        "risk_score":      risk_score
    })

    user["_id"] = str(user["_id"])
    token = generate_token(user)

    return jsonify({
        "message":            "Login successful",
        "token":              token,
        "user": {
            "id":    user["_id"],
            "name":  user["name"],
            "email": user["email"],
            "role":  user["role"]
        },
        "access":             access_decision,
        "intrusion_detected": intrusion_detected,
        "device_known":       True,
        "risk_score":         risk_score,
        "login_hour":         login_hour
    })



# =========================
# CAMPUS INFO API (FOR GUESTS)
# =========================
@app.route("/api/campus/info", methods=["GET"])
def get_campus_info():
    """Get campus information for guest dashboard"""
    return jsonify({
        "name": "Smart Campus University",
        "established": 2010,
        "location": "Technology Park, Innovation City",
        "about": "Smart Campus University is a premier institution offering cutting-edge education in engineering and technology. Our campus features state-of-the-art facilities, experienced faculty, and a vibrant learning environment.",
        "vision": "To be a global leader in technology education and research.",
        "mission": "To nurture innovative minds and create solutions for tomorrow's challenges.",
        "accreditation": "NAAC A+ Grade, NBA Accredited"
    })


@app.route("/api/campus/fees", methods=["GET"])
def get_fee_structure():
    """Get fee structure for guest dashboard"""
    return jsonify({
        "programs": [
            {
                "name": "B.Tech Computer Science",
                "duration": "4 Years",
                "annual_fee": 150000,
                "hostel_fee": 80000,
                "other_charges": 20000
            },
            {
                "name": "B.Tech Electronics",
                "duration": "4 Years",
                "annual_fee": 140000,
                "hostel_fee": 80000,
                "other_charges": 20000
            },
            {
                "name": "B.Tech Mechanical",
                "duration": "4 Years",
                "annual_fee": 135000,
                "hostel_fee": 80000,
                "other_charges": 20000
            },
            {
                "name": "M.Tech (All Branches)",
                "duration": "2 Years",
                "annual_fee": 100000,
                "hostel_fee": 80000,
                "other_charges": 15000
            }
        ],
        "payment_modes": ["Online", "Bank Transfer", "DD/Cheque"],
        "scholarships": [
            "Merit Scholarship (Up to 50% tuition waiver)",
            "Sports Quota",
            "Government Schemes (SC/ST/OBC)"
        ]
    })


@app.route("/api/campus/facilities", methods=["GET"])
def get_facilities():
    """Get campus facilities for guest dashboard"""
    return jsonify({
        "facilities": [
            {
                "name": "Central Library",
                "description": "24/7 access with over 50,000 books and digital resources",
                "icon": "📚"
            },
            {
                "name": "Computer Labs",
                "description": "High-performance computing with latest software",
                "icon": "💻"
            },
            {
                "name": "Sports Complex",
                "description": "Indoor and outdoor sports facilities including gym",
                "icon": "🏃"
            },
            {
                "name": "Hostel",
                "description": "Separate hostels for boys and girls with mess",
                "icon": "🏠"
            },
            {
                "name": "Cafeteria",
                "description": "Hygienic food court with variety of cuisines",
                "icon": "🍽️"
            },
            {
                "name": "Medical Center",
                "description": "24/7 medical facility with ambulance service",
                "icon": "🏥"
            },
            {
                "name": "Wi-Fi Campus",
                "description": "High-speed internet across entire campus",
                "icon": "📡"
            },
            {
                "name": "Placement Cell",
                "description": "Dedicated placement assistance with top recruiters",
                "icon": "💼"
            }
        ]
    })


# =========================
# ANALYTICS API (CHART DATA)
# =========================
@app.route("/analytics", methods=["GET"])
def analytics():
    """Get comprehensive analytics data for charts"""
    return jsonify({
        "access_stats": get_access_stats(),
        "intrusion_stats": get_intrusion_stats(),
        "time_stats": get_time_period_stats(),
        "role_stats": get_role_stats(),
        "hourly_trends": get_hourly_trends(),
        "daily_trends": get_daily_trends(7)
    })


# =========================
# LOGIN TRENDS API
# =========================
@app.route("/analytics/trends", methods=["GET"])
def login_trends():
    """Get login trends for visualization"""
    days = request.args.get("days", 7, type=int)
    return jsonify({
        "daily_trends": get_daily_trends(days),
        "hourly_trends": get_hourly_trends()
    })


# =========================
# ANOMALY ANALYTICS API
# =========================
@app.route("/analytics/anomalies", methods=["GET"])
def anomaly_analytics():
    """Get anomaly statistics and recent anomalies"""
    limit = request.args.get("limit", 50, type=int)
    anomalies = get_recent_anomalies(limit)
    
    # Convert ObjectId to string for JSON serialization
    for anomaly in anomalies:
        anomaly["_id"] = str(anomaly["_id"])
        if "detected_at" in anomaly:
            anomaly["detected_at"] = anomaly["detected_at"].isoformat()
    
    return jsonify({
        "anomaly_stats": get_anomaly_stats(),
        "recent_anomalies": anomalies
    })


# =========================
# SUCCESS VS FAILURE ANALYSIS
# =========================
@app.route("/analytics/success-failure", methods=["GET"])
def success_failure_analysis():
    """Detailed success vs failure analysis"""
    access_stats = get_access_stats()
    
    total = sum([stat[1] for stat in access_stats])
    analysis = []
    
    for stat in access_stats:
        percentage = (stat[1] / total * 100) if total > 0 else 0
        analysis.append({
            "status": stat[0],
            "count": stat[1],
            "percentage": round(percentage, 2)
        })
    
    return jsonify({
        "total_logins": total,
        "breakdown": analysis,
        "role_distribution": get_role_stats()
    })


# =========================
# RECENT LOGS API
# =========================
@app.route("/logs", methods=["GET"])
def recent_logs():
    """Get recent login logs with optional filtering"""
    limit = request.args.get("limit", 100, type=int)
    access_filter = request.args.get("access", None)
    role_filter = request.args.get("role", None)
    
    logs = get_all_login_logs(limit)
    
    # Apply filters
    if access_filter:
        logs = [log for log in logs if log.get("access") == access_filter]
    
    if role_filter:
        logs = [log for log in logs if log.get("role") == role_filter]
    
    # Convert ObjectId and datetime for JSON serialization
    for log in logs:
        log["_id"] = str(log["_id"])
        if "timestamp" in log and hasattr(log["timestamp"], 'isoformat'):
            log["timestamp"] = log["timestamp"].isoformat()
        if "created_at" in log and hasattr(log["created_at"], 'isoformat'):
            log["created_at"] = log["created_at"].isoformat()
    
    return jsonify({"logs": logs, "count": len(logs)})


# =========================
# DETAILED STATS BY ROLE API
# =========================
@app.route("/analytics/by-role", methods=["GET"])
def analytics_by_role():
    """Get detailed analytics breakdown by role"""
    from database import get_login_logs_collection
    collection = get_login_logs_collection()
    
    # Get stats for each role
    pipeline = [
        {"$group": {
            "_id": {
                "role": "$role",
                "access": "$access"
            },
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id.role": 1}}
    ]
    
    results = list(collection.aggregate(pipeline))
    
    # Organize by role
    roles_data = {}
    for item in results:
        role = item["_id"]["role"]
        access = item["_id"]["access"]
        count = item["count"]
        
        if role not in roles_data:
            roles_data[role] = {"allowed": 0, "blocked": 0, "restricted": 0, "total": 0}
        
        roles_data[role][access.lower()] = count
        roles_data[role]["total"] += count
    
    return jsonify(roles_data)


# =========================
# AI CAMPUS CHAT PROXY (GROQ)
# =========================
@app.route("/api/campus/chat", methods=["POST"])
def campus_chat():
    """
    Proxy Groq API calls from the frontend.
    This avoids CORS issues when calling api.groq.com directly from the browser.
    """
    import requests as http_requests

    if not GROQ_API_KEY:
        return jsonify({"error": "AI chat is not configured. Set GROQ_API_KEY in .env."}), 503


    try:
        data = request.json
        messages = data.get("messages", [])
        model = data.get("model", "llama-3.3-70b-versatile")
        max_tokens = data.get("max_tokens", 600)
        temperature = data.get("temperature", 0.7)

        if not messages:
            return jsonify({"error": "No messages provided"}), 400

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        response = http_requests.post(
            GROQ_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
            },
            json=payload,
            timeout=30,
        )

        if response.status_code != 200:
            return jsonify({"error": f"Groq API error: {response.text}"}), response.status_code

        groq_data = response.json()
        reply = groq_data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return jsonify({"reply": reply})

    except http_requests.exceptions.Timeout:
        return jsonify({"error": "Request timed out. Please try again."}), 504
    except Exception as e:
        print(f"Chat proxy error: {e}")
        return jsonify({"error": str(e)}), 500


# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "False").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)

