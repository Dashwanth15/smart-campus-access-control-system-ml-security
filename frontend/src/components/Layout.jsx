import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import '../styles/layout.css';

// Layout is ONLY used for Admin pages.
// Student / Faculty / Guest / Auth pages are rendered directly in App.jsx
// without this wrapper — so there is zero UI bleed risk.
function Layout({
  children,
  currentPage,
  setCurrentPage,
  user,
  isAuthenticated,
  onLogout,
  sidebarItems,
  onSwitchToLogin,
  onSwitchToSignup
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isAuthenticated={isAuthenticated}
        user={user}
        sidebarItems={sidebarItems}
      />
      <div className="main-content">
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={user}
          isAuthenticated={isAuthenticated}
          onLogout={onLogout}
          onSwitchToLogin={onSwitchToLogin}
          onSwitchToSignup={onSwitchToSignup}
        />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
