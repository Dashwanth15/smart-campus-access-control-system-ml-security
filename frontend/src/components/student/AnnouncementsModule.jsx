import { useState, useEffect } from 'react';
import API from '../../services/api';

const TYPE_META = {
    assignment: { bg: 'rgba(99,102,241,.1)',  border: 'rgba(99,102,241,.3)',  color: '#818cf8', label: 'Assignment',  icon: '📝' },
    notice:     { bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.3)',  color: '#fbbf24', label: 'Notice',      icon: '📢' },
    hallticket: { bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.3)',  color: '#34d399', label: 'Hall Ticket', icon: '🎫' },
};

function AnnouncementsModule() {
    const [items,   setItems]   = useState([]);
    const [filter,  setFilter]  = useState('all');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    const fetchAnnouncements = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await API.get('/api/announcements');
            setItems(res.data.announcements || []);
        } catch {
            setError('Could not load announcements. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnnouncements(); }, []);

    const filtered = filter === 'all' ? items : items.filter(a => a.type === filter);

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">📢 Announcements</h2>

            <div className="sd-filter-row">
                {[
                    { key: 'all',        label: '🔍 All'          },
                    { key: 'assignment', label: '📝 Assignments'   },
                    { key: 'notice',     label: '📢 Notices'       },
                    { key: 'hallticket', label: '🎫 Hall Tickets'  },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`sd-filter-btn ${filter === f.key ? 'sd-filter-btn--on' : ''}`}
                        onClick={() => setFilter(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="sd-ann-list">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="sd-ann-card sd-ann-skeleton">
                            <div className="sd-skeleton-icon" />
                            <div className="sd-skeleton-body">
                                <div className="sd-skeleton-line sd-skeleton-line--wide" />
                                <div className="sd-skeleton-line" />
                                <div className="sd-skeleton-line sd-skeleton-line--short" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="sd-ann-error">
                    <span>⚠️</span>
                    <p>{error}</p>
                    <button className="sd-btn sd-btn--primary" onClick={fetchAnnouncements}>
                        Retry
                    </button>
                </div>
            )}

            {/* List */}
            {!loading && !error && (
                <div className="sd-ann-list">
                    {filtered.length === 0 ? (
                        <div className="sd-ann-empty">
                            <span>📭</span>
                            <p>No announcements found</p>
                        </div>
                    ) : filtered.map(a => {
                        const s = TYPE_META[a.type] || TYPE_META.notice;
                        return (
                            <div
                                key={a._id}
                                className="sd-ann-card"
                                style={{ background: s.bg, borderColor: s.border }}
                            >
                                <div className="sd-ann-icon-wrap" style={{ background: `${s.color}22`, color: s.color }}>
                                    {s.icon}
                                </div>
                                <div className="sd-ann-body">
                                    <div className="sd-ann-top">
                                        <span className="sd-ann-title">{a.title}</span>
                                        <span className="sd-ann-type-badge" style={{ color: s.color, background: `${s.color}15` }}>
                                            {s.label}
                                        </span>
                                    </div>
                                    <p className="sd-ann-desc">{a.desc}</p>

                                    {/* Attachment link */}
                                    {a.link && (
                                        <a
                                            href={a.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="sd-ann-attachment"
                                            style={{ borderColor: s.color, color: s.color, background: `${s.color}12` }}
                                        >
                                            <span>📎</span>
                                            <span>{a.attachment_name || 'Open Attachment'}</span>
                                            <span className="sd-ann-attach-arrow">↗️</span>
                                        </a>
                                    )}

                                    <div className="sd-ann-meta">
                                        <span>📅 {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</span>
                                        <span>🏫 {a.subject}</span>
                                        {a.created_by_name && <span>👤 {a.created_by_name}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default AnnouncementsModule;
