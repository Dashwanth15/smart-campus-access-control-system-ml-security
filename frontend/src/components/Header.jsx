import { useState, useEffect } from 'react';
import '../styles/header.css';

const pageTitles = {
    login: 'Welcome',
    signup: 'Create Account',
    dashboard: 'Dashboard',
    'student-dashboard': 'Student Dashboard',
    'faculty-dashboard': 'Faculty Dashboard',
    'guest-dashboard': 'Campus Information',
    'admin-dashboard': 'Admin Dashboard',
    analytics: 'Analytics',
    devices: 'Device Management',
    alerts: 'Alert Center',
};

function Header({
    currentPage,
    theme,
    toggleTheme,
    toggleSidebar,
    setCurrentPage,
    user,
    isAuthenticated,
    onLogout,
    onSwitchToLogin,
    onSwitchToSignup
}) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Student': return '🎓';
            case 'Faculty': return '👨‍🏫';
            case 'Guest': return '👤';
            case 'Admin': return '🔐';
            default: return '👤';
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                {/* Logo - Click to go back to previous page */}
                <div className="header-logo" onClick={() => window.history.back()}>
                    <div className="logo-icon">🏛️</div>
                    <div className="logo-text">
                        <span className="logo-title">Smart Campus</span>
                        <span className="logo-subtitle">Access Control</span>
                    </div>
                </div>

                <button className="mobile-menu-btn" onClick={toggleSidebar}>
                    ☰
                </button>
                <div className="page-info">
                    <h1 className="page-title">{pageTitles[currentPage] || 'Dashboard'}</h1>
                    <span className="breadcrumb">
                        {isAuthenticated ? `${user?.role} / ${pageTitles[currentPage]}` : 'Smart Campus Access'}
                    </span>
                </div>
            </div>

            <div className="header-right">
                {/* Auth Buttons for non-authenticated users */}
                {!isAuthenticated && (
                    <div className="auth-buttons">
                        <button
                            className="header-btn auth-btn login-btn"
                            onClick={onSwitchToLogin}
                        >
                            🔐 Login
                        </button>
                        <button
                            className="header-btn auth-btn signup-btn"
                            onClick={onSwitchToSignup}
                        >
                            📝 Sign Up
                        </button>
                    </div>
                )}

                {/* Time Display */}
                <div className="time-display">
                    <span className="time">{formatTime(currentTime)}</span>
                    <span className="date">{formatDate(currentTime)}</span>
                </div>

                {/* Theme Toggle */}
                <button
                    className="header-btn theme-toggle"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {/* User Profile / Auth */}
                {isAuthenticated ? (
                    <div className="user-profile-wrapper">
                        <div
                            className="user-profile"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                        >
                            <div className="avatar">{getRoleIcon(user?.role)}</div>
                            <div className="user-info">
                                <span className="user-name">{user?.name || 'User'}</span>
                                <span className="user-role">{user?.role}</span>
                            </div>
                            <span className="dropdown-arrow">▼</span>
                        </div>

                        {/* User Dropdown Menu */}
                        {showUserMenu && (
                            <div className="user-menu animate-fade-in">
                                <div className="menu-header">
                                    <span className="menu-email">{user?.email}</span>
                                </div>
                                <div className="menu-divider"></div>
                                <button
                                    className="menu-item"
                                    onClick={() => {
                                        // Go to home/dashboard
                                        const homePage = user?.role === 'Student' ? 'student-dashboard' :
                                            user?.role === 'Faculty' ? 'faculty-dashboard' :
                                                user?.role === 'Guest' ? 'guest-dashboard' :
                                                    user?.role === 'Admin' ? 'admin-dashboard' : 'dashboard';
                                        setCurrentPage(homePage);
                                        setShowUserMenu(false);
                                    }}
                                >
                                    <span>🏠</span> My Dashboard
                                </button>
                                <div className="menu-divider"></div>
                                <button
                                    className="menu-item logout-item"
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        onLogout();
                                    }}
                                >
                                    <span>🚪</span> Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </header>
    );
}

export default Header;
