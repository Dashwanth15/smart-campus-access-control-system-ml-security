import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import API from '../services/api';
import '../styles/admin-dashboard.css';
import '../components/filters/filters.css';
import { FilterBar, SummaryStrip } from '../components/filters';
import { buildQueryParams } from '../utils/filterUtils';

// ── helpers ─────────────────────────────────────────────────────
function fmtDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleString();
}
function shortId(id, len = 14) {
    if (!id) return 'N/A';
    return id.length > len ? id.slice(0, len) + '…' : id;
}
function riskColor(score) {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
}
function riskLabel(score) {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}
function statusBadge(status) {
    const map = {
        Trusted: { bg: 'rgba(16,185,129,.15)', border: 'rgba(16,185,129,.4)', color: '#34d399', icon: '✅' },
        Suspicious: { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.4)', color: '#fbbf24', icon: '⚠️' },
        Blocked: { bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.35)', color: '#f87171', icon: '🚫' },
    };
    return map[status] || map.Trusted;
}

// ── RiskBar ──────────────────────────────────────────────────────
function RiskBar({ score = 0 }) {
    const color = riskColor(score);
    return (
        <div className="ad-risk-wrap">
            <div className="ad-risk-bar-bg">
                <div className="ad-risk-bar-fill"
                    style={{ width: `${score}%`, background: color }} />
            </div>
            <span className="ad-risk-num" style={{ color }}>{score}</span>
        </div>
    );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyState({ hasFilters, noun = 'records' }) {
    return (
        <div className="filter-empty-state">
            <span className="filter-empty-icon">{hasFilters ? '🔍' : '📭'}</span>
            <p className="filter-empty-title">
                {hasFilters ? 'No results match your filters' : `No ${noun} found`}
            </p>
            <p className="filter-empty-sub">
                {hasFilters
                    ? 'Try adjusting your search, date range, or role filter.'
                    : 'Data will appear here once available.'}
            </p>
        </div>
    );
}

// Default filter state — shared across all tabs
const DEFAULT_FILTERS = { search: '', role: 'all', dateMode: 'date', dateValue: '' };

function hasActiveFilters(f) {
    return !!(f.search || (f.role && f.role !== 'all') || f.dateValue);
}

// ────────────────────────────────────────────────────────────────
function AdminDashboard() {
    const [overview, setOverview] = useState(null);
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [devices, setDevices] = useState([]);
    const [activeTab, setActiveTab] = useState('logs');
    const [loading, setLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [fetchErrors, setFetchErrors] = useState([]);

    // Per-tab filter state — each tab has its own independent filters
    const [logsFilters, setLogsFilters] = useState(DEFAULT_FILTERS);
    const [usersFilters, setUsersFilters] = useState(DEFAULT_FILTERS);
    const [devicesFilters, setDevicesFilters] = useState(DEFAULT_FILTERS);

    // Track devices-loaded to avoid double-fetch
    const devicesLoaded = useRef(false);

    // ── Generic filter change handler factory ────────────────────
    const makeFilterHandler = (setter) => (key, value) => {
        if (key === '__batch__' && typeof value === 'object') {
            // Atomic multi-field update — prevents two separate renders and two API calls
            setter(prev => ({ ...prev, ...value }));
        } else {
            setter(prev => ({ ...prev, [key]: value }));
        }
    };
    const makeClearHandler = (setter) => () => setter(DEFAULT_FILTERS);

    const handleLogsFilter = makeFilterHandler(setLogsFilters);
    const handleUsersFilter = makeFilterHandler(setUsersFilters);
    const handleDevicesFilter = makeFilterHandler(setDevicesFilters);

    // ── Fetch functions ───────────────────────────────────────────
    const fetchOverview = useCallback(async () => {
        try {
            const res = await API.get('/api/admin/analytics/overview');
            setOverview(res.data);
        } catch (e) {
            console.error('Overview fetch failed:', e);
        }
    }, []);

    const fetchLogs = useCallback(async (filters = logsFilters) => {
        setTabLoading(true);
        try {
            const params = { limit: 100, ...buildQueryParams(filters) };
            const res = await API.get('/api/admin/access-logs', { params });
            setLogs(res.data.logs || []);
        } catch (e) {
            console.error('Logs fetch failed:', e);
            setFetchErrors(prev => {
                const msg = `Logs: ${e.response?.data?.error || e.message}`;
                return prev.includes(msg) ? prev : [...prev, msg];
            });
        } finally {
            setTabLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async (filters = usersFilters) => {
        setTabLoading(true);
        try {
            const params = buildQueryParams(filters);
            // Use /api/admin/devices which derives device counts from FILTERED logs,
            // not from static known_devices fields in the users collection.
            const res = await API.get('/api/admin/devices', { params });
            setUsers(res.data.users || []);
        } catch (e) {
            console.error('Users fetch failed:', e);
        } finally {
            setTabLoading(false);
        }
    }, []);

    const fetchDevices = useCallback(async (filters = devicesFilters) => {
        setTabLoading(true);
        try {
            const params = buildQueryParams(filters);
            const res = await API.get('/api/admin/devices', { params });
            // API returns { users: [...] } — flatten into device list
            const flat = [];
            (res.data.users || []).forEach(u => {
                (u.devices || []).forEach(d => {
                    flat.push({ ...d, username: u.username, name: u.name, role: u.role });
                });
            });
            setDevices(flat);
            devicesLoaded.current = true;
        } catch (e) {
            console.error('Devices fetch failed:', e);
        } finally {
            setTabLoading(false);
        }
    }, []);

    // ── Initial load ──────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            setFetchErrors([]);
            await Promise.all([fetchOverview(), fetchLogs(DEFAULT_FILTERS), fetchUsers(DEFAULT_FILTERS)]);
            setLoading(false);
        };
        init();
    }, []);

    // ── Load devices when that tab is first opened ────────────────
    useEffect(() => {
        if (activeTab === 'devices' && !devicesLoaded.current) {
            fetchDevices(DEFAULT_FILTERS);
        }
    }, [activeTab]);

    // ── Cross-route sync: re-fetch users whenever block state changes
    //    from ANY page (Blocked Devices unblock, or another tab).
    //    localStorage 'storage' event works across routes even when this
    //    component was unmounted while the other page acted.
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'campusBlockChanged') fetchUsers(usersFilters);
        };
        window.addEventListener('storage', handler);
        return () => window.removeEventListener('storage', handler);
    }, [fetchUsers, usersFilters]);

    // ── Mount-time sync: if block state changed while we were away
    //    (e.g. unblocked from Blocked Devices page), refetch immediately.
    useEffect(() => {
        const lastChange = localStorage.getItem('campusBlockChanged');
        if (lastChange) fetchUsers(DEFAULT_FILTERS);
    }, []); // intentionally runs once on mount

    // ── Re-fetch on filter changes (per tab) ─────────────────────
    useEffect(() => {
        if (!loading) fetchLogs(logsFilters);
    }, [logsFilters]);

    useEffect(() => {
        if (!loading) fetchUsers(usersFilters);
    }, [usersFilters]);

    useEffect(() => {
        if (!loading && devicesLoaded.current) fetchDevices(devicesFilters);
    }, [devicesFilters]);

    // ── Action handlers ───────────────────────────────────────────
    const handleUnlock = async (id) => {
        setActionLoading(id);
        try {
            await API.post(`/api/admin/users/${id}/unlock`);
            await fetchUsers(usersFilters);
            // Broadcast so Blocked Devices page refetches if open in another tab
            localStorage.setItem('campusBlockChanged', Date.now().toString());
        }
        catch (e) { console.error(e); }
        finally { setActionLoading(''); }
    };
    const handleBlock = async (id) => {
        setActionLoading(id);
        try {
            await API.post(`/api/admin/users/${id}/block`, { duration_hours: 24 });
            await fetchUsers(usersFilters);
            // Broadcast so Blocked Devices page refetches if open in another tab
            localStorage.setItem('campusBlockChanged', Date.now().toString());
        }
        catch (e) { console.error(e); }
        finally { setActionLoading(''); }
    };
    const handleRevokeDevice = async (deviceId) => {
        setActionLoading(deviceId);
        try {
            await API.post(`/api/admin/devices/${encodeURIComponent(deviceId)}/revoke`);
            setDevices(prev => prev.filter(d => d.device_id !== deviceId));
        } catch (e) { console.error(e); }
        finally { setActionLoading(''); }
    };

    // ── Memoized client-side device filter (instant UX) ──────────
    // The server already filtered by role/date; this provides instant search
    const filteredDevices = useMemo(() => {
        const q = devicesFilters.search?.toLowerCase();
        if (!q) return devices;
        return devices.filter(d =>
            d.username?.toLowerCase().includes(q) ||
            d.device_id?.toLowerCase().includes(q) ||
            d.browser_info?.toLowerCase().includes(q) ||
            d.ip_address?.toLowerCase().includes(q) ||
            d.status?.toLowerCase().includes(q)
        );
    }, [devices, devicesFilters.search]);

    if (loading) return (
        <div className="dashboard-loading">
            <div className="ad-spinner" />
            <p>Loading admin dashboard…</p>
        </div>
    );

    const today = overview?.today || {};

    return (
        <div className="admin-dashboard animate-fade-in">

            {/* ── API ERROR BANNER ─────────────────────────────── */}
            {fetchErrors.length > 0 && (
                <div style={{
                    background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)',
                    borderRadius: 10, padding: '12px 18px', marginBottom: 16,
                    color: '#f87171', fontSize: '.85rem'
                }}>
                    <strong>⚠️ API errors (check browser console F12 → Network tab):</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                        {fetchErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                    <button onClick={() => { setFetchErrors([]); fetchOverview(); fetchLogs(DEFAULT_FILTERS); fetchUsers(DEFAULT_FILTERS); }} style={{
                        marginTop: 8, padding: '4px 12px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)',
                        color: '#f87171', fontSize: '.8rem'
                    }}>🔄 Retry</button>
                </div>
            )}

            {/* ── HERO ─────────────────────────────────────────── */}
            <div className="ad-hero">
                <div className="ad-hero-content">
                    <div className="ad-hero-badge">🔐 Admin Control Panel</div>
                    <h1 className="ad-hero-title">
                        Security <span className="ad-hero-accent">Intelligence</span>
                    </h1>
                    <p className="ad-hero-sub">
                        Device-based access control · Random Forest AI · Real-time risk scoring
                    </p>
                    <div className="ad-hero-meta">
                        <span className="ad-meta-pill"><span>👥</span> {overview?.total_users || 0} Users</span>
                        <span className="ad-meta-pill"><span>✅</span> {overview?.active_users || 0} Active</span>
                        <span className="ad-meta-pill ad-meta-pill--danger"><span>🔒</span> {overview?.blocked_users || 0} Blocked</span>
                    </div>
                </div>
                <button className="ad-refresh-btn" onClick={() => {
                    fetchOverview();
                    fetchLogs(logsFilters);
                    fetchUsers(usersFilters);
                    if (devicesLoaded.current) fetchDevices(devicesFilters);
                }} title="Refresh">🔄</button>
            </div>

            {/* ── STAT GRID ────────────────────────────────────── */}
            <div className="stats-grid">
                {[
                    { icon: '👥', val: overview?.total_users || 0, label: 'Total Users', cls: 'stat-primary' },
                    { icon: '✅', val: overview?.active_users || 0, label: 'Active Users', cls: 'stat-success' },
                    { icon: '🔒', val: overview?.blocked_users || 0, label: 'Blocked', cls: 'stat-danger' },
                    { icon: '⚠️', val: today?.intrusion_attempts || 0, label: "Today's Intrusions", cls: 'stat-warning' },
                    { icon: '📱', val: today?.unique_devices || 0, label: 'Unique Devices', cls: 'stat-info' },
                    { icon: '🔥', val: today?.high_risk_logins || 0, label: 'High-Risk Logins', cls: 'stat-danger' },
                ].map(s => (
                    <div key={s.label} className={`stat-card ${s.cls}`}>
                        <div className="stat-icon">{s.icon}</div>
                        <div className="stat-content">
                            <span className="stat-value">{s.val}</span>
                            <span className="stat-label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── ROLE BARS ────────────────────────────────────── */}
            <div className="role-distribution">
                <h3>👥 Users by Role</h3>
                <div className="role-bars">
                    {Object.entries(overview?.user_stats || {}).map(([role, count]) => (
                        <div key={role} className="role-bar-item">
                            <span className="role-name">{role}</span>
                            <div className="role-bar">
                                <div className="role-fill" style={{
                                    width: `${(count / (overview?.total_users || 1)) * 100}%`,
                                    backgroundColor:
                                        role === 'Student' ? '#3b82f6' :
                                            role === 'Faculty' ? '#10b981' :
                                                role === 'Guest' ? '#f59e0b' : '#8b5cf6'
                                }} />
                            </div>
                            <span className="role-count">{count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── TAB NAV ──────────────────────────────────────── */}
            <div className="tab-navigation">
                {[
                    { key: 'logs', label: '📋 Access Logs' },
                    { key: 'users', label: '👥 User Management' },
                    { key: 'devices', label: '🧠 Device Intelligence' },
                ].map(t => (
                    <button key={t.key}
                        id={`ad-tab-${t.key}`}
                        className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════ */}
            {/* TAB: ACCESS LOGS                                  */}
            {/* ══════════════════════════════════════════════════ */}
            {activeTab === 'logs' && (
                <div className="logs-section animate-fade-in">
                    <div className="section-header">
                        <h3>📋 Access Logs</h3>
                        <span className="log-count">{logs.length} entries</span>
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        filters={logsFilters}
                        onFilterChange={handleLogsFilter}
                        onClearAll={makeClearHandler(setLogsFilters)}
                        searchPlaceholder="Search user, device ID, IP, browser…"
                    />

                    {/* Summary Strip — shown only when filters active */}
                    <SummaryStrip
                        filters={logsFilters}
                        visible={hasActiveFilters(logsFilters)}
                    />

                    {/* Table */}
                    {tabLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,.4)' }}>
                            <div className="ad-spinner" style={{ margin: '0 auto 12px' }} />
                            <p>Filtering…</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <EmptyState hasFilters={hasActiveFilters(logsFilters)} noun="access logs" />
                    ) : (
                        <div className="logs-table">
                            <div className="table-header">
                                <span>Time</span>
                                <span>User</span>
                                <span>Role</span>
                                <span>Access</span>
                                <span>Device</span>
                                <span>Risk</span>
                                <span>Status</span>
                            </div>
                            {logs.slice(0, 100).map((log, i) => (
                                <div key={log._id || i} className="table-row">
                                    <span className="time">{fmtDate(log.timestamp)}</span>
                                    <span className="username" title={log.username}>{log.username || 'N/A'}</span>
                                    <span className={`role role-${log.role?.toLowerCase()}`}>{log.role}</span>
                                    <span className={`access access-${log.access?.toLowerCase()}`}>{log.access}</span>
                                    <span className="ad-device-cell" title={log.device_id}>
                                        <span className="ad-did">{shortId(log.device_id)}</span>
                                        {log.browser_info && (
                                            <span className="ad-browser-tag">{log.browser_info}</span>
                                        )}
                                    </span>
                                    <span className="ad-risk-cell">
                                        <RiskBar score={log.risk_score || 0} />
                                    </span>
                                    <span className={`status ${log.intrusion ? 'intrusion' : 'normal'}`}>
                                        {log.intrusion ? '⚠️ Suspicious' : '✓ Normal'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════ */}
            {/* TAB: USER MANAGEMENT                              */}
            {/* ══════════════════════════════════════════════════ */}
            {activeTab === 'users' && (
                <div className="users-section animate-fade-in">
                    <div className="section-header">
                        <h3>👥 User Management</h3>
                        <span className="log-count">{users.length} users</span>
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        filters={usersFilters}
                        onFilterChange={handleUsersFilter}
                        onClearAll={makeClearHandler(setUsersFilters)}
                        searchPlaceholder="Search by name, email, username…"
                    />

                    {/* Summary Strip — shown only when filters active */}
                    <SummaryStrip
                        filters={usersFilters}
                        visible={hasActiveFilters(usersFilters)}
                    />

                    {/* User grid */}
                    {tabLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,.4)' }}>
                            <div className="ad-spinner" style={{ margin: '0 auto 12px' }} />
                            <p>Filtering…</p>
                        </div>
                    ) : users.length === 0 ? (
                        <EmptyState hasFilters={hasActiveFilters(usersFilters)} noun="users" />
                    ) : (
                        <div className="users-grid">
                            {users.map(user => {
                                // /api/admin/devices returns is_blocked derived from lockout_until
                                const isBlocked = user.is_blocked;
                                // Use username as stable key (devices endpoint has no _id)
                                return (
                                    <div key={user.username} className="user-card">
                                        <div className="user-avatar">
                                            {(user.name || user.username || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="user-info">
                                            <span className="user-name">{user.name || user.username}</span>
                                            <span className="user-email">{user.username}</span>
                                            <span className={`user-role role-${user.role?.toLowerCase()}`}>
                                                {user.role}
                                            </span>
                                            {/* device_count is derived from FILTERED logs — updates with date filter */}
                                            <span className="ad-device-count">
                                                📱 {user.device_count ?? 0} known device(s)
                                            </span>
                                        </div>
                                        <div className="user-status">
                                            {isBlocked
                                                ? <span className="status-blocked">🔒 Blocked</span>
                                                : <span className="status-active">✅ Active</span>}
                                        </div>
                                        <div className="user-actions">
                                            {isBlocked ? (
                                                <button className="btn btn-sm btn-success"
                                                    onClick={() => handleUnlock(user._id)}
                                                    disabled={actionLoading === user._id}>
                                                    {actionLoading === user._id ? '…' : '🔓 Unlock'}
                                                </button>
                                            ) : (
                                                <button className="btn btn-sm btn-danger"
                                                    onClick={() => handleBlock(user._id)}
                                                    disabled={actionLoading === user._id || user.role === 'Admin'}>
                                                    {actionLoading === user._id ? '…' : '🔒 Block'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════ */}
            {/* TAB: DEVICE INTELLIGENCE                          */}
            {/* ══════════════════════════════════════════════════ */}
            {activeTab === 'devices' && (
                <div className="ad-devices-section animate-fade-in">
                    <div className="section-header">
                        <div>
                            <h3>🧠 Device Intelligence Dashboard</h3>
                            <p className="ad-section-sub">
                                Browser fingerprint · IP tracking · Risk scoring · Behavioral analysis
                            </p>
                        </div>
                        <button className="btn btn-sm btn-ghost" onClick={() => fetchDevices(devicesFilters)}>🔄 Refresh</button>
                    </div>

                    {/* Filter Bar */}
                    <FilterBar
                        filters={devicesFilters}
                        onFilterChange={handleDevicesFilter}
                        onClearAll={makeClearHandler(setDevicesFilters)}
                        searchPlaceholder="Search user, device ID, browser, IP…"
                    />

                    {/* Summary Strip — shown only when filters active */}
                    <SummaryStrip
                        filters={devicesFilters}
                        visible={hasActiveFilters(devicesFilters)}
                    />

                    {/* Status summary chips */}
                    <div className="ad-device-summary">
                        {['Trusted', 'Suspicious', 'Blocked'].map(s => {
                            const badge = statusBadge(s);
                            const cnt = filteredDevices.filter(d => d.status === s).length;
                            return (
                                <div key={s} className="ad-summary-chip"
                                    style={{ background: badge.bg, border: `1px solid ${badge.border}` }}>
                                    <span>{badge.icon}</span>
                                    <span style={{ color: badge.color, fontWeight: 700 }}>{cnt}</span>
                                    <span style={{ color: 'rgba(255,255,255,.55)', fontSize: '.75rem' }}>{s}</span>
                                </div>
                            );
                        })}
                        <div className="ad-summary-chip"
                            style={{ background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)' }}>
                            <span>📱</span>
                            <span style={{ color: '#818cf8', fontWeight: 700 }}>{filteredDevices.length}</span>
                            <span style={{ color: 'rgba(255,255,255,.55)', fontSize: '.75rem' }}>Total</span>
                        </div>
                    </div>

                    {/* Device cards */}
                    {tabLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,.4)' }}>
                            <div className="ad-spinner" style={{ margin: '0 auto 12px' }} />
                            <p>Filtering…</p>
                        </div>
                    ) : (
                        <div className="ad-device-grid">
                            {filteredDevices.map((d, i) => {
                                const badge = statusBadge(d.status);
                                return (
                                    <div key={d.device_id || i} className="ad-device-card">

                                        {/* Status pill */}
                                        <div className="ad-device-card-status"
                                            style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color }}>
                                            {badge.icon} {d.status}
                                        </div>

                                        {/* Device ID */}
                                        <div className="ad-device-id-row">
                                            <span className="ad-device-id-icon">🔑</span>
                                            <div>
                                                <div className="ad-device-id-label">Device ID</div>
                                                <div className="ad-device-id-value" title={d.device_id}>
                                                    {d.short_id || shortId(d.device_id)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Meta rows */}
                                        <div className="ad-device-meta-grid">
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">👤 User</span>
                                                <span className="ad-dmi-val" title={d.username}>{d.username || 'N/A'}</span>
                                            </div>
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">🏷️ Role</span>
                                                <span className={`ad-role-badge role-${d.role?.toLowerCase()}`}>{d.role}</span>
                                            </div>
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">🖥️ Browser / OS</span>
                                                <span className="ad-dmi-val">{d.browser_info || 'Unknown'}</span>
                                            </div>
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">🌐 Last IP</span>
                                                <span className="ad-dmi-val ad-mono">{d.ip_address || 'N/A'}</span>
                                            </div>
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">🕒 Last Login</span>
                                                <span className="ad-dmi-val">{fmtDate(d.last_login)}</span>
                                            </div>
                                            <div className="ad-device-meta-item">
                                                <span className="ad-dmi-label">📊 Total Logins</span>
                                                <span className="ad-dmi-val">{d.total_logins}</span>
                                            </div>
                                        </div>

                                        {/* Behavioural signals */}
                                        <div className="ad-device-signals">
                                            {[
                                                { label: 'Failed', val: d.failed_attempts, warn: d.failed_attempts > 1 },
                                                { label: 'Intrusions', val: d.intrusion_count, warn: d.intrusion_count > 0 },
                                                { label: 'IP Shifts', val: d.ip_changes, warn: d.ip_changes > 2 },
                                                { label: 'UA Shifts', val: d.browser_changes, warn: d.browser_changes > 1 },
                                            ].map(sig => (
                                                <div key={sig.label}
                                                    className={`ad-signal-chip ${sig.warn ? 'ad-signal-chip--warn' : ''}`}>
                                                    <span className="ad-sig-val">{sig.val}</span>
                                                    <span className="ad-sig-lbl">{sig.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Risk score */}
                                        <div className="ad-device-risk-row">
                                            <span className="ad-risk-label-txt">Risk Score</span>
                                            <div style={{ flex: 1 }}>
                                                <RiskBar score={d.risk_score || 0} />
                                            </div>
                                            <span className="ad-risk-level" style={{ color: riskColor(d.risk_score || 0) }}>
                                                {riskLabel(d.risk_score || 0)}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        {d.status !== 'Trusted' && (
                                            <button
                                                className="ad-revoke-btn"
                                                onClick={() => handleRevokeDevice(d.device_id)}
                                                disabled={actionLoading === d.device_id}>
                                                {actionLoading === d.device_id ? '…' : '🚫 Revoke Device'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            {filteredDevices.length === 0 && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <EmptyState hasFilters={hasActiveFilters(devicesFilters)} noun="devices" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── TODAY SUMMARY ─────────────────────────────────── */}
            <div className="activity-summary">
                <h3>📈 Today's Activity</h3>
                <div className="activity-grid">
                    <div className="activity-item">
                        <span className="activity-icon">✅</span>
                        <span className="activity-value">{today?.access_stats?.Allowed || 0}</span>
                        <span className="activity-label">Allowed</span>
                    </div>
                    <div className="activity-item">
                        <span className="activity-icon">🚫</span>
                        <span className="activity-value">{today?.access_stats?.Blocked || 0}</span>
                        <span className="activity-label">Blocked</span>
                    </div>
                    <div className="activity-item">
                        <span className="activity-icon">📱</span>
                        <span className="activity-value">{today?.unknown_device_attempts || 0}</span>
                        <span className="activity-label">Unknown Devices</span>
                    </div>
                    <div className="activity-item">
                        <span className="activity-icon">🔥</span>
                        <span className="activity-value">{today?.high_risk_logins || 0}</span>
                        <span className="activity-label">High-Risk</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default AdminDashboard;
