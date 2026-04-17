import { useState } from 'react';

const TYPE_META = {
    national:  { color: '#f59e0b', bg: 'rgba(245,158,11,.10)',  icon: '🇮🇳', label: 'National'  },
    religious: { color: '#8b5cf6', bg: 'rgba(139,92,246,.10)', icon: '🙏',  label: 'Religious' },
    festival:  { color: '#ec4899', bg: 'rgba(236,72,153,.10)', icon: '🎉',  label: 'Festival'  },
    academic:  { color: '#3b82f6', bg: 'rgba(59,130,246,.10)', icon: '📚',  label: 'Academic'  },
};

const SEED_HOLIDAYS = [
    { id: 1, date: '2026-01-01', name: "New Year's Day",      type: 'national'  },
    { id: 2, date: '2026-01-26', name: 'Republic Day',        type: 'national'  },
    { id: 3, date: '2026-02-28', name: 'Maha Shivaratri',     type: 'religious' },
    { id: 4, date: '2026-03-25', name: 'Holi',                type: 'festival'  },
    { id: 5, date: '2026-04-02', name: 'Good Friday',         type: 'religious' },
    { id: 6, date: '2026-04-14', name: 'Ambedkar Jayanti',    type: 'national'  },
    { id: 7, date: '2026-04-29', name: 'Summer Break Begins', type: 'academic'  },
    { id: 8, date: '2026-06-15', name: 'Summer Break Ends',   type: 'academic'  },
    { id: 9, date: '2026-08-15', name: 'Independence Day',    type: 'national'  },
    { id:10, date: '2026-10-02', name: 'Gandhi Jayanti',      type: 'national'  },
    { id:11, date: '2026-10-20', name: 'Dussehra',            type: 'festival'  },
    { id:12, date: '2026-11-12', name: 'Diwali',              type: 'festival'  },
    { id:13, date: '2026-12-25', name: 'Christmas Day',       type: 'religious' },
];

const FILTERS = ['all', 'national', 'religious', 'festival', 'academic'];

function FacultyHolidays() {
    const [holidays, setHolidays] = useState(SEED_HOLIDAYS);
    const [filter, setFilter]     = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]         = useState({ name: '', date: '', type: 'national' });
    const [added, setAdded]       = useState(false);
    const today = new Date();

    const filtered = (filter === 'all' ? holidays : holidays.filter(h => h.type === filter))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const upcoming = filtered.filter(h => new Date(h.date) >= today);
    const past     = filtered.filter(h => new Date(h.date) < today);

    const handleAdd = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.date) return;
        setHolidays(prev => [...prev, { id: Date.now(), ...form }]);
        setForm({ name: '', date: '', type: 'national' });
        setShowForm(false);
        setAdded(true);
        setTimeout(() => setAdded(false), 3000);
    };

    const handleDelete = (id) => setHolidays(prev => prev.filter(h => h.id !== id));

    const HolidayList = ({ list, heading }) =>
        list.length > 0 && (
            <>
                <h3 className="fd2-subheading">
                    {heading}
                    <span className="fd2-count-badge">{list.length}</span>
                </h3>
                <div className="fd2-holiday-list">
                    {list.map(h => {
                        const m    = TYPE_META[h.type];
                        const d    = new Date(h.date);
                        const isPast = d < today;
                        return (
                            <div
                                key={h.id}
                                className={`fd2-holiday-card ${isPast ? 'fd2-holiday-card--past' : ''}`}
                                style={{ background: m.bg, borderColor: `${m.color}55` }}
                            >
                                <div className="fd2-hday-date-box" style={{ background: `${m.color}22`, color: m.color }}>
                                    <span className="fd2-hday-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                                    <span className="fd2-hday-day">{d.toLocaleDateString('en-US', { day: '2-digit' })}</span>
                                    <span className="fd2-hday-yr">{d.getFullYear()}</span>
                                </div>
                                <div className="fd2-holiday-body">
                                    <span className="fd2-holiday-name">{m.icon} {h.name}</span>
                                    <span className="fd2-holiday-type" style={{ color: m.color }}>{m.label}</span>
                                </div>
                                {!isPast && (
                                    <div className="fd2-holiday-days-left">
                                        <span>{Math.ceil((d - today) / 86400000)}d</span>
                                        <span className="fd2-hday-left-lbl">left</span>
                                    </div>
                                )}
                                <button
                                    className="fd2-holiday-delete"
                                    title="Remove holiday"
                                    onClick={() => handleDelete(h.id)}
                                >🗑️</button>
                            </div>
                        );
                    })}
                </div>
            </>
        );

    return (
        <div className="fd2-module">
            <div className="fd2-module-header">
                <div>
                    <h2 className="fd2-module-title">🌴 Holidays 2026</h2>
                    <p className="fd2-module-sub">Manage and publish the academic holiday calendar.</p>
                </div>
                <button className="fd2-btn fd2-btn--primary" onClick={() => setShowForm(s => !s)}>
                    {showForm ? '✕ Cancel' : '＋ Add Holiday'}
                </button>
            </div>

            {added && (
                <div className="fd2-msg fd2-msg--success">✅ Holiday added to the calendar.</div>
            )}

            {showForm && (
                <form className="fd2-ann-form" onSubmit={handleAdd}>
                    <h4 className="fd2-form-title">📅 Add New Holiday</h4>
                    <div className="fd2-form-row">
                        <div className="fd2-form-group fd2-form-group--half">
                            <label>Holiday Name *</label>
                            <input
                                className="fd2-form-input"
                                type="text"
                                placeholder="e.g. Eid Al-Fitr"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="fd2-form-group fd2-form-group--quarter">
                            <label>Date *</label>
                            <input
                                className="fd2-form-input"
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="fd2-form-group fd2-form-group--quarter">
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
                    </div>
                    <div className="fd2-form-actions">
                        <button type="button" className="fd2-btn fd2-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
                        <button type="submit" className="fd2-btn fd2-btn--primary">📅 Add Holiday</button>
                    </div>
                </form>
            )}

            {/* Filters */}
            <div className="fd2-filter-row">
                {FILTERS.map(f => (
                    <button
                        key={f}
                        className={`fd2-filter-btn ${filter === f ? 'fd2-filter-btn--on' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? '🔍 All' : `${TYPE_META[f].icon} ${TYPE_META[f].label}`}
                    </button>
                ))}
            </div>

            <HolidayList list={upcoming} heading="📅 Upcoming Holidays" />
            <HolidayList list={past}     heading="✅ Past Holidays" />
        </div>
    );
}

export default FacultyHolidays;
