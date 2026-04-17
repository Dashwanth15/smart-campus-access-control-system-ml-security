"""
Admin Routes - Admin Dashboard API  v2
Smart Campus Network Access Control
Device-Fingerprint based (no MAC addresses)
"""

import re
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from bson import ObjectId
from auth import token_required, role_required

admin_bp = Blueprint('admin', __name__)


def get_database():
    from database import get_database as db
    return db()


# ═══════════════════════════════════════════════════════════
# SHARED DATE RANGE RESOLVER
# ═══════════════════════════════════════════════════════════

def _resolve_date_range(args):
    """
    Parse date filter params from a request.args dict.
    Priority (highest wins):
      ?from / ?to          → explicit ISO range
      ?date  YYYY-MM-DD    → single day (00:00 – 23:59:59)
      ?week_start YYYY-MM-DD → Monday of week (Mon 00:00 – Sun 23:59:59)
      ?week  YYYY-Www      → ISO week (legacy, still supported)
      ?month YYYY-MM       → full calendar month

    Returns (date_from, date_to) as datetime objects, or (None, None).
    """
    from_raw    = args.get("from")
    to_raw      = args.get("to")
    single_date = args.get("date")
    week_start  = args.get("week_start")   # YYYY-MM-DD (Monday) ← new frontend
    week_param  = args.get("week")          # YYYY-Www            ← legacy
    month_param = args.get("month")         # YYYY-MM

    # 1. Explicit from/to
    if from_raw:
        df = datetime.fromisoformat(from_raw)
        dt = datetime.fromisoformat(to_raw) if to_raw else None
        return df, dt

    # 2. Single date  → [00:00, 23:59:59]
    if single_date:
        try:
            d = datetime.strptime(single_date, "%Y-%m-%d")
            return (
                d.replace(hour=0, minute=0, second=0, microsecond=0),
                d.replace(hour=23, minute=59, second=59, microsecond=999000),
            )
        except ValueError:
            pass

    # 3. week_start (Monday date)  → [Mon 00:00, Sun 23:59:59]
    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d").replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            we = ws + timedelta(days=6, hours=23, minutes=59, seconds=59,
                                microseconds=999000)
            return ws, we
        except ValueError:
            pass

    # 4. ISO week string  → [Mon 00:00, Sun 23:59:59]
    if week_param:
        try:
            year_str, week_str = week_param.split('-W')
            year, week = int(year_str), int(week_str)
            ws = datetime.strptime(f"{year}-W{week:02d}-1", "%G-W%V-%u").replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            we = ws + timedelta(days=6, hours=23, minutes=59, seconds=59,
                                microseconds=999000)
            return ws, we
        except (ValueError, AttributeError):
            pass

    # 5. Month  → [1st 00:00, last-day 23:59:59]
    if month_param:
        try:
            year, month = map(int, month_param.split('-'))
            month_start = datetime(year, month, 1, 0, 0, 0)
            if month == 12:
                month_end = datetime(year + 1, 1, 1) - timedelta(microseconds=1)
            else:
                month_end = datetime(year, month + 1, 1) - timedelta(microseconds=1)
            return month_start, month_end
        except (ValueError, AttributeError):
            pass

    return None, None


# ═══════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/users', methods=['GET'])
@token_required
@role_required('Admin')
def get_all_users():
    """Get all users with their access status. Supports ?role= and ?search= filters."""
    db = get_database()

    role_filter   = request.args.get("role")
    search_filter = request.args.get("search", "").strip()

    query = {"password_hash": {"$exists": False}}  # project-safe placeholder
    mongo_filter = {}

    if role_filter and role_filter != 'all':
        mongo_filter["role"] = role_filter

    if search_filter:
        pattern = re.compile(re.escape(search_filter), re.IGNORECASE)
        mongo_filter["$or"] = [
            {"name":     {"$regex": pattern}},
            {"email":    {"$regex": pattern}},
            {"username": {"$regex": pattern}},
        ]

    users = list(db.users.find(mongo_filter, {"password_hash": 0}))

    for user in users:
        user["_id"] = str(user["_id"])
        if "created_at" in user and hasattr(user["created_at"], 'isoformat'):
            user["created_at"] = user["created_at"].isoformat()
        if "lockout_until" in user and hasattr(user.get("lockout_until"), 'isoformat'):
            user["lockout_until"] = user["lockout_until"].isoformat()
        # Count known devices
        user["device_count"] = len(user.get("known_devices", user.get("mac_addresses", [])))
        # Remove raw device arrays from list view for privacy
        user.pop("known_devices", None)
        user.pop("mac_addresses", None)

    return jsonify({"users": users, "count": len(users)})


