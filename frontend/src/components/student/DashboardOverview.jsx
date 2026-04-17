function DashboardOverview({ studentData, user, onNavigate }) {
    const details = [
        { icon: '🎓', label: 'University',     value: 'Smart Campus University'                       },
        { icon: '👤', label: 'Student Name',   value: user?.name || 'Student'                         },
        { icon: '🎫', label: 'Student ID',     value: studentData?.student_id || 'STU-XXXX'           },
        { icon: '📚', label: 'Course',         value: studentData?.course || 'B.Tech Computer Science' },
        { icon: '📅', label: 'Academic Year',  value: '2024 – 2028'                                   },
        { icon: '🏷️', label: 'Semester',       value: `Semester ${studentData?.semester || 4}`        },
        { icon: '📧', label: 'Email',          value: user?.email || 'student@smartcampus.edu'        },
        { icon: '🟢', label: 'Status',         value: 'Active – Enrolled'                             },
    ];

    const QUICK_ACTIONS = [
        { icon: '📅', label: 'Attendance',    sub: 'View your attendance records',  section: 'attendance',    color: '#10b981', glow: 'rgba(16,185,129,0.35)'  },
        { icon: '🗓️', label: 'Timetable',     sub: 'Check weekly class schedule',   section: 'timetable',     color: '#6366f1', glow: 'rgba(99,102,241,0.35)'   },
        { icon: '📊', label: 'Final Result',  sub: 'Semester-wise marks & grades',  section: 'result',        color: '#f59e0b', glow: 'rgba(245,158,11,0.35)'   },
        { icon: '📢', label: 'Announcements', sub: 'Notices, assignments & more',   section: 'announcements', color: '#ec4899', glow: 'rgba(236,72,153,0.35)'   },
    ];

    const initials = (user?.name || 'S')
        .trim()
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="sd-profile-page sd-page-fadein">

            {/* ── Greeting ── */}
            <div className="sd-greeting">
                <div className="sd-greeting-left">
                    <h1 className="sd-greeting-title">
                        Welcome back, <span className="sd-greeting-name">{user?.name || 'Student'}</span> 👋
                    </h1>
                    <p className="sd-greeting-sub">
                        Here is your academic profile for the <b>2024 – 2028</b> academic year.
                    </p>
                </div>
                <div className="sd-greeting-right">
                    <span className="sd-greeting-sem">
                        📅 Sem {studentData?.semester || 4}
                    </span>
                </div>
            </div>

            {/* ── Profile card ── */}
            <div className="sd-profile-card sd-profile-card--hover">

                {/* Left – avatar */}
                <div className="sd-profile-left">
                    <div className="sd-avatar-glow-wrap">
                        <div className="sd-avatar-ring">
                            <div className="sd-avatar">{initials}</div>
                        </div>
                    </div>
                    <h2 className="sd-profile-name">{user?.name || 'Student'}</h2>
                    <p className="sd-profile-role">Undergraduate Student</p>
                    <p className="sd-profile-dept">{studentData?.course || 'B.Tech CSE'}</p>
                    <span className="sd-profile-status">
                        <span className="sd-status-dot" /> Active
                    </span>
                    <div className="sd-profile-sem-tag">
                        Semester {studentData?.semester || 4}
                    </div>
                </div>

                {/* Right – details */}
                <div className="sd-profile-right">
                    <p className="sd-profile-section-title">🗂️ Personal &amp; Academic Information</p>
                    <div className="sd-details-grid">
                        {details.map((d, i) => (
                            <div
                                key={d.label}
                                className="sd-detail-item"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <span className="sd-detail-icon">{d.icon}</span>
                                <div className="sd-detail-body">
                                    <span className="sd-detail-label">{d.label}</span>
                                    <span className="sd-detail-value">{d.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="sd-qa-header">
                <h3 className="sd-qa-title">⚡ Quick Actions</h3>
                <span className="sd-qa-sub">Jump to any section directly</span>
            </div>
            <div className="sd-hint-grid">
                {QUICK_ACTIONS.map((h, i) => (
                    <button
                        key={h.section}
                        className="sd-hint-card"
                        style={{
                            '--qa-color': h.color,
                            '--qa-glow':  h.glow,
                            animationDelay: `${i * 0.07}s`,
                        }}
                        onClick={() => onNavigate?.(h.section)}
                    >
                        <div
                            className="sd-hint-icon-wrap"
                            style={{ background: `${h.color}1a`, border: `1px solid ${h.color}44` }}
                        >
                            <span className="sd-hint-icon">{h.icon}</span>
                        </div>
                        <div className="sd-hint-body">
                            <div className="sd-hint-label">{h.label}</div>
                            <div className="sd-hint-sub">{h.sub}</div>
                        </div>
                        <span className="sd-hint-arrow" style={{ color: h.color }}>→</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default DashboardOverview;
