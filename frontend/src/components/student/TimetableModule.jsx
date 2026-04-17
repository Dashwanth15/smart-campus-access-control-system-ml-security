import { useState } from 'react';

const TIMETABLE = {
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

function TimetableModule() {
    const jsDay = new Date().getDay(); // 0=Sun, 1=Mon … 6=Sat
    const todayIndex = jsDay >= 1 && jsDay <= 6 ? jsDay - 1 : 0;
    const [activeDay, setActiveDay] = useState(DAYS[todayIndex]);

    const slots = TIMETABLE[activeDay] || [];

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">🗓️ Weekly Timetable</h2>

            {/* Day picker */}
            <div className="sd-day-tabs">
                {DAYS.map(d => (
                    <button
                        key={d}
                        className={`sd-day-tab ${activeDay === d ? 'sd-day-tab--on' : ''}`}
                        onClick={() => setActiveDay(d)}
                    >
                        <span className="sd-day-short">{d.slice(0, 3)}</span>
                        <span className="sd-day-full">{d}</span>
                    </button>
                ))}
            </div>

            {/* Schedule */}
            <div className="sd-schedule">
                {slots.length === 0 ? (
                    <div className="sd-empty-state">
                        <span className="sd-empty-icon">🎉</span>
                        <p>No classes scheduled for {activeDay}!</p>
                    </div>
                ) : slots.map((slot, i) => {
                    const color = SUBJECT_COLORS[slot.subject] || '#6366f1';
                    const isLab = slot.subject.includes('Lab');
                    return (
                        <div key={i} className={`sd-slot ${isLab ? 'sd-slot--lab' : ''}`}>
                            <div className="sd-slot-time">{slot.time}</div>
                            <div className="sd-slot-dot" style={{ background: color }} />
                            <div className="sd-slot-card" style={{ borderLeftColor: color }}>
                                <div className="sd-slot-icon">{slot.icon}</div>
                                <div className="sd-slot-info">
                                    <span className="sd-slot-subject">{slot.subject}</span>
                                    <span className="sd-slot-room">📍 {slot.room}</span>
                                </div>
                                {isLab && <span className="sd-lab-badge">Lab</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default TimetableModule;