@admin_bp.route('/api/admin/users/<user_id>', methods=['GET'])
@token_required
@role_required('Admin')
def get_user_details(user_id):
    """Get detailed user information"""
    db = get_database()

    try:
        user = db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])

    # Get user's login history
    logs = list(db.login_logs.find(
        {"username": user.get("email")}).sort("timestamp", -1).limit(20))
    for log in logs:
        log["_id"] = str(log["_id"])
        if "timestamp" in log and hasattr(log["timestamp"], 'isoformat'):
            log["timestamp"] = log["timestamp"].isoformat()

    return jsonify({"user": user, "login_history": logs})


@admin_bp.route('/api/admin/users/<user_id>/unlock', methods=['POST'])
@token_required
@role_required('Admin')
def unlock_user(user_id):
    """Unlock a blocked user account"""
    db = get_database()

    try:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "failed_attempts": 0,
                    "lockout_until": None,
                    "is_blocked": False
                },
                "$unset": {
                    "blocked_at": "",
                    "blocked_reason": "",
                    "blocked_by": ""
                }
            }
        )
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    if result.modified_count == 0:
        return jsonify({"error": "User not found or already unlocked"}), 404

    return jsonify({"message": "User account unlocked successfully"})


@admin_bp.route('/api/admin/users/<user_id>/block', methods=['POST'])
@token_required
@role_required('Admin')
def block_user(user_id):
    """Block a user account"""
    db = get_database()
    data = request.json or {}
    duration = int(data.get("duration_hours", 24))

    try:
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "is_blocked":    True,
                    "lockout_until": datetime.utcnow() + timedelta(hours=duration),
                    "blocked_by":    "admin",
                    "blocked_at":    datetime.utcnow()
                }
            }
        )
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    if result.modified_count == 0:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": f"User blocked for {duration} hours"})


# ═══════════════════════════════════════════════════════════
# ACCESS LOGS
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/access-logs', methods=['GET'])
@token_required
@role_required('Admin')
def get_access_logs():
    """Get detailed access logs with filtering.
    Supports: ?role= ?access= ?search= ?date= ?week_start= ?week= ?month= ?limit=
    """
    db = get_database()

    limit         = request.args.get("limit", 100, type=int)
    role_filter   = request.args.get("role")
    access_filter = request.args.get("access")
    search_filter = request.args.get("search", "").strip()

    date_from, date_to = _resolve_date_range(request.args)

    query = {}
    if role_filter and role_filter != 'all':
        query["role"] = role_filter
    if access_filter:
        query["access"] = access_filter
    if date_from:
        query.setdefault("timestamp", {})["$gte"] = date_from
    if date_to:
        query.setdefault("timestamp", {})["$lte"] = date_to
    if search_filter:
        pattern = re.compile(re.escape(search_filter), re.IGNORECASE)
        query["$or"] = [
            {"username":     {"$regex": pattern}},
            {"device_id":    {"$regex": pattern}},
            {"browser_info": {"$regex": pattern}},
            {"ip_address":   {"$regex": pattern}},
        ]

    # ── DEBUG ───────────────────────────────────────────────────────
    print(f"[DEBUG /access-logs] date_from={date_from}  date_to={date_to}  "
          f"role={role_filter}  search='{search_filter}'  params={dict(request.args)}")

    logs = list(db.login_logs.find(query).sort("timestamp", -1).limit(limit))
    print(f"[DEBUG /access-logs] → {len(logs)} records returned")

    for log in logs:
        log["_id"] = str(log["_id"])
        if "timestamp" in log and hasattr(log["timestamp"], 'isoformat'):
            log["timestamp"] = log["timestamp"].isoformat()

    return jsonify({"logs": logs, "count": len(logs)})


