import { useState } from 'react';

const HOLIDAYS = [
    { date: '2026-01-01', name: "New Year's Day",         type: 'national'  },
    { date: '2026-01-26', name: 'Republic Day',           type: 'national'  },
    { date: '2026-02-28', name: 'Maha Shivaratri',        type: 'religious' },
    { date: '2026-03-25', name: 'Holi',                   type: 'festival'  },
    { date: '2026-04-02', name: 'Good Friday',            type: 'religious' },
    { date: '2026-04-14', name: 'Ambedkar Jayanti',       type: 'national'  },
    { date: '2026-04-29', name: 'Summer Break Begins',    type: 'academic'  },
    { date: '2026-06-15', name: 'Summer Break Ends',      type: 'academic'  },
    { date: '2026-08-15', name: 'Independence Day',       type: 'national'  },
    { date: '2026-09-05', name: "Teachers' Day",          type: 'academic'  },
    { date: '2026-10-02', name: 'Gandhi Jayanti',         type: 'national'  },
    { date: '2026-10-20', name: 'Dussehra',               type: 'festival'  },
    { date: '2026-11-12', name: 'Diwali',                 type: 'festival'  },
    { date: '2026-12-25', name: 'Christmas Day',          type: 'religious' },
];

const TYPE_META = {
    national:  { color: '#f59e0b', bg: 'rgba(245,158,11,.10)', icon: '🇮🇳', label: 'National'  },
    religious: { color: '#8b5cf6', bg: 'rgba(139,92,246,.10)', icon: '🙏',  label: 'Religious' },
    festival:  { color: '#ec4899', bg: 'rgba(236,72,153,.10)', icon: '🎉',  label: 'Festival'  },
    academic:  { color: '#3b82f6', bg: 'rgba(59,130,246,.10)', icon: '📚',  label: 'Academic'  },
};

const FILTERS = ['all', 'national', 'religious', 'festival', 'academic'];

function HolidaysModule() {
    const [filter, setFilter] = useState('all');
    const today = new Date();

    const filtered = (filter === 'all' ? HOLIDAYS : HOLIDAYS.filter(h => h.type === filter))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const upcoming = filtered.filter(h => new Date(h.date) >= today);
    const past     = filtered.filter(h => new Date(h.date) <  today);

    const HolidayList = ({ list, heading }) => (
        list.length > 0 && (
            <>
                <h3 className="sd-subheading">{heading} <span className="sd-count-badge">{list.length}</span></h3>
                <div className="sd-holiday-list">
                    {list.map((h, i) => {
                        const m   = TYPE_META[h.type];
                        const d   = new Date(h.date);
                        const isPast = d < today;
                        return (
                            <div
                                key={i}
                                className={`sd-holiday-card ${isPast ? 'sd-holiday-card--past' : ''}`}
                                style={{ background: m.bg, borderColor: `${m.color}55` }}
                            >
                                <div className="sd-hday-date-box" style={{ background: `${m.color}22`, color: m.color }}>
                                    <span className="sd-hday-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                                    <span className="sd-hday-day">{d.toLocaleDateString('en-US', { day: '2-digit' })}</span>
                                    <span className="sd-hday-yr">{d.getFullYear()}</span>
                                </div>
                                <div className="sd-holiday-body">
                                    <span className="sd-holiday-name">{m.icon} {h.name}</span>
                                    <span className="sd-holiday-type" style={{ color: m.color }}>{m.label}</span>
                                </div>
                                {!isPast && (
                                    <div className="sd-holiday-days-left">
                                        <span>{Math.ceil((d - today) / 86400000)}d</span>
                                        <span className="sd-hday-left-lbl">left</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>
        )
    );

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">🌴 Holidays 2026</h2>

            <div className="sd-filter-row">
                {FILTERS.map(f => (
                    <button
                        key={f}
                        className={`sd-filter-btn ${filter === f ? 'sd-filter-btn--on' : ''}`}
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

export default HolidaysModule;
