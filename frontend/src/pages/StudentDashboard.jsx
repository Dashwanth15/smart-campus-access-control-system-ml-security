import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import '../styles/student-dashboard.css';

import DashboardOverview from '../components/student/DashboardOverview';
import AttendanceModule from '../components/student/AttendanceModule';
import AnnouncementsModule from '../components/student/AnnouncementsModule';
import TimetableModule from '../components/student/TimetableModule';
import HolidaysModule from '../components/student/HolidaysModule';
import FeedbackModule from '../components/student/FeedbackModule';
import ResultModule from '../components/student/ResultModule';
import BookStoreModule from '../components/student/BookStoreModule';

const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'attendance', label: 'Attendance', icon: '📅' },
    { key: 'announcements', label: 'Announcements', icon: '📢' },
    { key: 'timetable', label: 'Timetable', icon: '🗓️' },
    { key: 'holidays', label: 'Holidays', icon: '🌴' },
    { key: 'feedback', label: 'Feedback', icon: '💬' },
    { key: 'result', label: 'Final Result', icon: '📊' },
    { key: 'bookstore', label: 'Book Store', icon: '📚' },
];

function StudentDashboard({ onLogout }) {
    const { user } = useAuth();
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState('');
    const [activeSection, setActiveSection] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen]     = useState(false);
    const [showUserMenu, setShowUserMenu]   = useState(false);
    const [currentTime, setCurrentTime]     = useState(new Date());
    const menuRef = useRef(null);

    useEffect(() => { fetchStudentData(); }, []);

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

    const fetchStudentData = async () => {
        try {
            const res = await API.get('/api/students/me');
            setStudentData(res.data);
        } catch (err) {
            setError('Failed to load student data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const navigate = (key) => {
        setActiveSection(key);
        setSidebarOpen(false);
    };

    const renderModule = () => {
        switch (activeSection) {
            case 'dashboard': return <DashboardOverview studentData={studentData} user={user} onNavigate={navigate} />;
            case 'attendance': return <AttendanceModule studentData={studentData} />;
            case 'announcements': return <AnnouncementsModule />;
            case 'timetable': return <TimetableModule />;
            case 'holidays': return <HolidaysModule />;
            case 'feedback': return <FeedbackModule user={user} />;
            case 'result': return <ResultModule studentData={studentData} />;
            case 'bookstore': return <BookStoreModule />;
            default: return <DashboardOverview studentData={studentData} user={user} />;
        }
    };

    if (loading) {
        return (
            <div className="sd-loader">
                <div className="sd-spinner" />
                <p>Loading your portal…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sd-loader">
                <span style={{ fontSize: '2rem' }}>⚠️</span>
                <p>{error}</p>
                <button className="sd-btn sd-btn--primary" onClick={fetchStudentData}>Retry</button>
            </div>
        );
    }

    const activeItem = NAV_ITEMS.find(n => n.key === activeSection);

    return (
        <div className="sd-portal">

            {/* ── SIDEBAR ────────────────────────────────── */}
            <aside className={`sd-sidebar ${sidebarOpen ? 'sd-sidebar--open' : ''}`}>
                {/* Brand mark */}
                <div className="sd-sidebar-brand">
                    <span className="sd-sidebar-brand-icon">🎓</span>
                    <span className="sd-sidebar-brand-name">Smart Campus</span>
                </div>

                {/* Nav items */}
                <nav className="sd-nav">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.key}
                            id={`sd-nav-${item.key}`}
                            className={`sd-nav-item ${activeSection === item.key ? 'sd-nav-item--active' : ''}`}
                            onClick={() => navigate(item.key)}
                        >
                            <span className="sd-nav-icon">{item.icon}</span>
                            <span className="sd-nav-label">{item.label}</span>
                            {activeSection === item.key && <span className="sd-nav-pip" />}
                        </button>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sd-sidebar-ftr">
                    <div className="sd-user-chip">
                        <div className="sd-user-ava">
                            {(user?.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="sd-user-details">
                            <span className="sd-user-name">{user?.name || 'Student'}</span>
                            <span className="sd-user-id">{studentData?.student_id || 'STU-XXXX'}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div className="sd-overlay" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── MAIN ───────────────────────────────────── */}
            <main className="sd-main">
                {/* Top bar */}
                <div className="sd-topbar">
                    <button
                        id="sd-hamburger"
                        className="sd-hamburger"
                        onClick={() => setSidebarOpen(s => !s)}
                        aria-label="Toggle sidebar"
                    >
                        ☰
                    </button>

                    {/* Brand logo — mirrors admin header */}
                    <div className="sd-topbar-brand">
                        <div className="sd-topbar-brand-icon">🏛️</div>
                        <div className="sd-topbar-brand-text">
                            <span className="sd-topbar-brand-name">Smart Campus</span>
                            <span className="sd-topbar-brand-sub">Student Portal</span>
                        </div>
                    </div>

                    <div className="sd-topbar-breadcrumb">
                        <span className="sd-topbar-icon">{activeItem?.icon}</span>
                        <span className="sd-topbar-label">{activeItem?.label}</span>
                    </div>
                    {/* ── Topbar right — mirrors admin header exactly ── */}
                    <div className="sd-topbar-right">

                        {/* Live clock */}
                        <div className="sd-time-display">
                            <span className="sd-time">{fmtTime(currentTime)}</span>
                            <span className="sd-date">{fmtDate(currentTime)}</span>
                        </div>

                        {/* Semester badge */}
                        <span className="sd-sem-badge">Sem {studentData?.semester || 4}</span>

                        {/* User profile + dropdown */}
                        <div className="sd-user-profile-wrapper" ref={menuRef}>
                            <div
                                className="sd-user-profile"
                                onClick={() => setShowUserMenu(m => !m)}
                                title="Account options"
                            >
                                <div className="sd-top-avatar">🎓</div>
                                <div className="sd-user-info">
                                    <span className="sd-user-name">{user?.name || 'Student'}</span>
                                    <span className="sd-user-role">STUDENT</span>
                                </div>
                                <span className="sd-dropdown-arrow">▼</span>
                            </div>

                            {showUserMenu && (
                                <div className="sd-user-menu animate-fade-in">
                                    <div className="sd-menu-header">
                                        <span className="sd-menu-email">{user?.email || user?.name}</span>
                                    </div>
                                    <div className="sd-menu-divider" />
                                    <button
                                        className="sd-menu-item"
                                        onClick={() => { setShowUserMenu(false); setActiveSection('dashboard'); }}
                                    >
                                        <span>🏠</span> My Dashboard
                                    </button>
                                    <div className="sd-menu-divider" />
                                    <button
                                        className="sd-menu-item sd-menu-item--logout"
                                        onClick={() => { setShowUserMenu(false); onLogout && onLogout(); }}
                                    >
                                        <span>🚪</span> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Module area — key forces remount + fade */}
                <div className="sd-module-area" key={activeSection}>
                    {renderModule()}
                </div>
            </main>
        </div>
    );
}

export default StudentDashboard;
