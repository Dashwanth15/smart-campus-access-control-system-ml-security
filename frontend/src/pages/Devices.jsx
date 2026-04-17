import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import '../styles/devices.css';

/**
 * Devices.jsx — Blocked Devices Management
 * Shows only devices with status = "Blocked".
 * Full device intelligence lives in Admin Panel → Device Intelligence tab.
 */

const DATE_FILTERS = [
    { key: 'all',   label: 'All Time' },
    { key: 'today', label: 'Today'    },
    { key: 'week',  label: 'Week'     },
    { key: 'month', label: 'Month'    },
];

const ROLE_FILTERS = ['All Roles', 'Admin', 'Student', 'Faculty', 'Guest'];

const SORT_OPTIONS = [
    { key: 'risk_desc',   label: 'Risk ↓'       },
    { key: 'risk_asc',    label: 'Risk ↑'       },
    { key: 'date_desc',   label: 'Last Login ↓'  },
    { key: 'date_asc',    label: 'Last Login ↑'  },
    { key: 'email_asc',   label: 'Email A–Z'     },
];

function ConfirmModal({ device, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content premium-modal" onClick={e => e.stopPropagation()}>
                <div className="premium-modal-header">
                    <div>
                        <div className="modal-title">🔓 Unblock Device</div>
                        <div className="modal-subtitle">This action will mark the device as Trusted</div>
                    </div>
                    <button className="modal-close" onClick={onCancel}>✕</button>
                </div>
                <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
                    <p style={{ color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.6 }}>
                        Are you sure you want to unblock this device?
                    </p>
                    <div style={{
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem',
                        fontSize: '0.82rem', color: '#f1f5f9',
                        fontFamily: 'monospace', wordBreak: 'break-all'
                    }}>
                        <div><span style={{ color: '#64748b' }}>Device ID &nbsp;</span>{device.device_id}</div>
                        <div><span style={{ color: '#64748b' }}>User &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{device.userEmail}</div>
                        <div><span style={{ color: '#64748b' }}>Role &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{device.role}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={onCancel}
                            style={{ minWidth: 80 }}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={onConfirm}
                            style={{ minWidth: 110, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none' }}
                        >
                            ✅ Confirm Unblock
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function riskColor(s) {
    return s >= 70 ? '#ef4444' : s >= 40 ? '#f59e0b' : '#10b981';
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
}

function withinDateFilter(dateStr, filterKey) {
    if (filterKey === 'all' || !dateStr) return true;
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = now - d;
    if (filterKey === 'today') return diff < 86400000;
    if (filterKey === 'week')  return diff < 7 * 86400000;
    if (filterKey === 'month') return diff < 30 * 86400000;
    return true;
}

export default function Devices() {
    const [blockedDevices, setBlockedDevices] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [search,        setSearch]        = useState('');
    const [dateFilter,    setDateFilter]    = useState('all');
    const [roleFilter,    setRoleFilter]    = useState('All Roles');
    const [sortKey,       setSortKey]       = useState('risk_desc');
    const [confirmDevice, setConfirmDevice] = useState(null);   // device being confirmed
    const [unblocking,    setUnblocking]    = useState(null);   // device_id being unblocked
    const [toast,         setToast]         = useState(null);   // { msg, type }

    useEffect(() => { fetchDevices(); }, []);

    // ── Cross-route sync: refetch if block state changed from another page
    //    (e.g. admin blocked a user from User Management in another tab).
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'campusBlockChanged') fetchDevices();
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, []);

    const fetchDevices = async () => {
        try {
            setLoading(true); setError(null);
            const res = await API.get('/api/admin/devices');
            // Flatten ALL users' devices, keep only status === 'Blocked'
            const flat = [];
            (res.data.users || []).forEach(u => {
                (u.devices || []).forEach(d => {
                    if (d.status === 'Blocked') {
                        flat.push({
                            ...d,
                            userName:  u.name,
                            userEmail: u.username,
                            role:      u.role,
                            userId:    u._id,
                        });
                    }
                });
            });

            // Deduplicate: one row per user — keep the device with the
            // highest risk score (break ties by latest last_login).
            const byUser = new Map();
            flat.forEach(device => {
                const key = device.userId || device.userEmail;
                const existing = byUser.get(key);
                if (!existing) {
                    byUser.set(key, device);
                } else {
                    const betterRisk = (device.risk_score || 0) > (existing.risk_score || 0);
                    const sameRisk   = (device.risk_score || 0) === (existing.risk_score || 0);
                    const newerLogin = new Date(device.last_login || 0) > new Date(existing.last_login || 0);
                    if (betterRisk || (sameRisk && newerLogin)) {
                        byUser.set(key, device);
                    }
                }
            });

            setBlockedDevices(Array.from(byUser.values()));
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to load devices.');
        } finally {
            setLoading(false);
        }
    };


    // Apply search + role + date filters + sort
    const displayList = useMemo(() => {
        let list = blockedDevices;

        // Search
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(d =>
                d.device_id?.toLowerCase().includes(q)  ||
                d.userEmail?.toLowerCase().includes(q)  ||
                d.userName?.toLowerCase().includes(q)   ||
                d.ip_address?.toLowerCase().includes(q) ||
                d.browser_info?.toLowerCase().includes(q)
            );
        }

        // Role filter
        if (roleFilter && roleFilter !== 'All Roles') {
            list = list.filter(d => d.role === roleFilter);
        }

        // Date filter (last_login)
        if (dateFilter !== 'all') {
            list = list.filter(d => withinDateFilter(d.last_login, dateFilter));
        }

        // Sort
        list = [...list].sort((a, b) => {
            switch (sortKey) {
                case 'risk_desc':  return (b.risk_score || 0) - (a.risk_score || 0);
                case 'risk_asc':   return (a.risk_score || 0) - (b.risk_score || 0);
                case 'date_desc':  return new Date(b.last_login || 0) - new Date(a.last_login || 0);
                case 'date_asc':   return new Date(a.last_login || 0) - new Date(b.last_login || 0);
                case 'email_asc':  return (a.userEmail || '').localeCompare(b.userEmail || '');
                default:           return 0;
            }
        });

        return list;
    }, [blockedDevices, search, roleFilter, dateFilter, sortKey]);

    const handleUnblockConfirm = async () => {
        if (!confirmDevice) return;
        const device = confirmDevice;
        setConfirmDevice(null);
        setUnblocking(device.device_id);
        try {
            await API.patch(`/api/admin/devices/${encodeURIComponent(device.device_id)}/unblock`, {
                userId: device.userId,   // lets backend find user directly by _id (reliable)
            });

            // ── Instant removal from state (optimistic UI) ──────────────────
            // PATCH succeeded → unblocking clears is_blocked + ALL device log
            // signals for the entire user account (not just this one device_id).
            // So remove ALL entries for this user from the blocked list, which
            // prevents duplicates (MAC + fingerprint IDs) from lingering.
            setBlockedDevices(prev => {
                if (device.userId) {
                    // Remove every device entry that belongs to the same user
                    return prev.filter(d => d.userId !== device.userId);
                }
                // Fallback: remove just this device_id if userId is unavailable
                return prev.filter(d => d.device_id !== device.device_id);
            });
            // Broadcast cross-route: User Management page will refetch if open
            // in another tab. Within the same tab, AdminDashboard's mount-time
            // check will pick this up when the user navigates back to it.
            localStorage.setItem('campusBlockChanged', Date.now().toString());
            // ────────────────────────────────────────────────────────────────

            showToast('Device unblocked and marked as Trusted ✅', 'success');
        } catch (err) {
            showToast(err.response?.data?.error || 'Unblock failed. Please retry.', 'error');
        } finally {
            setUnblocking(null);
        }
    };

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Loading state
    if (loading) return (
        <div className="devices animate-fade-in">
            <div className="loading-state">
                <div className="spinner-large" />
                <p>Loading blocked devices…</p>
            </div>
        </div>
    );

    return (
        <div className="devices animate-fade-in">

            {/* Toast notification */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 24, zIndex: 9999,
                    padding: '0.75rem 1.25rem', borderRadius: 10,
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.92)' : 'rgba(239,68,68,0.92)',
                    color: '#fff', fontWeight: 600, fontSize: '0.88rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                    animation: 'fadeIn .25s ease',
                }}>
                    {toast.msg}
                </div>
            )}

            {/* ── Page header ────────────────────────────────────────── */}
            <div className="devices-header">
                <div className="header-content">
                    <h2 className="page-heading">🚫 Blocked Devices</h2>
                    <p className="page-description">
                        {blockedDevices.length} blocked device{blockedDevices.length !== 1 ? 's' : ''} —
                        review and unblock trusted devices
                    </p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchDevices}>🔄 Refresh</button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
                    borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                    color: '#f87171', fontSize: '.85rem',
                }}>
                    ⚠️ {error}
                    <button onClick={fetchDevices} style={{
                        marginLeft: 12, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.3)',
                        color: '#f87171', fontSize: '.8rem',
                    }}>Retry</button>
                </div>
            )}

            {/* ── Filters bar ────────────────────────────────────────── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.75rem',
                alignItems: 'center', marginBottom: '1.25rem',
            }}>
                {/* Search */}
                <input
                    type="text"
                    placeholder="🔍  Search device ID, email, IP…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: '1 1 240px', padding: '8px 14px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,.14)',
                        background: 'rgba(255,255,255,.05)', color: '#f1f5f9',
                        fontSize: '.85rem', outline: 'none', minWidth: 180,
                    }}
                />

                {/* Date filter pills */}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {DATE_FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setDateFilter(f.key)}
                            style={{
                                padding: '5px 13px', borderRadius: 20, fontSize: '.78rem',
                                cursor: 'pointer', fontWeight: 600,
                                background: dateFilter === f.key ? 'rgba(239,68,68,.22)' : 'rgba(255,255,255,.06)',
                                border: dateFilter === f.key ? '1px solid rgba(239,68,68,.55)' : '1px solid rgba(255,255,255,.1)',
                                color: dateFilter === f.key ? '#f87171' : '#94a3b8',
                                transition: 'all .15s',
                            }}
                        >{f.label}</button>
                    ))}
                </div>

                {/* Role select */}
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{
                        padding: '7px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,.14)',
                        background: '#1e293b', color: '#f1f5f9',
                        fontSize: '.82rem', outline: 'none', cursor: 'pointer',
                    }}
                >
                    {ROLE_FILTERS.map(r => <option key={r}>{r}</option>)}
                </select>

                {/* Sort select */}
                <select
                    value={sortKey}
                    onChange={e => setSortKey(e.target.value)}
                    style={{
                        padding: '7px 12px', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,.14)',
                        background: '#1e293b', color: '#f1f5f9',
                        fontSize: '.82rem', outline: 'none', cursor: 'pointer',
                    }}
                >
                    {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
            </div>

            {/* ── Result count ───────────────────────────────────────── */}
            <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Showing <strong style={{ color: '#f1f5f9' }}>{displayList.length}</strong> of <strong style={{ color: '#f1f5f9' }}>{blockedDevices.length}</strong> blocked device{blockedDevices.length !== 1 ? 's' : ''}
            </div>

            {/* ── Table ──────────────────────────────────────────────── */}
            {displayList.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">✅</span>
                    <h3>{blockedDevices.length === 0 ? 'No Blocked Devices' : 'No Results Match Filter'}</h3>
                    <p>{blockedDevices.length === 0
                        ? 'All devices are currently trusted. No action needed.'
                        : 'Try adjusting search or filters.'}</p>
                </div>
            ) : (
                <div className="um-table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="um-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{
                                background: 'rgba(255,255,255,.03)',
                                borderBottom: '1px solid rgba(255,255,255,.08)',
                            }}>
                                {['Device ID', 'User', 'Role', 'IP Address', 'Last Login', 'Risk Score', 'Action'].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 14px', textAlign: 'left',
                                        fontSize: '.75rem', fontWeight: 600,
                                        color: '#64748b', letterSpacing: '.04em',
                                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {displayList.map((device, i) => {
                                const rc = riskColor(device.risk_score || 0);
                                const isUnblocking = unblocking === device.device_id;
                                return (
                                    <tr
                                        key={device.device_id || i}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,.05)',
                                            transition: 'background .15s',
                                            background: isUnblocking ? 'rgba(16,185,129,.05)' : 'transparent',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                                        onMouseLeave={e => e.currentTarget.style.background = isUnblocking ? 'rgba(16,185,129,.05)' : 'transparent'}
                                    >
                                        {/* Device ID */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{
                                                fontFamily: 'monospace', fontSize: '.78rem',
                                                color: '#f87171', background: 'rgba(248,113,113,.08)',
                                                border: '1px solid rgba(248,113,113,.2)',
                                                borderRadius: 6, padding: '3px 8px', display: 'inline-block',
                                            }} title={device.device_id}>
                                                🚫 {device.short_id || device.device_id?.slice(0,14) + '…'}
                                            </div>
                                        </td>

                                        {/* User email */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ fontSize: '.85rem', color: '#e2e8f0', fontWeight: 500 }}>
                                                {device.userName || device.userEmail}
                                            </div>
                                            <div style={{ fontSize: '.75rem', color: '#64748b' }}>
                                                {device.userEmail}
                                            </div>
                                        </td>

                                        {/* Role badge */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: 20, fontSize: '.72rem',
                                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                                                background: 'rgba(99,102,241,.15)',
                                                border: '1px solid rgba(99,102,241,.3)',
                                                color: '#818cf8',
                                            }}>{device.role}</span>
                                        </td>

                                        {/* IP Address */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '.8rem', color: '#94a3b8' }}>
                                                {device.ip_address || '—'}
                                            </span>
                                        </td>

                                        {/* Last login */}
                                        <td style={{ padding: '12px 14px', fontSize: '.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {fmtDate(device.last_login)}
                                        </td>

                                        {/* Risk score */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 56, height: 5, borderRadius: 4,
                                                    background: 'rgba(255,255,255,.08)', overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: 4,
                                                        width: `${device.risk_score || 0}%`,
                                                        background: rc, transition: 'width .4s',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '.8rem', fontWeight: 700, color: rc, minWidth: 28 }}>
                                                    {device.risk_score || 0}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Unblock action */}
                                        <td style={{ padding: '12px 14px' }}>
                                            <button
                                                className="btn btn-sm"
                                                disabled={isUnblocking}
                                                onClick={() => setConfirmDevice(device)}
                                                style={{
                                                    padding: '5px 14px', borderRadius: 7, fontSize: '.78rem',
                                                    fontWeight: 600, cursor: isUnblocking ? 'not-allowed' : 'pointer',
                                                    background: isUnblocking
                                                        ? 'rgba(100,116,139,.3)'
                                                        : 'rgba(16,185,129,.15)',
                                                    border: isUnblocking
                                                        ? '1px solid rgba(100,116,139,.3)'
                                                        : '1px solid rgba(16,185,129,.4)',
                                                    color: isUnblocking ? '#64748b' : '#34d399',
                                                    transition: 'all .15s',
                                                }}
                                            >
                                                {isUnblocking ? '⏳ Unblocking…' : '🔓 Unblock'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Confirmation modal */}
            {confirmDevice && (
                <ConfirmModal
                    device={confirmDevice}
                    onConfirm={handleUnblockConfirm}
                    onCancel={() => setConfirmDevice(null)}
                />
            )}
        </div>
    );
}
