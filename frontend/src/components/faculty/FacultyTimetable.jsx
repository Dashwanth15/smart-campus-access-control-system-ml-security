import { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBJECT_COLORS = {
    'Mathematics':       '#6366f1',
    'Physics':           '#10b981',
    'Physics Lab':       '#10b981',
    'Data Structures':   '#f59e0b',
    'DS Lab':            '#f59e0b',
    'Computer Networks': '#3b82f6',
    'Networks Lab':      '#3b82f6',
    'Database Systems':  '#8b5cf6',
    'Operating Systems': '#ef4444',
};

const DEFAULT_TIMETABLE = {
    Monday:    [
        { time: '9:00 – 10:00',  subject: 'Mathematics',       room: 'A-101', icon: '📐' },
        { time: '10:00 – 11:00', subject: 'Physics',           room: 'B-204', icon: '⚛️' },
        { time: '11:15 – 12:15', subject: 'Data Structures',   room: 'Lab-1', icon: '🌳' },
        { time: '1:00 – 2:00',   subject: 'Computer Networks', room: 'A-103', icon: '🌐' },
    ],
    Tuesday:   [
        { time: '9:00 – 10:00',  subject: 'Database Systems',  room: 'C-301', icon: '💾' },
        { time: '10:00 – 12:00', subject: 'Physics Lab',       room: 'Lab-3', icon: '⚛️' },
        { time: '1:00 – 2:00',   subject: 'Operating Systems', room: 'A-102', icon: '🖥️' },
    ],
    Wednesday: [
        { time: '9:00 – 10:00',  subject: 'Mathematics',       room: 'A-101', icon: '📐' },
        { time: '10:00 – 11:00', subject: 'Data Structures',   room: 'A-104', icon: '🌳' },
        { time: '11:15 – 12:15', subject: 'Computer Networks', room: 'B-201', icon: '🌐' },
        { time: '1:00 – 3:00',   subject: 'DS Lab',            room: 'Lab-2', icon: '🌳' },
    ],
    Thursday:  [
        { time: '9:00 – 10:00',  subject: 'Physics',           room: 'B-204', icon: '⚛️' },
        { time: '10:00 – 11:00', subject: 'Operating Systems', room: 'A-102', icon: '🖥️' },
        { time: '11:15 – 12:15', subject: 'Database Systems',  room: 'C-301', icon: '💾' },
    ],
    Friday:    [
        { time: '9:00 – 11:00',  subject: 'Networks Lab',      room: 'Lab-4', icon: '🌐' },
        { time: '11:15 – 12:15', subject: 'Mathematics',       room: 'A-101', icon: '📐' },
        { time: '1:00 – 2:00',   subject: 'Operating Systems', room: 'A-102', icon: '🖥️' },
    ],
    Saturday:  [
        { time: '9:00 – 10:00',  subject: 'Database Systems',  room: 'C-301', icon: '💾' },
        { time: '10:00 – 11:00', subject: 'Data Structures',   room: 'A-104', icon: '🌳' },
    ],
};

const BLANK_SLOT = { time: '', subject: '', room: '', icon: '📚' };

function FacultyTimetable() {
    const jsDay    = new Date().getDay();
    const todayIdx = jsDay >= 1 && jsDay <= 6 ? jsDay - 1 : 0;
    const [activeDay, setActiveDay] = useState(DAYS[todayIdx]);
    const [timetable, setTimetable] = useState(DEFAULT_TIMETABLE);
    const [editMode, setEditMode]   = useState(false);
    const [saved, setSaved]         = useState(false);

    const slots = timetable[activeDay] || [];

    const handleSlotChange = (idx, field, value) => {
        setTimetable(prev => ({
            ...prev,
            [activeDay]: prev[activeDay].map((s, i) =>
                i === idx ? { ...s, [field]: value } : s
            )
        }));
    };

    const addSlot = () => {
        setTimetable(prev => ({
            ...prev,
            [activeDay]: [...(prev[activeDay] || []), { ...BLANK_SLOT }]
        }));
    };

    const removeSlot = (idx) => {
        setTimetable(prev => ({
            ...prev,
            [activeDay]: prev[activeDay].filter((_, i) => i !== idx)
        }));
    };

    const handleSave = () => {
        setEditMode(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="fd2-module">
            <div className="fd2-module-header">
                <div>
                    <h2 className="fd2-module-title">🗓️ Weekly Timetable</h2>
                    <p className="fd2-module-sub">View and edit the class schedule for each day.</p>
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                    {editMode ? (
                        <>
                            <button className="fd2-btn fd2-btn--ghost" onClick={() => setEditMode(false)}>Cancel</button>
                            <button className="fd2-btn fd2-btn--primary" onClick={handleSave}>💾 Save Timetable</button>
                        </>
                    ) : (
                        <button className="fd2-btn fd2-btn--primary" onClick={() => setEditMode(true)}>
                            ✏️ Edit Schedule
                        </button>
                    )}
                </div>
            </div>

            {saved && (
                <div className="fd2-msg fd2-msg--success">✅ Timetable saved successfully!</div>
            )}

            {/* Day tabs */}
            <div className="fd2-day-tabs">
                {DAYS.map(d => (
                    <button
                        key={d}
                        className={`fd2-day-tab ${activeDay === d ? 'fd2-day-tab--on' : ''}`}
                        onClick={() => setActiveDay(d)}
                    >
                        <span className="fd2-day-short">{d.slice(0, 3)}</span>
                        <span className="fd2-day-full">{d}</span>
                    </button>
                ))}
            </div>

            {/* Schedule */}
            <div className="fd2-schedule">
                {slots.length === 0 && !editMode ? (
                    <div className="fd2-empty-state">
                        <span>🎉</span>
                        <p>No classes scheduled for {activeDay}!</p>
                    </div>
                ) : slots.map((slot, i) => {
                    const color = SUBJECT_COLORS[slot.subject] || '#6366f1';
                    const isLab = slot.subject.includes('Lab');
                    return editMode ? (
                        <div key={i} className="fd2-slot-edit-card">
                            <div className="fd2-slot-edit-fields">
                                <input
                                    className="fd2-form-input"
                                    placeholder="Time (e.g. 9:00 – 10:00)"
                                    value={slot.time}
                                    onChange={e => handleSlotChange(i, 'time', e.target.value)}
                                />
                                <input
                                    className="fd2-form-input"
                                    placeholder="Subject"
                                    value={slot.subject}
                                    onChange={e => handleSlotChange(i, 'subject', e.target.value)}
                                />
                                <input
                                    className="fd2-form-input"
                                    placeholder="Room (e.g. A-101)"
                                    value={slot.room}
                                    onChange={e => handleSlotChange(i, 'room', e.target.value)}
                                />
                            </div>
                            <button
                                className="fd2-slot-remove"
                                onClick={() => removeSlot(i)}
                                title="Remove slot"
                            >✕</button>
                        </div>
                    ) : (
                        <div key={i} className={`fd2-slot ${isLab ? 'fd2-slot--lab' : ''}`}>
                            <div className="fd2-slot-time">{slot.time}</div>
                            <div className="fd2-slot-dot" style={{ background: color }} />
                            <div className="fd2-slot-card" style={{ borderLeftColor: color }}>
                                <div className="fd2-slot-icon">{slot.icon}</div>
                                <div className="fd2-slot-info">
                                    <span className="fd2-slot-subject">{slot.subject}</span>
                                    <span className="fd2-slot-room">📍 {slot.room}</span>
                                </div>
                                {isLab && <span className="fd2-lab-badge">Lab</span>}
                            </div>
                        </div>
                    );
                })}

                {editMode && (
                    <button className="fd2-add-slot-btn" onClick={addSlot}>
                        ＋ Add Slot
                    </button>
                )}
            </div>
        </div>
    );
}

export default FacultyTimetable;