# ═══════════════════════════════════════════════════════════
# DEVICE INTELLIGENCE  (replaces MAC Address Management)
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/devices', methods=['GET'])
@token_required
@role_required('Admin')
def get_device_intelligence():
    """
    Device Intelligence Dashboard — groups by USER not by device_id.
    Returns every registered user with their known devices and login history.
    Supports: ?role= ?search= ?date= ?week_start= ?week= ?month=
    """
    db = get_database()

    role_filter   = request.args.get("role")
    search_filter = request.args.get("search", "").strip()

    # Use the shared resolver — returns datetime objects (or None)
    date_from, date_to = _resolve_date_range(request.args)
    log_date_filter    = {}
    if date_from: log_date_filter["$gte"] = date_from
    if date_to:   log_date_filter["$lte"] = date_to

    print(f"[DEBUG /devices] date_from={date_from}  date_to={date_to}  "
          f"role={role_filter}  search='{search_filter}'  params={dict(request.args)}")

    # ── 1. Get ALL users from the users collection ──────────────
    user_query = {}
    if role_filter and role_filter != 'all':
        user_query["role"] = role_filter
    all_users = list(db.users.find(user_query, {"password_hash": 0}))

    # ── 2. Build per-user login stats from login_logs ──────────
    log_match = {}
    if log_date_filter:
        log_match["timestamp"] = log_date_filter

    log_pipeline = [
        *([{"$match": log_match}] if log_match else []),
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$username",                               # group by email
            "last_login":      {"$first": "$timestamp"},
            "last_ip":         {"$first": "$ip_address"},
            "last_browser":    {"$first": "$browser_info"},
            "last_device_id":  {"$first": "$device_id"},
            "last_access":     {"$first": "$access"},
            "last_risk_score": {"$first": "$risk_score"},
            "total_logins":    {"$sum": 1},
            "failed_attempts": {"$sum": {"$cond": [{"$ne": ["$access", "Allowed"]}, 1, 0]}},
            "intrusion_count": {"$sum": {"$cond": ["$intrusion", 1, 0]}},
            "ip_changes":      {"$sum": {"$cond": [{"$eq": ["$ip_change",      1]}, 1, 0]}},
            "browser_changes": {"$sum": {"$cond": [{"$eq": ["$browser_change", 1]}, 1, 0]}},
            # Collect all unique device_ids this user has logged in with
            "all_device_ids":  {"$addToSet": "$device_id"},
        }},
    ]
    log_stats_raw = list(db.login_logs.aggregate(log_pipeline))
    log_by_email  = {item["_id"]: item for item in log_stats_raw}

    # ── Fix: $first can return null if the latest log had no ip_address.
    #    Run a separate pass that skips null/empty IPs and back-fills any
    #    gaps so the fallback in the device loop always has a real value.
    _ip_pipeline = [
        {"$match": {"ip_address":   {"$nin": [None, "", "unknown"]}}},
        {"$sort":  {"timestamp": -1}},
        {"$group": {"_id": "$username",
                    "last_ip":      {"$first": "$ip_address"},
                    "last_browser": {"$first": "$browser_info"}}},
    ]
    for _item in db.login_logs.aggregate(_ip_pipeline):
        _entry = log_by_email.get(_item["_id"])
        if _entry is not None:
            if not _entry.get("last_ip"):
                _entry["last_ip"]      = _item.get("last_ip")
            if not _entry.get("last_browser"):
                _entry["last_browser"] = _item.get("last_browser")
        else:
            # User has logs with valid IP but none matched the date filter
            log_by_email[_item["_id"]] = _item

    # ── 3. Per-device detail lookup (latest log per device_id) ──
    # IMPORTANT: apply the SAME date filter here so device counts are dynamic
    dev_match = {"device_id": {"$exists": True, "$ne": None}}
    if log_date_filter:
        dev_match["timestamp"] = log_date_filter

    device_pipeline = [
        {"$match": dev_match},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id":          "$device_id",
            "username":     {"$first": "$username"},
            "browser_info": {"$first": "$browser_info"},
            "ip_address":   {"$first": "$ip_address"},
            "last_login":   {"$first": "$timestamp"},
            "last_access":  {"$first": "$access"},
            "risk_score":   {"$first": "$risk_score"},
            "total_logins": {"$sum": 1},
            "intrusion_count": {"$sum": {"$cond": ["$intrusion", 1, 0]}},
            "failed_attempts": {"$sum": {"$cond": [{"$ne": ["$access", "Allowed"]}, 1, 0]}},
            "ip_changes":      {"$sum": {"$cond": [{"$eq": ["$ip_change",      1]}, 1, 0]}},
            "browser_changes": {"$sum": {"$cond": [{"$eq": ["$browser_change", 1]}, 1, 0]}},
        }},
    ]
    device_details_raw = list(db.login_logs.aggregate(device_pipeline))
    device_by_id = {item["_id"]: item for item in device_details_raw}
    print(f"[DEBUG /devices] → {len(device_details_raw)} unique devices in filtered range")

    # ── 4. Assemble result — one entry per USER ─────────────────
    result = []
    now    = datetime.utcnow()

    for user in all_users:
        email = user.get("email", "")
        role  = user.get("role",  "Unknown")
        stats = log_by_email.get(email, {})

        # When a date filter is active, ONLY show devices seen in the filtered logs.
        # Without a filter, also include devices registered in the users collection.
        known_from_log = set(d for d in stats.get("all_device_ids", []) if d)
        if log_date_filter:
            # Filtered view — only devices active in the selected period
            all_known = known_from_log
        else:
            # Unfiltered view — all known registered devices
            known_from_db = set(user.get("known_devices", user.get("mac_addresses", [])))
            all_known = known_from_db | known_from_log

        # Compute user-level block BEFORE the device loop so dstatus can use it
        is_blocked = user.get("is_blocked") or (
            user.get("lockout_until") and user["lockout_until"] > now
        )

        # Build per-device list with enriched details
        devices = []
        for did in all_known:
            if not did:
                continue
            dlog = device_by_id.get(did, {})
            drisk = dlog.get("risk_score") or _calc_risk(dlog)
            dfailed = dlog.get("failed_attempts", 0)
            dintr   = dlog.get("intrusion_count", 0)

            # ── Single source of truth for device blocked status:
            #    A device is Blocked if the OWNER's account is blocked
            #    OR if the device's own login signals indicate a block.
            if is_blocked or dlog.get("last_access") == "Blocked" or dintr > 2:
                dstatus = "Blocked"
            elif dintr > 0 or dfailed > 1:
                dstatus = "Suspicious"
            else:
                dstatus = "Trusted"

            # ── last_login: prefer device-specific log, else fall back to
            #    user-level last login (covers MAC-style IDs with no login_logs)
            dll = None
            if dlog.get("last_login"):
                try:    dll = dlog["last_login"].isoformat()
                except: dll = str(dlog["last_login"])
            elif stats.get("last_login"):
                try:    dll = stats["last_login"].isoformat()
                except: dll = str(stats["last_login"])

            devices.append({
                "device_id":       did,
                "short_id":        did[:14] + "…" if len(did) > 14 else did,
                # Prefer device-level data; fall back to user-level when device
                # has no login_log entries (e.g. legacy MAC-style device IDs).
                # Triple-or guarantees a string — stats.get() can return None
                # when the aggregation key exists but the value is null.
                "browser_info":    dlog.get("browser_info") or stats.get("last_browser") or "Unknown",
                "ip_address":      dlog.get("ip_address")   or stats.get("last_ip")      or "N/A",
                "last_login":      dll,
                "total_logins":    dlog.get("total_logins",    0),
                "failed_attempts": dfailed,
                "intrusion_count": dintr,
                "ip_changes":      dlog.get("ip_changes",      0),
                "browser_changes": dlog.get("browser_changes", 0),
                "risk_score":      drisk,
                "status":          dstatus,
            })

        # Overall user status = worst device status
        if any(d["status"] == "Blocked"    for d in devices): user_status = "Blocked"
        elif any(d["status"] == "Suspicious" for d in devices): user_status = "Suspicious"
        elif devices:                                            user_status = "Trusted"
        else:                                                    user_status = "No Activity"

        # Overall risk = max device risk
        user_risk = max((d["risk_score"] for d in devices), default=0)

        # is_blocked already computed above (before device loop)

        last_ll_iso = None
        if stats.get("last_login"):
            try:    last_ll_iso = stats["last_login"].isoformat()
            except: last_ll_iso = str(stats["last_login"])

        result.append({
            "_id":             str(user["_id"]),   # needed for Block/Unlock actions
            "username":        email,
            "name":            user.get("name", ""),
            "role":            role,
            "is_blocked":      bool(is_blocked),
            "total_logins":    stats.get("total_logins",    0),
            "last_login":      last_ll_iso,
            "last_ip":         stats.get("last_ip",         "N/A"),
            "last_browser":    stats.get("last_browser",    "Unknown"),
            "last_device_id":  stats.get("last_device_id", ""),
            "failed_attempts": stats.get("failed_attempts", 0),
            "intrusion_count": stats.get("intrusion_count", 0),
            "risk_score":      user_risk,
            "status":          user_status,
            "device_count":    len(devices),
            "devices":         devices,
        })

    # ── Optional: apply search filter on the assembled result ──
    if search_filter:
        pat = re.compile(re.escape(search_filter), re.IGNORECASE)
        def _matches(u):
            if pat.search(u.get("username", "") or ""): return True
            if pat.search(u.get("name", "") or ""):     return True
            if pat.search(u.get("last_browser", "") or ""): return True
            if pat.search(u.get("last_ip", "") or ""):  return True
            # Also match any device_id in devices list
            for d in u.get("devices", []):
                if pat.search(d.get("device_id", "") or ""):     return True
                if pat.search(d.get("browser_info", "") or ""):  return True
                if pat.search(d.get("ip_address",  "") or ""):   return True
            return False
        result = [u for u in result if _matches(u)]

    # Sort: Blocked first, then Suspicious, then Trusted, then No Activity
    _order = {"Blocked": 0, "Suspicious": 1, "Trusted": 2, "No Activity": 3}
    result.sort(key=lambda u: _order.get(u["status"], 4))

    return jsonify({"users": result, "count": len(result)})


