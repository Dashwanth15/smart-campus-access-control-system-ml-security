function FacultyDashboardOverview({ user, facultyData, onNavigate }) {
    const details = [
        { icon: '👤', label: 'Faculty Name',   value: user?.name || 'Faculty' },
        { icon: '🎫', label: 'Faculty ID',     value: facultyData?.faculty_id || 'FAC-001' },
        { icon: '🏛️', label: 'Department',     value: facultyData?.department || 'Computer Science' },
        { icon: '📚', label: 'Subjects',       value: facultyData?.subjects?.join(', ') || 'Mathematics, Physics, Data Structures' },
        { icon: '🏆', label: 'Experience',     value: facultyData?.experience || '8 Years' },
        { icon: '📧', label: 'Email',          value: user?.email || 'faculty@smartcampus.edu' },
        { icon: '🟢', label: 'Status',         value: 'Active – Faculty' },
        { icon: '🎓', label: 'University',     value: 'Smart Campus University' },
    ];

    const QUICK_ACTIONS = [
        { icon: '📋', label: 'Student Records', sub: 'View & edit student data',     section: 'students',       color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
        { icon: '📢', label: 'Announcements',   sub: 'Post notices & assignments',   section: 'announcements',  color: '#6366f1', glow: 'rgba(99,102,241,0.35)' },
        { icon: '💬', label: 'Feedbacks',       sub: 'Read student feedbacks',       section: 'feedbacks',      color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
        { icon: '📖', label: 'Books & Materials',sub: 'Upload study resources',      section: 'books',          color: '#ec4899', glow: 'rgba(236,72,153,0.35)' },
    ];

    const initials = (user?.name || 'F')
        .trim()
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div className="fd2-profile-page fd2-page-fadein">

            {/* Greeting */}
            <div className="fd2-greeting">
                <div className="fd2-greeting-left">
                    <h1 className="fd2-greeting-title">
                        Welcome, <span className="fd2-greeting-name">{user?.name || 'Faculty'}</span> 👋
                    </h1>
                    <p className="fd2-greeting-sub">
                        Manage your students, materials and campus activities from one place.
                    </p>
                </div>
                <div className="fd2-greeting-right">
                    <span className="fd2-dept-badge">
                        🏛️ {facultyData?.department || 'Computer Science'}
                    </span>
                </div>
            </div>

            {/* Profile card */}
            <div className="fd2-profile-card fd2-profile-card--hover">
                {/* Left – avatar */}
                <div className="fd2-profile-left">
                    <div className="fd2-avatar-glow-wrap">
                        <div className="fd2-avatar-ring">
                            <div className="fd2-avatar">{initials}</div>
                        </div>
                    </div>
                    <h2 className="fd2-profile-name">{user?.name || 'Faculty'}</h2>
                    <p className="fd2-profile-role">Faculty Member</p>
                    <p className="fd2-profile-dept">{facultyData?.department || 'Computer Science'}</p>
                    <span className="fd2-profile-status">
                        <span className="fd2-status-dot" /> Active
                    </span>
                    <div className="fd2-experience-tag">
                        {facultyData?.experience || '8 Years'} Experience
                    </div>
                </div>

                {/* Right – details */}
                <div className="fd2-profile-right">
                    <p className="fd2-profile-section-title">🗂️ Faculty Information</p>
                    <div className="fd2-details-grid">
                        {details.map((d, i) => (
                            <div
                                key={d.label}
                                className="fd2-detail-item"
                                style={{ animationDelay: `${i * 0.05}s` }}
                            >
                                <span className="fd2-detail-icon">{d.icon}</span>
                                <div className="fd2-detail-body">
                                    <span className="fd2-detail-label">{d.label}</span>
                                    <span className="fd2-detail-value">{d.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="fd2-qa-header">
                <h3 className="fd2-qa-title">⚡ Quick Actions</h3>
                <span className="fd2-qa-sub">Jump to any section directly</span>
            </div>
            <div className="fd2-hint-grid">
                {QUICK_ACTIONS.map((h, i) => (
                    <button
                        key={h.section}
                        className="fd2-hint-card"
                        style={{
                            '--qa-color': h.color,
                            '--qa-glow':  h.glow,
                            animationDelay: `${i * 0.07}s`,
                        }}
                        onClick={() => onNavigate?.(h.section)}
                    >
                        <div
                            className="fd2-hint-icon-wrap"
                            style={{ background: `${h.color}1a`, border: `1px solid ${h.color}44` }}
                        >
                            <span className="fd2-hint-icon">{h.icon}</span>
                        </div>
                        <div className="fd2-hint-body">
                            <div className="fd2-hint-label">{h.label}</div>
                            <div className="fd2-hint-sub">{h.sub}</div>
                        </div>
                        <span className="fd2-hint-arrow" style={{ color: h.color }}>→</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default FacultyDashboardOverview;
