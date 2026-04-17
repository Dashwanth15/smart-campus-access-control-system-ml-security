/**
 * DeviceDashboard.jsx
 * Main "Device Intelligence" panel.
 * - Fetches /api/admin/devices → users grouped with their devices
 * - Real-time search (email / device_id / browser)
 * - Role filter dropdown
 * - Expandable UserCard per user
 * - Dynamic summary chips (Trusted/Suspicious/Blocked totals)
 */
import { useState, useEffect, useMemo } from 'react';
import API from '../services/api';
import UserCard from './UserCard';
import './device-dashboard.css';

const STATUS_CHIP = {
    Trusted:      { bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)', color: '#34d399', icon: '✅' },
    Suspicious:   { bg: 'rgba(245,158,11,.1)',   border: 'rgba(245,158,11,.3)', color: '#fbbf24', icon: '⚠️' },
    Blocked:      { bg: 'rgba(239,68,68,.1)',    border: 'rgba(239,68,68,.28)', color: '#f87171', icon: '🚫' },
    'No Activity':{ bg: 'rgba(100,116,139,.08)', border: 'rgba(100,116,139,.2)',color: '#94a3b8', icon: '💤' },
};

export default function DeviceDashboard() {
    const [users,         setUsers]         = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState('');
    const [search,        setSearch]        = useState('');
    const [roleFilter,    setRoleFilter]    = useState('All');
    const [actionLoading, setActionLoading] = useState('');

    // ── Fetch all users + their devices ──────────────────────────
    const fetchDevices = async () => {
        setLoading(true); setError('');
        try {
            const res = await API.get('/api/admin/devices');
            // Backend returns { users: [...] } grouped by user
            setUsers(res.data.users || []);
        } catch (e) {
            console.error('Failed to fetch devices:', e);
            setError('Failed to load device data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDevices(); }, []);

    // ── Revoke a device from any user ────────────────────────────
    const handleRevoke = async (deviceId) => {
        setActionLoading(deviceId);
        try {
            await API.post(`/api/admin/devices/${encodeURIComponent(deviceId)}/revoke`);
            // Optimistic update: remove device from the list
            setUsers(prev => prev.map(u => ({
                ...u,
                devices: u.devices.filter(d => d.device_id !== deviceId),
                device_count: u.device_count - 1,
            })));
        } catch (e) {
            console.error('Revoke failed:', e);
        } finally {
            setActionLoading('');
        }
    };

    // ── Filter logic (memoised for performance) ───────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return users.filter(u => {
            // Role filter
            if (roleFilter !== 'All' &&
                u.role?.toLowerCase() !== roleFilter.toLowerCase()) return false;

            // Text search — email | name | device_id | browser
            if (q) {
                const matchUser =
                    u.username?.toLowerCase().includes(q) ||
                    u.name?.toLowerCase().includes(q)     ||
                    u.last_browser?.toLowerCase().includes(q);

                const matchDevice = u.devices?.some(d =>
                    d.device_id?.includes(q) ||
                    d.browser_info?.toLowerCase().includes(q) ||
                    d.ip_address?.includes(q)
                );

                return matchUser || matchDevice;
            }
            return true;
        });
    }, [users, search, roleFilter]);

    // ── Summary counts based on FILTERED users ────────────────────
    const summary = useMemo(() => {
        const counts = { Trusted: 0, Suspicious: 0, Blocked: 0, 'No Activity': 0 };
        filtered.forEach(u => { if (counts[u.status] !== undefined) counts[u.status]++; });
        return counts;
    }, [filtered]);

    // ── Unique roles for dropdown ─────────────────────────────────
    const roles = useMemo(() => {
        const r = new Set(users.map(u => u.role).filter(Boolean));
        return ['All', ...Array.from(r).sort()];
    }, [users]);

    if (loading) return (
        <div className="dd-wrap">
            <div style={{ display:'flex', justifyContent:'center', padding:'3rem' }}>
                <div className="ad-spinner" />
            </div>
        </div>
    );

    if (error) return (
        <div className="dd-wrap">
            <div className="dd-empty">
                <span>❌</span>
                <p>{error}</p>
                <button className="btn-ghost" onClick={fetchDevices}>Retry</button>
            </div>
        </div>
    );

    return (
        <div className="dd-wrap">

            {/* ── SUMMARY CHIPS ─────────────────────────────────── */}
            <div className="dd-summary">
                {Object.entries(STATUS_CHIP).map(([label, chip]) => (
                    <div key={label} className="dd-chip"
                         style={{ background: chip.bg, border: `1px solid ${chip.border}` }}>
                        <span>{chip.icon}</span>
                        <span style={{ color: chip.color, fontWeight: 700, fontSize: '.9rem' }}>
                            {summary[label] || 0}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,.45)', fontSize: '.72rem' }}>{label}</span>
                    </div>
                ))}
                <div className="dd-chip"
                     style={{ background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.25)' }}>
                    <span>👥</span>
                    <span style={{ color:'#818cf8', fontWeight:700, fontSize:'.9rem' }}>{filtered.length}</span>
                    <span style={{ color:'rgba(255,255,255,.45)', fontSize:'.72rem' }}>Showing</span>
                </div>
            </div>

            {/* ── TOOLBAR ───────────────────────────────────────── */}
            <div className="dd-toolbar">
                <input
                    id="dd-search"
                    className="dd-search"
                    type="text"
                    placeholder="🔍  Search email, device ID, browser…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                {/* Role filter dropdown */}
                <select
                    id="dd-role-filter"
                    className="dd-filter"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                >
                    {roles.map(r => (
                        <option key={r} value={r}>{r === 'All' ? '👥 All Roles' : r}</option>
                    ))}
                </select>

                <span className="dd-count">
                    {filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}
                </span>

                <button id="dd-refresh"
                        className="btn-ghost"
                        onClick={fetchDevices}
                        style={{ marginLeft: 'auto' }}>
                    🔄 Refresh
                </button>
            </div>

            {/* ── USER CARDS LIST ────────────────────────────────── */}
            <div className="dd-list">
                {filtered.length === 0 ? (
                    <div className="dd-empty">
                        <span>🔍</span>
                        <p>No users match your search{roleFilter !== 'All' ? ` in role "${roleFilter}"` : ''}.</p>
                        {(search || roleFilter !== 'All') && (
                            <button className="btn-ghost" onClick={() => { setSearch(''); setRoleFilter('All'); }}>
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    filtered.map(user => (
                        <UserCard
                            key={user.username}
                            user={user}
                            onRevoke={handleRevoke}
                            actionLoading={actionLoading}
                        />
                    ))
                )}
            </div>

        </div>
    );
}
