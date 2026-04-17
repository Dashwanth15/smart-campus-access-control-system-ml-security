import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import SignupPage from './pages/SignupPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import GuestDashboard from './pages/GuestDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Devices from './pages/Devices';
import Alerts from './pages/Alerts';

function AppContent() {
  const { user, isAuthenticated, logout } = useAuth();
  const [currentPage, setCurrentPage]   = useState('home');
  const [authMode, setAuthMode]         = useState('login');
  const [legacyResult, setLegacyResult] = useState(null);

  const handleLoginSuccess = (userData) => {
    switch (userData?.role) {
      case 'Student': setCurrentPage('student-dashboard'); break;
      case 'Faculty': setCurrentPage('faculty-dashboard'); break;
      case 'Guest':   setCurrentPage('guest-dashboard');   break;
      case 'Admin':   setCurrentPage('admin-dashboard');   break;
      default:        setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('login');   // go straight to login, not home
    setAuthMode('login');
  };

  const getSidebarConfig = () => {
    switch (user?.role) {
      case 'Admin':
        return [
          { id: 'admin-dashboard', label: 'Admin Panel',      icon: '🔐' },
          { id: 'analytics',       label: 'Analytics',        icon: '📈' },
          { id: 'devices',         label: 'Blocked Devices',  icon: '🚫' },
          { id: 'alerts',          label: 'Alerts',           icon: '🔔' },
        ];
      default:
        return [{ id: 'dashboard', label: 'Dashboard', icon: '📊' }];
    }
  };

  // ── 1. Home page (no auth required, no chrome)
  if (currentPage === 'home') {
    return <HomePage onGetStarted={() => { setCurrentPage('login'); setAuthMode('login'); }} />;
  }

  // ── 2. Not authenticated → Login / Signup
  //    This fires immediately after logout because logout() clears the token.
  if (!isAuthenticated() || currentPage === 'login' || currentPage === 'signup') {
    if (authMode === 'signup' || currentPage === 'signup') {
      return <SignupPage onSwitchToLogin={() => { setAuthMode('login'); setCurrentPage('login'); }} />;
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToSignup={() => { setAuthMode('signup'); setCurrentPage('signup'); }}
      />
    );
  }

  // ── 3. Student Dashboard — self-contained, NO outer Layout
  if (currentPage === 'student-dashboard') {
    return <StudentDashboard onLogout={handleLogout} />;
  }

  // ── 4. Faculty Dashboard — self-contained, NO outer Layout
  if (currentPage === 'faculty-dashboard') {
    return <FacultyDashboard onLogout={handleLogout} />;
  }

  // ── 5. Guest Dashboard — self-contained, NO outer Layout
  if (currentPage === 'guest-dashboard') {
    return <GuestDashboard onLogout={handleLogout} />;
  }

  // ── 6. Admin pages — wrapped in outer Layout (Sidebar + Header)
  const renderAdminPage = () => {
    switch (currentPage) {
      case 'admin-dashboard': return <AdminDashboard />;
      case 'analytics':       return <Analytics />;
      case 'devices':         return <Devices />;
      case 'alerts':          return <Alerts />;
      case 'dashboard':       return <Dashboard result={legacyResult} />;
      default:                return <AdminDashboard />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      user={user}
      isAuthenticated={isAuthenticated()}
      onLogout={handleLogout}
      sidebarItems={getSidebarConfig()}
      onSwitchToLogin={() => setAuthMode('login')}
      onSwitchToSignup={() => setAuthMode('signup')}
    >
      {renderAdminPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
