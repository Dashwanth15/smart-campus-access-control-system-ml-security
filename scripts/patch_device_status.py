"""
patch_device_status.py
Fix: device dstatus must check user.is_blocked BEFORE it is used.
Currently is_blocked is computed at line 447 (AFTER the device loop at 402-435).
Fix: move is_blocked computation to before the device loop, then include it in dstatus.
"""

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
ROUTES = os.path.join(ROOT, "backend", "admin_routes.py")

with open(ROUTES, "r", encoding="utf-8") as f:
    src = f.read()

# ── OLD: is_blocked computed AFTER device loop, NOT used in dstatus ──────────
OLD = (
    "        # Build per-device list with enriched details\n"
    "        devices = []\n"
    "        for did in all_known:\n"
    "            if not did:\n"
    "                continue\n"
    "            dlog = device_by_id.get(did, {})\n"
    "            drisk = dlog.get(\"risk_score\") or _calc_risk(dlog)\n"
    "            dfailed = dlog.get(\"failed_attempts\", 0)\n"
    "            dintr   = dlog.get(\"intrusion_count\", 0)\n"
    "\n"
    "            if dlog.get(\"last_access\") == \"Blocked\" or dintr > 2:\n"
    "                dstatus = \"Blocked\"\n"
    "            elif dintr > 0 or dfailed > 1:\n"
    "                dstatus = \"Suspicious\"\n"
    "            else:\n"
    "                dstatus = \"Trusted\"\n"
)

# ── NEW: is_blocked computed FIRST, then used in dstatus ─────────────────────
NEW = (
    "        # Compute user-level block BEFORE the device loop so dstatus can use it\n"
    "        is_blocked = user.get(\"is_blocked\") or (\n"
    "            user.get(\"lockout_until\") and user[\"lockout_until\"] > now\n"
    "        )\n"
    "\n"
    "        # Build per-device list with enriched details\n"
    "        devices = []\n"
    "        for did in all_known:\n"
    "            if not did:\n"
    "                continue\n"
    "            dlog = device_by_id.get(did, {})\n"
    "            drisk = dlog.get(\"risk_score\") or _calc_risk(dlog)\n"
    "            dfailed = dlog.get(\"failed_attempts\", 0)\n"
    "            dintr   = dlog.get(\"intrusion_count\", 0)\n"
    "\n"
    "            # ── Single source of truth for device blocked status:\n"
    "            #    A device is Blocked if the OWNER's account is blocked\n"
    "            #    OR if the device's own login signals indicate a block.\n"
    "            if is_blocked or dlog.get(\"last_access\") == \"Blocked\" or dintr > 2:\n"
    "                dstatus = \"Blocked\"\n"
    "            elif dintr > 0 or dfailed > 1:\n"
    "                dstatus = \"Suspicious\"\n"
    "            else:\n"
    "                dstatus = \"Trusted\"\n"
)

if OLD not in src:
    print("[FAIL] Pattern not found — file may have already been patched or changed.")
    exit(1)

src = src.replace(OLD, NEW, 1)

# ── Remove the now-duplicate is_blocked block that was after the device loop ──
OLD2 = (
    "        # Is user account locked?\n"
    "        is_blocked = user.get(\"is_blocked\") or (\n"
    "            user.get(\"lockout_until\") and user[\"lockout_until\"] > now\n"
    "        )\n"
    "\n"
    "        last_ll_iso = None\n"
)
NEW2 = (
    "        # is_blocked already computed above (before device loop)\n"
    "\n"
    "        last_ll_iso = None\n"
)

if OLD2 not in src:
    print("[FAIL] Duplicate is_blocked block not found. Manual cleanup may be needed.")
else:
    src = src.replace(OLD2, NEW2, 1)
    print("[OK]  Removed duplicate is_blocked computation after device loop")

with open(ROUTES, "w", encoding="utf-8") as f:
    f.write(src)

print("[OK]  device dstatus now includes user.is_blocked check")
print("[OK]  is_blocked moved to before device loop")
print("\nDone. Restart the backend (python app.py) to apply.")