@admin_bp.route('/api/admin/devices/<path:device_id>/revoke', methods=['POST'])
@token_required
@role_required('Admin')
def revoke_device(device_id):
    """Remove a device from all users' known_devices lists"""
    db = get_database()
    result = db.users.update_many(
        {"known_devices": device_id},
        {"$pull": {"known_devices": device_id}}
    )
    return jsonify({
        "message": f"Device revoked from {result.modified_count} account(s)",
        "device_id": device_id
    })


@admin_bp.route('/api/admin/devices/<path:device_id>/unblock', methods=['PATCH'])
@token_required
@role_required('Admin')
def unblock_device(device_id):
    """
    Unblock a device by clearing its adverse login signals and re-trusting it.
    Accepts optional { userId } in request body — when provided (sent by the
    Blocked Devices page), uses it to locate the user directly by _id, which
    is 100% reliable regardless of whether device_id exists in login_logs or
    known_devices (e.g. legacy MAC-style IDs).
    """
    db = get_database()
    data = request.json or {}
    user_id_hint = data.get("userId", "")

    # 1. Clear adverse signals in login_logs for this specific device
    db.login_logs.update_many(
        {"device_id": device_id},
        {"$set": {
            "intrusion":   False,
            "risk_score":  0,
            "access":      "Allowed",
        }}
    )

    # 2. Resolve owners — prefer the userId hint from the frontend (direct _id
    #    lookup mirrors what unlock_user does and always works), fall back to
    #    device-based lookup for API callers that don't supply userId.
    owners = set()
    if user_id_hint:
        try:
            hint_user = db.users.find_one({"_id": ObjectId(user_id_hint)}, {"email": 1})
            if hint_user and hint_user.get("email"):
                owners.add(hint_user["email"])
        except Exception:
            pass

    if not owners:
        # Fallback: search login_logs and known_devices by device_id
        owners_from_logs  = set(db.login_logs.distinct("username", {"device_id": device_id}))
        owners_from_known = {
            u["email"]
            for u in db.users.find({"known_devices": device_id}, {"email": 1})
            if u.get("email")
        }
        owners = owners_from_logs | owners_from_known

    for email in owners:
        # a) Clear user-level block flags
        db.users.update_one(
            {"email": email},
            {
                "$addToSet": {"known_devices": device_id},
                "$set": {
                    "is_blocked":      False,
                    "lockout_until":   None,
                    "failed_attempts": 0,
                },
                "$unset": {
                    "blocked_at":     "",
                    "blocked_by":     "",
                    "blocked_reason": "",
                }
            }
        )
        # b) Clear ALL adverse login_log signals for EVERY device the user has.
        #    Critical: a user may own multiple device IDs (MAC + fingerprint).
        #    Clearing only the target device_id leaves other device IDs with
        #    stale "Blocked" / intrusion signals, so they keep reappearing in
        #    the Blocked Devices list even after unblocking.
        db.login_logs.update_many(
            {"username": email},
            {"$set": {
                "intrusion":  False,
                "risk_score": 0,
                "access":     "Allowed",
            }}
        )

    return jsonify({
        "message": "Device unblocked and marked as Trusted",
        "device_id": device_id,
        "owners_updated": len(owners)
    })


