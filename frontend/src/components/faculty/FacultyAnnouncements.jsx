import { useState, useEffect } from 'react';
import API from '../../services/api';

const SUBJECTS = [
    'Mathematics', 'Physics', 'Data Structures',
    'Computer Networks', 'Database Systems', 'Operating Systems', 'General'
];

const TYPE_META = {
    assignment: { color: '#818cf8', bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.3)',  icon: '📝', label: 'Assignment'  },
    hallticket: { color: '#34d399', bg: 'rgba(16,185,129,.10)', border: 'rgba(16,185,129,.3)',  icon: '🎫', label: 'Hall Ticket' },
    notice:     { color: '#fbbf24', bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.3)',  icon: '📢', label: 'Notice'      },
};

function FacultyAnnouncements() {
    const [announcements, setAnnouncements] = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState('');
    const [filterType,    setFilterType]    = useState('all');
    const [showForm,      setShowForm]      = useState(false);
    const [form,          setForm]          = useState({ title: '', desc: '', type: 'notice', subject: 'General', link: '', attachment_name: '' });
    const [submitting,    setSubmitting]    = useState(false);
    const [toast,         setToast]         = useState('');

    const fetchAnnouncements = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await API.get('/api/announcements');
            setAnnouncements(res.data.announcements || []);
        } catch {
            setError('Could not load announcements.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim() || !form.desc.trim()) return;
        setSubmitting(true);
        try {
            const res = await API.post('/api/announcements', form);
            setAnnouncements(prev => [res.data.announcement, ...prev]);
        setForm({ title: '', desc: '', type: 'notice', subject: 'General', link: '', attachment_name: '' });
            setShowForm(false);
            showToast('✅ Announcement posted! Students can see it now.');
        } catch {
            showToast('❌ Failed to post announcement. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await API.delete(`/api/announcements/${id}`);
            setAnnouncements(prev => prev.filter(a => a._id !== id));
            showToast('🗑️ Announcement deleted.');
        } catch {
            showToast('❌ Failed to delete. Please try again.');
        }
    };

    const filtered = filterType === 'all'
        ? announcements
        : announcements.filter(a => a.type === filterType);

    return (
        <div className="fd2-module">
            <div className="fd2-module-header">
                <div>
                    <h2 className="fd2-module-title">📢 Announcements</h2>
                    <p className="fd2-module-sub">Create and manage announcements visible to all students.</p>
                </div>
                <button
                    className="fd2-btn fd2-btn--primary"
                    onClick={() => setShowForm(s => !s)}
                >
                    {showForm ? '✕ Cancel' : '＋ New Announcement'}
                </button>
            </div>

            {/* Toast */}
            {toast && <div className="fd2-msg fd2-msg--success">{toast}</div>}

            {/* Create form */}
            {showForm && (
                <form className="fd2-ann-form" onSubmit={handleSubmit}>
                    <h4 className="fd2-form-title">📝 New Announcement</h4>
                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--full">
                            <label>Title *</label>
                            <input
                                className="fd2-form-input"
                                type="text"
                                placeholder="e.g. Assignment 4 Due Date"
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                required
                            />
                        </div>
                    </div>
                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>Type</label>
                            <select
                                className="fd2-form-select"
                                value={form.type}
                                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            >
                                {Object.entries(TYPE_META).map(([k, v]) => (
                                    <option key={k} value={k}>{v.icon} {v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>Subject</label>
                            <select
                                className="fd2-form-select"
                                value={form.subject}
                                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                            >
                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="fd2-form-group fd2-form-group--full">
                        <label>Description *</label>
                        <textarea
                            className="fd2-form-textarea"
                            rows={4}
                            placeholder="Write the announcement details here…"
                            value={form.desc}
                            onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                            required
                        />
                    </div>

                    {/* ── Attachment section ── */}
                    <div className="fd2-attach-section">
                        <div className="fd2-attach-label">📎 Attachment (optional)</div>
                        <div className="fd2-form-row">
                            <div className="fd2-form-group fd2-form-group--half">
                                <label>Link / URL</label>
                                <input
                                    className="fd2-form-input"
                                    type="url"
                                    placeholder="https://drive.google.com/… or any link"
                                    value={form.link}
                                    onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                                />
                            </div>
                            <div className="fd2-form-group fd2-form-group--half">
                                <label>Link Label (shown to students)</label>
                                <input
                                    className="fd2-form-input"
                                    type="text"
                                    placeholder="e.g. Assignment PDF, Reference Sheet…"
                                    value={form.attachment_name}
                                    onChange={e => setForm(f => ({ ...f, attachment_name: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="fd2-form-actions">
                        <button type="button" className="fd2-btn fd2-btn--ghost" onClick={() => setShowForm(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="fd2-btn fd2-btn--primary" disabled={submitting}>
                            {submitting ? 'Posting…' : '📢 Post Announcement'}
                        </button>
                    </div>
                </form>
            )}

            {/* Filter */}
            <div className="fd2-filter-row">
                {[
                    { key: 'all',        label: '🔍 All'          },
                    { key: 'assignment', label: '📝 Assignments'   },
                    { key: 'notice',     label: '📢 Notices'       },
                    { key: 'hallticket', label: '🎫 Hall Tickets'  },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`fd2-filter-btn ${filterType === f.key ? 'fd2-filter-btn--on' : ''}`}
                        onClick={() => setFilterType(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="fd2-ann-list">
                    {[1,2,3].map(i => (
                        <div key={i} className="fd2-ann-card fd2-ann-skeleton">
                            <div className="sd-skeleton-icon" />
                            <div className="sd-skeleton-body">
                                <div className="sd-skeleton-line sd-skeleton-line--wide" />
                                <div className="sd-skeleton-line" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="fd2-msg fd2-msg--error">⚠️ {error}
                    <button className="fd2-btn fd2-btn--ghost" style={{ marginLeft: '1rem' }} onClick={fetchAnnouncements}>Retry</button>
                </div>
            )}

            {/* List */}
            {!loading && !error && (
                <div className="fd2-ann-list">
                    {filtered.length === 0 ? (
                        <div className="fd2-empty-state">
                            <span>📭</span>
                            <p>No announcements yet. Create your first one!</p>
                        </div>
                    ) : filtered.map(a => {
                        const m = TYPE_META[a.type] || TYPE_META.notice;
                        return (
                            <div
                                key={a._id}
                                className="fd2-ann-card"
                                style={{ background: m.bg, borderColor: m.border }}
                            >
                                <div className="fd2-ann-icon-wrap" style={{ background: `${m.color}22`, color: m.color }}>
                                    {m.icon}
                                </div>
                                <div className="fd2-ann-body">
                                    <div className="fd2-ann-top">
                                        <span className="fd2-ann-title">{a.title}</span>
                                        <span className="fd2-ann-type-badge" style={{ color: m.color, background: `${m.color}18` }}>
                                            {m.label}
                                        </span>
                                    </div>
                                    <p className="fd2-ann-desc">{a.desc}</p>
                                    <div className="fd2-ann-meta">
                                        <span>📅 {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</span>
                                        <span>🏫 {a.subject}</span>
                                    </div>
                                </div>
                                <button
                                    className="fd2-ann-delete"
                                    title="Delete announcement"
                                    onClick={() => handleDelete(a._id)}
                                >
                                    🗑️
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FacultyAnnouncements;
