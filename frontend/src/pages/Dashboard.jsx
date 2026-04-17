import '../styles/dashboard.css';

function Dashboard({ result }) {
  if (!result) {
    return (
      <div className="dashboard-placeholder animate-fade-in">
        <div className="placeholder-icon">📡</div>
        <h3 className="placeholder-title">No Active Session</h3>
        <p className="placeholder-text">
          Use the Access Control panel to authenticate a device and view the access decision here.
        </p>
      </div>
    );
  }

  const isAllowed = result.access === 'Allowed';
  const hasIntrusion = result.intrusion_detected;
  const hasAlert = result.alert;

  return (
    <div className="dashboard animate-fade-in">
      {/* Main Status Card */}
      <div className={`status-card ${isAllowed ? 'status-allowed' : 'status-blocked'}`}>
        <div className="status-icon-large">
          {isAllowed ? '✅' : '🚫'}
        </div>
        <div className="status-content">
          <h2 className="status-title">
            Access {result.access}
          </h2>
          <p className="status-description">
            {isAllowed
              ? 'Device has been granted network access'
              : 'Device access has been denied'
            }
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {/* Role Card */}
        <div className="stat-card animate-fade-in-up stagger-1">
          <div className="stat-header">
            <span className="stat-icon icon-box icon-box-primary">
              {result.role === 'Student' ? '🎓' : result.role === 'Faculty' ? '👨‍🏫' : '👤'}
            </span>
            <span className="stat-label">User Role</span>
          </div>
          <div className="stat-value">{result.role}</div>
          <div className="stat-badge badge badge-primary">Authenticated</div>
        </div>

        {/* Login Hour Card */}
        <div className="stat-card animate-fade-in-up stagger-2">
          <div className="stat-header">
            <span className="stat-icon icon-box icon-box-warning">🕐</span>
            <span className="stat-label">Login Time</span>
          </div>
          <div className="stat-value">
            {result.login_hour}:00
          </div>
          <div className="stat-badge badge badge-warning">
            {result.login_hour >= 6 && result.login_hour < 18 ? 'Day' : 'Night'}
          </div>
        </div>

        {/* Intrusion Status */}
        <div className={`stat-card animate-fade-in-up stagger-3 ${hasIntrusion ? 'card-danger' : ''}`}>
          <div className="stat-header">
            <span className={`stat-icon icon-box ${hasIntrusion ? 'icon-box-danger' : 'icon-box-success'}`}>
              {hasIntrusion ? '⚠️' : '🛡️'}
            </span>
            <span className="stat-label">Intrusion Detection</span>
          </div>
          <div className="stat-value">
            {hasIntrusion ? 'DETECTED' : 'Clear'}
          </div>
          <div className={`stat-badge badge ${hasIntrusion ? 'badge-danger' : 'badge-success'}`}>
            {hasIntrusion ? 'Threat Found' : 'No Threats'}
          </div>
        </div>

        {/* Alert Status */}
        <div className={`stat-card animate-fade-in-up stagger-4 ${hasAlert ? 'card-warning' : ''}`}>
          <div className="stat-header">
            <span className={`stat-icon icon-box ${hasAlert ? 'icon-box-danger' : 'icon-box-success'}`}>
              {hasAlert ? '🔔' : '✓'}
            </span>
            <span className="stat-label">Alert Status</span>
          </div>
          <div className="stat-value">
            {hasAlert ? 'ACTIVE' : 'None'}
          </div>
          <div className={`stat-badge badge ${hasAlert ? 'badge-danger animate-pulse' : 'badge-success'}`}>
            {hasAlert ? 'Review Required' : 'All Clear'}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {hasAlert && (
        <div className="alert-banner animate-fade-in-up">
          <div className="alert-icon animate-pulse">🚨</div>
          <div className="alert-content">
            <h4 className="alert-title">Security Alert Active</h4>
            <p className="alert-message">
              {hasIntrusion
                ? 'Potential intrusion detected. The system has flagged suspicious activity patterns.'
                : 'Access restriction applied based on device authentication parameters.'
              }
            </p>
          </div>
          <button className="alert-action btn btn-danger">
            Investigate
          </button>
        </div>
      )}

      {/* ML Info */}
      <div className="ml-info animate-fade-in-up stagger-5">
        <span className="ml-badge">🤖 ML Powered</span>
        <span className="ml-text">
          Decision Tree for access classification • SVM for intrusion detection
        </span>
      </div>
    </div>
  );
}

export default Dashboard;