def _calc_risk(d):
    """Fallback risk score calculation when ML score not stored"""
    score = 0
    score += min(d.get("failed_attempts", 0) * 15, 40)
    score += min(d.get("intrusion_count", 0) * 20, 40)
    score += min(d.get("ip_changes", 0) * 5, 10)
    score += min(d.get("browser_changes", 0) * 5, 10)
    return min(score, 100)


# ═══════════════════════════════════════════════════════════
# ANALYTICS OVERVIEW
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/analytics/overview', methods=['GET'])
@token_required
@role_required('Admin')
def get_admin_overview():
    """Admin dashboard overview statistics"""
    db = get_database()

    user_stats = list(db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]))

    now = datetime.utcnow()
    blocked_users = db.users.count_documents({
        "$or": [
            {"is_blocked": True},
            {"lockout_until": {"$gt": now}}
        ]
    })
    total_users  = db.users.count_documents({})
    active_users = total_users - blocked_users

    today_start  = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_stats  = list(db.login_logs.aggregate([
        {"$match": {"timestamp": {"$gte": today_start}}},
        {"$group": {"_id": "$access", "count": {"$sum": 1}}}
    ]))

    intrusion_count = db.login_logs.count_documents({
        "intrusion": True,
        "timestamp": {"$gte": today_start}
    })

    # Unknown device attempts (replacing unknown MAC)
    unknown_device_count = db.login_logs.count_documents({
        "device_known": False,
        "timestamp": {"$gte": today_start}
    })

    # Unique devices today
    unique_devices_today = len(db.login_logs.distinct(
        "device_id", {"timestamp": {"$gte": today_start}}
    ))

    # High-risk logins today
    high_risk_today = db.login_logs.count_documents({
        "timestamp": {"$gte": today_start},
        "risk_score": {"$gte": 60}
    })

    return jsonify({
        "user_stats":           {item["_id"]: item["count"] for item in user_stats},
        "total_users":          total_users,
        "blocked_users":        blocked_users,
        "locked_accounts":      blocked_users,
        "active_users":         active_users,
        "intrusions_detected":  intrusion_count,
        "today": {
            "access_stats":          {item["_id"]: item["count"] for item in today_stats},
            "intrusion_attempts":    intrusion_count,
            "unknown_device_attempts": unknown_device_count,
            "unique_devices":        unique_devices_today,
            "high_risk_logins":      high_risk_today,
        }
    })


