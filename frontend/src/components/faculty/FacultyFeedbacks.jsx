import { useState, useEffect } from 'react';
import API from '../../services/api';

const TYPE_META = {
    marks:      { color: '#818cf8', bg: 'rgba(99,102,241,.10)',  border: 'rgba(99,102,241,.28)', icon: '📊', label: 'Marks'      },
    attendance: { color: '#fbbf24', bg: 'rgba(245,158,11,.10)', border: 'rgba(245,158,11,.28)', icon: '📅', label: 'Attendance' },
    general:    { color: '#34d399', bg: 'rgba(16,185,129,.10)', border: 'rgba(16,185,129,.28)', icon: '💬', label: 'General'    },
};

function FacultyFeedbacks() {
    const [feedbacks,      setFeedbacks]      = useState([]);
    const [loading,        setLoading]        = useState(true);
    const [error,          setError]          = useState('');
    const [filterType,     setFilterType]     = useState('all');

    const fetchFeedbacks = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await API.get('/api/feedback');
            setFeedbacks(res.data.feedback || []);
        } catch {
            setError('Could not load feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFeedbacks(); }, []);

    const filtered = feedbacks.filter(f =>
        filterType === 'all' || f.type === filterType
    );

    const countFor = (key) => feedbacks.filter(f => f.type === key).length;

    return (
        <div className="fd2-module">
            <h2 className="fd2-module-title">💬 Student Feedbacks</h2>
            <p className="fd2-module-sub">Real feedback sent to you by students.</p>

            {/* Stats */}
            <div className="fd2-fb-stats">
                {Object.entries(TYPE_META).map(([key, m]) => (
                    <div key={key} className="fd2-fb-stat" style={{ borderColor: m.border, background: m.bg }}>
                        <span className="fd2-fb-stat-icon" style={{ color: m.color }}>{m.icon}</span>
                        <div>
                            <div className="fd2-fb-stat-count" style={{ color: m.color }}>{countFor(key)}</div>
                            <div className="fd2-fb-stat-label">{m.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="fd2-filter-row">
                {['all', 'marks', 'attendance', 'general'].map(t => (
                    <button
                        key={t}
                        className={`fd2-filter-btn ${filterType === t ? 'fd2-filter-btn--on' : ''}`}
                        onClick={() => setFilterType(t)}
                    >
                        {t === 'all' ? '🔍 All' : `${TYPE_META[t].icon} ${TYPE_META[t].label}`}
                    </button>
                ))}
                <button className="fd2-filter-btn" style={{ marginLeft: 'auto' }} onClick={fetchFeedbacks}>
                    🔄 Refresh
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="fd2-fb-list">
                    {[1,2,3].map(i => (
                        <div key={i} className="fd2-fb-card fd2-ann-skeleton" style={{ padding: '1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
                            <div className="sd-skeleton-line sd-skeleton-line--wide" style={{ marginBottom: '.5rem' }} />
                            <div className="sd-skeleton-line" />
                        </div>
                    ))}
                </div>
            )}

            {!loading && error && (
                <div className="fd2-msg fd2-msg--error">
                    ⚠️ {error}
                    <button className="fd2-btn fd2-btn--ghost" style={{ marginLeft: '1rem' }} onClick={fetchFeedbacks}>Retry</button>
                </div>
            )}

            {/* Feedback cards */}
            {!loading && !error && (
                <div className="fd2-fb-list">
                    {filtered.length === 0 ? (
                        <div className="fd2-empty-state">
                            <span>📭</span>
                            <p>
                                {feedbacks.length === 0
                                    ? 'No feedback received yet. Students can send you feedback from their dashboard.'
                                    : 'No feedbacks match the current filter.'}
                            </p>
                        </div>
                    ) : filtered.map(fb => {
                        const m = TYPE_META[fb.type] || TYPE_META.general;
                        return (
                            <div
                                key={fb._id}
                                className="fd2-fb-card"
                                style={{ background: m.bg, borderColor: m.border }}
                            >
                                <div className="fd2-fb-card-top">
                                    <div className="fd2-fb-avatar">
                                        {(fb.sender_name || 'S').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="fd2-fb-meta">
                                        <span className="fd2-fb-from">{fb.sender_name || 'Student'}</span>
                                        <div className="fd2-fb-tags">
                                            <span className="fd2-fb-tag" style={{ color: m.color, background: `${m.color}18` }}>
                                                {m.icon} {m.label}
                                            </span>
                                            <span className="fd2-fb-tag fd2-fb-tag--date">
                                                📅 {fb.created_at ? new Date(fb.created_at).toLocaleDateString() : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p className="fd2-fb-text">"{fb.message}"</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default FacultyFeedbacks;
