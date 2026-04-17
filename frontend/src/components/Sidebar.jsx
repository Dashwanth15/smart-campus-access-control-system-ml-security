import '../styles/sidebar.css';

function Sidebar({
    currentPage,
    setCurrentPage,
    collapsed,
    setCollapsed,
    isAuthenticated,
    user,
    sidebarItems = []
}) {
    const defaultItems = [
        { id: 'login', label: 'Access Control', icon: '🔐' },
    ];

    const items = isAuthenticated ? sidebarItems : defaultItems;

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Logo Section */}
            <div className="sidebar-header">
                <div className="logo">
                    <span className="logo-icon">🏛️</span>
                    {!collapsed && <span className="logo-text">Smart Campus</span>}
                </div>
                <button
                    className="collapse-btn"
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    title={collapsed ? 'Click to Expand Menu' : 'Click to Collapse Menu'}
                >
                    {collapsed ? '»' : '«'}
                </button>
            </div>

            {/* Navigation Items */}
            <nav className="sidebar-nav">
                <ul className="nav-list">
                    {items.map(item => (
                        <li key={item.id}>
                            <button
                                className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
                                onClick={() => setCurrentPage(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!collapsed && <span className="nav-label">{item.label}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* User Info (when authenticated and not collapsed) */}
            {isAuthenticated && !collapsed && (
                <div className="sidebar-footer">
                    <div className="user-badge">
                        <span className="badge-icon">
                            {user?.role === 'Student' ? '🎓' :
                                user?.role === 'Faculty' ? '👨‍🏫' :
                                    user?.role === 'Guest' ? '👤' : '🔐'}
                        </span>
                        <div className="badge-info">
                            <span className="badge-name">{user?.name}</span>
                            <span className="badge-role">{user?.role}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Indicator */}
            <div className="sidebar-status">
                <div className="status-dot"></div>
                {!collapsed && <span className="status-text">System Online</span>}
            </div>
        </aside>
    );
}

export default Sidebar;
