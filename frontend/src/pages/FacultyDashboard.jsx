import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/faculty-dashboard.css';

import FacultyDashboardOverview from '../components/faculty/FacultyDashboardOverview';
import StudentRecords from '../components/faculty/StudentRecords';
import FacultyAnnouncements from '../components/faculty/FacultyAnnouncements';
import FacultyFeedbacks from '../components/faculty/FacultyFeedbacks';
import FacultyBooks from '../components/faculty/FacultyBooks';
import FacultyHolidays from '../components/faculty/FacultyHolidays';
import FacultyTimetable from '../components/faculty/FacultyTimetable';

const NAV_ITEMS = [
    { key: 'dashboard',      label: 'Dashboard',       icon: '🏠' },
    { key: 'students',       label: 'Student Records',  icon: '📋' },
    { key: 'feedbacks',      label: 'Feedbacks',        icon: '💬' },
    { key: 'announcements',  label: 'Announcements',    icon: '📢' },
    { key: 'books',          label: 'Books & Materials', icon: '📖' },
    { key: 'holidays',       label: 'Holidays',         icon: '🌴' },
    { key: 'timetable',      label: 'Timetable',        icon: '🗓️' },
];

const FACULTY_DATA = {
    faculty_id:  'FAC-001',
    department:  'Computer Science',
    subjects:    ['Mathematics', 'Physics', 'Data Structures'],
    experience:  '8 Years',
};

function FacultyDashboard({ onLogout }) {
    const { user } = useAuth();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarOpen,   setSidebarOpen]   = useState(false);
    const [showUserMenu,  setShowUserMenu]  = useState(false);
    const [currentTime,   setCurrentTime]   = useState(new Date());
    const menuRef = useRef(null);

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    const navigate = (key) => {
        setActiveSection(key);
        setSidebarOpen(false);
    };

    const renderModule = () => {
        switch (activeSection) {
            case 'dashboard':     return <FacultyDashboardOverview user={user} facultyData={FACULTY_DATA} onNavigate={navigate} />;
            case 'students':      return <StudentRecords />;
            case 'announcements': return <FacultyAnnouncements />;
            case 'feedbacks':     return <FacultyFeedbacks />;
            case 'books':         return <FacultyBooks />;
            case 'holidays':      return <FacultyHolidays />;
            case 'timetable':     return <FacultyTimetable />;
            default:              return <FacultyDashboardOverview user={user} facultyData={FACULTY_DATA} onNavigate={navigate} />;
        }
    };

    const activeItem = NAV_ITEMS.find(n => n.key === activeSection);

    return (
        <div className="fd2-portal">

            {/* ── SIDEBAR ─────────────────────────────── */}
            <aside className={`fd2-sidebar ${sidebarOpen ? 'fd2-sidebar--open' : ''}`}>

                {/* Brand */}
                <div className="fd2-sidebar-brand">
                    <span className="fd2-sidebar-brand-icon">👨‍🏫</span>
                    <span className="fd2-sidebar-brand-name">Faculty Portal</span>
                </div>

                {/* Nav */}
                <nav className="fd2-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            id={`fd2-nav-${item.key}`}
                            className={`fd2-nav-item ${activeSection === item.key ? 'fd2-nav-item--active' : ''}`}
                            onClick={() => navigate(item.key)}
                        >
                            <span className="fd2-nav-icon">{item.icon}</span>
                            <span className="fd2-nav-label">{item.label}</span>
                            {activeSection === item.key && <span className="fd2-nav-pip" />}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="fd2-sidebar-ftr">
                    <div className="fd2-user-chip">
                        <div className="fd2-user-ava">
                            {(user?.name || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div className="fd2-user-details">
                            <span className="fd2-user-name">{user?.name || 'Faculty'}</span>
                            <span className="fd2-user-id">{FACULTY_DATA.faculty_id}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="fd2-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── MAIN ────────────────────────────────── */}
            <main className="fd2-main">

                {/* Top bar */}
                <div className="fd2-topbar">
                    <button
                        id="fd2-hamburger"
                        className="fd2-hamburger"
                        onClick={() => setSidebarOpen(s => !s)}
                        aria-label="Toggle sidebar"
                    >
                        ☰
                    </button>

                    {/* Brand logo — mirrors admin header */}
                    <div className="fd2-topbar-brand">
                        <div className="fd2-topbar-brand-icon">🏛️</div>
                        <div className="fd2-topbar-brand-text">
                            <span className="fd2-topbar-brand-name">Smart Campus</span>
                            <span className="fd2-topbar-brand-sub">Faculty Portal</span>
                        </div>
                    </div>

                    <div className="fd2-topbar-breadcrumb">
                        <span className="fd2-topbar-icon">{activeItem?.icon}</span>
                        <span className="fd2-topbar-label">{activeItem?.label}</span>
                    </div>

                    {/* ── Topbar right — mirrors admin header exactly ── */}
                    <div className="fd2-topbar-right">

                        {/* Live clock */}
                        <div className="fd2-time-display">
                            <span className="fd2-time">{fmtTime(currentTime)}</span>
                            <span className="fd2-date">{fmtDate(currentTime)}</span>
                        </div>

                        {/* Dept pill */}
                        <span className="fd2-dept-pill">🏛️ {FACULTY_DATA.department}</span>

                        {/* User profile + dropdown */}
                        <div className="fd2-user-profile-wrapper" ref={menuRef}>
                            <div
                                className="fd2-user-profile"
                                onClick={() => setShowUserMenu(m => !m)}
                                title="Account options"
                            >
                                <div className="fd2-top-avatar">👨‍🏫</div>
                                <div className="fd2-user-info">
                                    <span className="fd2-user-name-top">{user?.name || 'Faculty'}</span>
                                    <span className="fd2-user-role-top">FACULTY</span>
                                </div>
                                <span className="fd2-dropdown-arrow">▼</span>
                            </div>

                            {showUserMenu && (
                                <div className="fd2-user-menu animate-fade-in">
                                    <div className="fd2-menu-header">
                                        <span className="fd2-menu-email">{user?.email || user?.name}</span>
                                    </div>
                                    <div className="fd2-menu-divider" />
                                    <button
                                        className="fd2-menu-item"
                                        onClick={() => { setShowUserMenu(false); setActiveSection('dashboard'); }}
                                    >
                                        <span>🏠</span> My Dashboard
                                    </button>
                                    <div className="fd2-menu-divider" />
                                    <button
                                        className="fd2-menu-item fd2-menu-item--logout"
                                        onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                                    >
                                        <span>🚪</span> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Module area */}
                <div className="fd2-module-area" key={activeSection}>
                    {renderModule()}
                </div>
            </main>
        </div>
    );
}

export default FacultyDashboard;
