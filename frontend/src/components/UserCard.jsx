/**
 * UserCard.jsx
 * Collapsible card showing one user's device intelligence.
 * Default: compact row — email, role, status, device count, risk.
 * Expanded: full device list with per-device details.
 */
import { useState } from 'react';
import './device-dashboard.css';

// ── Small helpers ────────────────────────────────────────────────
const STATUS_MAP = {
    Trusted:      { bg: 'rgba(16,185,129,.14)', border: 'rgba(16,185,129,.35)', color: '#34d399', icon: '✅' },
    Suspicious:   { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)', color: '#fbbf24', icon: '⚠️' },
    Blocked:      { bg: 'rgba(239,68,68,.12)',  border: 'rgba(239,68,68,.3)',   color: '#f87171', icon: '🚫' },
    'No Activity':{ bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.2)', color: '#94a3b8', icon: '💤' },
};

const ROLE_CLASS = {
    admin:   'uc-role--admin',
    student: 'uc-role--student',
    faculty: 'uc-role--faculty',
    guest:   'uc-role--guest',
};

function fmt(d) {
    if (!d) return 'Never';
    const dt = new Date(d);
    return dt.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function RiskMini({ score = 0 }) {
    const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981';
    return (
        <div className="uc-risk-mini" title={`Risk: ${score}/100`}>
            <div className="uc-risk-bg">
                <div className="uc-risk-fill" style={{ width: `${score}%`, background: color }} />
            </div>
            <span style={{ color, fontWeight: 700, fontSize: '.7rem', minWidth: 22 }}>{score}</span>
        </div>
    );
}

// ── Single device row inside expanded card ───────────────────────
function DeviceRow({ device }) {
    const badge = STATUS_MAP[device.status] || STATUS_MAP.Trusted;
    return (
        <div className="uc-device-row">
            {/* Left: device ID + browser */}
            <div className="uc-dr-left">
                <span className="uc-dr-id" title={device.device_id}>
                    🔑 {device.short_id}
                </span>
                <span className="uc-dr-browser">
                    {device.browser_info || 'Unknown browser'}
                </span>
            </div>

            {/* Middle: meta chips */}
            <div className="uc-dr-meta">
                <span className="uc-dr-chip" title="IP address">
                    🌐 {device.ip_address || 'N/A'}
                </span>
                <span className="uc-dr-chip" title="Last login">
                    🕒 {fmt(device.last_login)}
                </span>
                <span className="uc-dr-chip" title="Total logins">
                    📊 {device.total_logins} logins
                </span>
            </div>

            {/* Right: risk + status */}
            <div className="uc-dr-right">
                <RiskMini score={device.risk_score || 0} />
                <span className="uc-dr-status"
                      style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                    {badge.icon} {device.status}
                </span>
            </div>
        </div>
    );
}

// ── Main UserCard component ──────────────────────────────────────
export default function UserCard({ user, onRevoke }) {
    const [expanded, setExpanded] = useState(false);

    const badge     = STATUS_MAP[user.status] || STATUS_MAP.Trusted;
    const roleClass = ROLE_CLASS[user.role?.toLowerCase()] || '';
    const initial   = (user.name || user.username || '?').charAt(0).toUpperCase();

    return (
        <div className={`uc-card ${expanded ? 'uc-card--open' : ''}`}
             style={{ borderColor: expanded ? badge.border : undefined }}>

            {/* ── Compact header (always visible) ─────────────── */}
            <div className="uc-header" onClick={() => setExpanded(v => !v)}
                 role="button" tabIndex={0}
                 onKeyDown={e => e.key === 'Enter' && setExpanded(v => !v)}>

                {/* Avatar */}
                <div className="uc-avatar" style={{
                    background: `linear-gradient(135deg, ${badge.color}55, ${badge.color}22)`
                }}>
                    {initial}
                </div>

                {/* Identity */}
                <div className="uc-identity">
                    <span className="uc-name" title={user.username}>
                        {user.name || user.username}
                    </span>
                    <span className="uc-email" title={user.username}>{user.username}</span>
                </div>

                {/* Role badge */}
                <span className={`uc-role ${roleClass}`}>{user.role}</span>

                {/* Device count */}
                <span className="uc-devcount" title={`${user.device_count} device(s)`}>
                    📱 {user.device_count}
                </span>

                {/* Risk mini-bar */}
                <div className="uc-risk-wrap">
                    <RiskMini score={user.risk_score || 0} />
                </div>

                {/* Status */}
                <span className="uc-status-pill"
                      style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                    {badge.icon} {user.status}
                </span>

                {/* Last login */}
                <span className="uc-last-login">{fmt(user.last_login)}</span>

                {/* Chevron */}
                <span className={`uc-chevron ${expanded ? 'uc-chevron--up' : ''}`}>⌄</span>
            </div>

            {/* ── Expanded device list ─────────────────────────── */}
            <div className={`uc-body ${expanded ? 'uc-body--open' : ''}`}>
                {user.devices && user.devices.length > 0 ? (
                    <div className="uc-device-list">
                        <div className="uc-device-list-header">
                            <span>Device Fingerprint</span>
                            <span>Browser / OS</span>
                            <span>IP · Last Login · Logins</span>
                            <span>Risk · Status</span>
                        </div>
                        {user.devices.map((d, i) => (
                            <DeviceRow key={d.device_id || i} device={d} />
                        ))}
                    </div>
                ) : (
                    <div className="uc-no-devices">
                        <span>💤</span> No device activity recorded for this user yet.
                    </div>
                )}

                {/* Aggregate stats row */}
                <div className="uc-stats-row">
                    {[
                        { icon: '📊', val: user.total_logins,    label: 'Total Logins'  },
                        { icon: '🌐', val: user.last_ip || 'N/A', label: 'Last IP'       },
                        { icon: '🖥️', val: user.last_browser,    label: 'Last Browser'  },
                        { icon: '⚠️', val: user.failed_attempts, label: 'Failed Attempts'},
                        { icon: '🔍', val: user.intrusion_count, label: 'Intrusions'    },
                    ].map(s => (
                        <div key={s.label} className="uc-stat-chip">
                            <span className="uc-stat-icon">{s.icon}</span>
                            <span className="uc-stat-val">{s.val ?? 0}</span>
                            <span className="uc-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
