const SUBJECT_ATTENDANCE = [
    { subject: 'Mathematics',       icon: '📐', attended: 38, total: 42, color: '#6366f1' },
    { subject: 'Physics',           icon: '⚛️', attended: 35, total: 40, color: '#10b981' },
    { subject: 'Data Structures',   icon: '🌳', attended: 40, total: 44, color: '#f59e0b' },
    { subject: 'Computer Networks', icon: '🌐', attended: 30, total: 38, color: '#3b82f6' },
    { subject: 'Database Systems',  icon: '💾', attended: 36, total: 40, color: '#8b5cf6' },
    { subject: 'Operating Systems', icon: '🖥️', attended: 28, total: 36, color: '#ef4444' },
];

function AttendanceModule({ studentData }) {
    const overall  = studentData?.attendance?.percentage || 0;
    const attended = studentData?.attendance?.attended || 0;
    const total    = studentData?.attendance?.total_classes || 0;
    const missed   = total - attended;

    return (
        <div className="sd-module">
            <h2 className="sd-module-title">📅 Attendance Overview</h2>

            {/* Overall summary */}
            <div className="sd-att-overview">
                <div className="sd-att-ring-big-wrap">
                    <div className="sd-att-ring-big" style={{ '--pct': overall }}>
                        <span className="sd-att-ring-big-val">{overall}%</span>
                        <span className="sd-att-ring-big-lbl">Overall</span>
                    </div>
                </div>
                <div className="sd-att-cards">
                    {[
                        { icon: '✅', val: attended, lbl: 'Classes Attended', cls: 'sd-att-card--green' },
                        { icon: '❌', val: missed,   lbl: 'Classes Missed',   cls: 'sd-att-card--red'   },
                        { icon: '📚', val: total,    lbl: 'Total Classes',    cls: 'sd-att-card--blue'  },
                        { icon: overall >= 75 ? '😊' : '⚠️', val: overall >= 75 ? 'Good' : 'Low', lbl: 'Status', cls: overall >= 75 ? 'sd-att-card--green' : 'sd-att-card--red' },
                    ].map(c => (
                        <div key={c.lbl} className={`sd-att-card ${c.cls}`}>
                            <div className="sd-att-card-icon">{c.icon}</div>
                            <div className="sd-att-card-val">{c.val}</div>
                            <div className="sd-att-card-lbl">{c.lbl}</div>
                        </div>
                    ))}
                </div>
            </div>

            {overall < 75 && (
                <div className="sd-att-warning">
                    ⚠️ Your attendance is below 75%. You need to attend at least{' '}
                    <b>{Math.ceil((0.75 * total - attended) / 0.25)} more classes</b> to meet the requirement.
                </div>
            )}

            {/* Subject-wise */}
            <h3 className="sd-subheading">Subject-wise Breakdown</h3>
            <div className="sd-subatt-grid">
                {SUBJECT_ATTENDANCE.map(s => {
                    const p = Math.round((s.attended / s.total) * 100);
                    return (
                        <div key={s.subject} className="sd-subatt-card">
                            <div className="sd-subatt-header">
                                <span className="sd-subatt-name">{s.icon} {s.subject}</span>
                                <span className="sd-subatt-pct" style={{ color: s.color }}>{p}%</span>
                            </div>
                            <div className="sd-subatt-bar-track">
                                <div className="sd-subatt-bar" style={{ width: `${p}%`, background: s.color }} />
                            </div>
                            <div className="sd-subatt-footer">
                                <span>✅ {s.attended} attended</span>
                                <span>❌ {s.total - s.attended} missed</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AttendanceModule;