@admin_bp.route('/api/admin/analytics/timeline', methods=['GET'])
@token_required
@role_required('Admin')
def get_access_timeline():
    """Access timeline for visualization"""
    db = get_database()
    days       = request.args.get("days", 7, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {"timestamp": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "hour": {"$hour": "$timestamp"}
            },
            "total":      {"$sum": 1},
            "allowed":    {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
            "blocked":    {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
            "intrusions": {"$sum": {"$cond": ["$intrusion", 1, 0]}}
        }},
        {"$sort": {"_id.date": 1, "_id.hour": 1}}
    ]

    timeline = list(db.login_logs.aggregate(pipeline))
    result = [{
        "date":       item["_id"]["date"],
        "hour":       item["_id"]["hour"],
        "total":      item["total"],
        "allowed":    item["allowed"],
        "blocked":    item["blocked"],
        "intrusions": item["intrusions"]
    } for item in timeline]

    return jsonify({"timeline": result})


# ═══════════════════════════════════════════════════════════
# ANALYTICS SUMMARY  (used by front-end SummaryStrip)
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/analytics/summary', methods=['GET'])
@token_required
@role_required('Admin')
def get_analytics_summary():
    """
    Aggregate summary for the selected date/role/search filter set.
    Returns: total_accesses, unique_users, unique_devices, high_risk_attempts
    Supports: ?date= ?week_start= ?week= ?month= ?role= ?search=
    Uses the shared _resolve_date_range so ALL date params are handled identically
    to the access-logs endpoint — week_start, date, week, and month all work.
    """
    db = get_database()

    role_filter   = request.args.get("role")
    search_filter = request.args.get("search", "").strip()

    # Use the shared resolver — handles date, week_start, week, month, from/to
    date_from, date_to = _resolve_date_range(request.args)

    print(f"[DEBUG /analytics/summary] date_from={date_from}  date_to={date_to}  "
          f"role={role_filter}  search='{search_filter}'  params={dict(request.args)}")

    # ── Build mongo query ───────────────────────────────────────
    query = {}
    if role_filter and role_filter != 'all':
        query["role"] = role_filter
    if date_from:
        query.setdefault("timestamp", {})["$gte"] = date_from
    if date_to:
        query.setdefault("timestamp", {})["$lte"] = date_to
    if search_filter:
        pattern = re.compile(re.escape(search_filter), re.IGNORECASE)
        query["$or"] = [
            {"username":     {"$regex": pattern}},
            {"device_id":    {"$regex": pattern}},
            {"browser_info": {"$regex": pattern}},
            {"ip_address":   {"$regex": pattern}},
        ]

    # ── Aggregation — derived entirely from login_logs ──────────
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_accesses":     {"$sum": 1},
            "unique_users":       {"$addToSet": "$username"},
            "unique_devices":     {"$addToSet": "$device_id"},
            "high_risk_attempts": {"$sum": {"$cond": [{"$gte": ["$risk_score", 70]}, 1, 0]}},
        }}
    ]
    agg = list(db.login_logs.aggregate(pipeline))

    if agg:
        row = agg[0]
        # Filter out null / empty device_ids from distinct count
        raw_devices = [d for d in row.get("unique_devices", []) if d]
        summary = {
            "total_accesses":     row.get("total_accesses", 0),
            "unique_users":       len(row.get("unique_users", [])),
            "unique_devices":     len(raw_devices),
            "high_risk_attempts": row.get("high_risk_attempts", 0),
        }
    else:
        summary = {"total_accesses": 0, "unique_users": 0, "unique_devices": 0, "high_risk_attempts": 0}

    print(f"[DEBUG /analytics/summary] → {summary}")

    # Include date range info for display
    summary["date_range"] = {
        "from": date_from.isoformat() if date_from else None,
        "to":   date_to.isoformat()   if date_to   else None,
    }

    return jsonify(summary)


# ══ Legacy MAC endpoint redirect (backward compat) ══════════════
@admin_bp.route('/api/admin/mac-addresses', methods=['GET'])
@token_required
@role_required('Admin')
def mac_addresses_legacy():
    """Legacy endpoint — redirects to device intelligence"""
    return get_device_intelligence()


# ═══════════════════════════════════════════════════════════
# ANALYTICS — FILTERED  (single source of truth)
# ═══════════════════════════════════════════════════════════

@admin_bp.route('/api/admin/analytics/filtered', methods=['GET'])
@token_required
@role_required('Admin')
def get_filtered_analytics():
    """
    Full analytics dashboard data — ALL derived from filtered login_logs.
    Supports: ?date= ?week_start= ?week= ?month= ?role=

    Returns:
      total_logins, authorized, blocked,
      role_distribution (per role: total/allowed/blocked),
      trend_data (hourly for day, daily for week/month),
      access_distribution (Allowed/Blocked counts),
      high_risk
    """
    db = get_database()

    role_filter = request.args.get("role")
    date_from, date_to = _resolve_date_range(request.args)

    print(f"[DEBUG /analytics/filtered] date_from={date_from}  date_to={date_to}  role={role_filter}")

    # ── Base match query ─────────────────────────────────────────
    match = {}
    if date_from:
        match.setdefault("timestamp", {})["$gte"] = date_from
    if date_to:
        match.setdefault("timestamp", {})["$lte"] = date_to
    if role_filter and role_filter != 'all':
        match["role"] = role_filter

    # ── 1. Top-level summary ────────────────────────────────────
    summary_pipeline = [
        {"$match": match},
        {"$group": {
            "_id": None,
            "total":     {"$sum": 1},
            "allowed":   {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
            "blocked":   {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
            "high_risk": {"$sum": {"$cond": [{"$gte": ["$risk_score", 70]}, 1, 0]}},
            "intrusions":{"$sum": {"$cond": ["$intrusion", 1, 0]}},
        }}
    ]
    summary_raw = list(db.login_logs.aggregate(summary_pipeline))
    summary = summary_raw[0] if summary_raw else {}
    total_logins = summary.get("total",     0)
    authorized   = summary.get("allowed",   0)
    blocked      = summary.get("blocked",   0)
    high_risk    = summary.get("high_risk", 0)
    intrusions   = summary.get("intrusions",0)

    # ── 2. Role distribution ────────────────────────────────────
    role_pipeline = [
        {"$match": match},
        {"$group": {
            "_id":     "$role",
            "total":   {"$sum": 1},
            "allowed": {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
            "blocked": {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
        }}
    ]
    role_raw = list(db.login_logs.aggregate(role_pipeline))
    role_distribution = {
        r["_id"]: {
            "total":   r["total"],
            "allowed": r["allowed"],
            "blocked": r["blocked"],
        }
        for r in role_raw if r["_id"]
    }

    # ── 3. Trend data ───────────────────────────────────────────
    # Decide granularity: hourly for single-day, daily otherwise
    single_day = bool(request.args.get("date"))
    if single_day:
        # Hourly buckets: 00–23
        trend_pipeline = [
            {"$match": match},
            {"$group": {
                "_id": {"$hour": "$timestamp"},
                "total":   {"$sum": 1},
                "allowed": {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
                "blocked": {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
            }},
            {"$sort": {"_id": 1}},
        ]
        trend_raw = list(db.login_logs.aggregate(trend_pipeline))
        # Fill all 24 hours with zeros
        hourly = {i: {"total": 0, "allowed": 0, "blocked": 0} for i in range(24)}
        for row in trend_raw:
            h = row["_id"]
            hourly[h] = {"total": row["total"], "allowed": row["allowed"], "blocked": row["blocked"]}
        trend_data = [
            {"label": f"{h:02d}:00", "total": hourly[h]["total"],
             "allowed": hourly[h]["allowed"], "blocked": hourly[h]["blocked"]}
            for h in range(24)
        ]
        trend_type = "hourly"
    else:
        # Daily buckets
        trend_pipeline = [
            {"$match": match},
            {"$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                "total":   {"$sum": 1},
                "allowed": {"$sum": {"$cond": [{"$eq": ["$access", "Allowed"]}, 1, 0]}},
                "blocked": {"$sum": {"$cond": [{"$eq": ["$access", "Blocked"]}, 1, 0]}},
            }},
            {"$sort": {"_id": 1}},
        ]
        trend_raw = list(db.login_logs.aggregate(trend_pipeline))
        trend_data = [
            {"label": row["_id"], "total": row["total"],
             "allowed": row["allowed"], "blocked": row["blocked"]}
            for row in trend_raw
        ]
        trend_type = "daily"

    print(f"[DEBUG /analytics/filtered] → total={total_logins} allowed={authorized} blocked={blocked} trend_type={trend_type} trend_points={len(trend_data)}")

    return jsonify({
        "total_logins":      total_logins,
        "authorized":        authorized,
        "blocked":           blocked,
        "high_risk":         high_risk,
        "intrusions":        intrusions,
        "role_distribution": role_distribution,
        "access_distribution": {
            "Allowed": authorized,
            "Blocked": blocked,
        },
        "trend_data":  trend_data,
        "trend_type":  trend_type,
        "filter_applied": {
            "date_from": date_from.isoformat() if date_from else None,
            "date_to":   date_to.isoformat()   if date_to   else None,
            "role":      role_filter,
        }
    })
