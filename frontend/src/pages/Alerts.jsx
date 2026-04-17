import { useState, useEffect } from 'react';
import API from '../services/api';
import '../styles/alerts.css';

function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);

            // Fetch anomalies from admin API
            const [anomaliesRes, logsRes] = await Promise.all([
                API.get('/api/admin/analytics/overview').catch(() => ({ data: {} })),
                API.get('/api/admin/access-logs?limit=50').catch(() => ({ data: { logs: [] } }))
            ]);

            const alertList = [];

            // Get failed login attempts from access logs
            const logs = logsRes.data.logs || [];
            const failedLogins = logs.filter(log =>
                log.access === 'Denied' || log.access === 'Blocked' || log.intrusion === true
            );

            // Create alerts from failed logins
            failedLogins.forEach((log, index) => {
                let alertType = 'warning';
                let title = 'Login Attempt Blocked';
                let message = `Access denied for ${log.username || 'unknown user'}`;

                if (log.intrusion) {
                    alertType = 'danger';
                    title = 'Intrusion Detected';
                    message = `Suspicious activity from ${log.mac_address || 'unknown device'}`;
                }

                if (log.reason === 'unknown_mac') {
                    alertType = 'warning';
                    title = 'Unknown Device';
                    message = `Unregistered device attempted access: ${log.mac_address || 'unknown'}`;
                }

                alertList.push({
                    id: `log-${index}`,
                    type: alertType,
                    title: title,
                    message: message,
                    time: formatTimeAgo(log.timestamp),
                    timestamp: log.timestamp,
                    status: 'active',
                    details: log
                });
            });

            // Get overview stats for additional context
            const overview = anomaliesRes.data;

            // Add lockout alerts
            if (overview.locked_accounts > 0) {
                alertList.unshift({
                    id: 'lockout-alert',
                    type: 'danger',
                    title: 'Accounts Locked',
                    message: `${overview.locked_accounts} account(s) are currently locked due to failed login attempts`,
                    time: 'Current',
                    status: 'active'
                });
            }

            // Add intrusion summary alert
            if (overview.intrusions_detected > 0) {
                alertList.unshift({
                    id: 'intrusion-summary',
                    type: 'danger',
                    title: 'Intrusion Attempts',
                    message: `${overview.intrusions_detected} intrusion attempt(s) detected today`,
                    time: 'Today',
                    status: 'active'
                });
            }

            // Sort by timestamp (most recent first)
            alertList.sort((a, b) => {
                if (a.timestamp && b.timestamp) {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                }
                return 0;
            });

            setAlerts(alertList);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
            setError('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    const formatTimeAgo = (timestamp) => {
        if (!timestamp) return 'Unknown';

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    };

    const handleDismiss = (alertId) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, status: 'resolved' } : a
        ));
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'danger': return '🚨';
            case 'warning': return '⚠️';
            case 'info': return 'ℹ️';
            case 'success': return '✅';
            default: return '📢';
        }
    };

    const activeAlerts = alerts.filter(a => a.status === 'active');
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

    if (loading) {
        return (
            <div className="alerts-page animate-fade-in">
                <div className="loading-state">
                    <div className="spinner-large"></div>
                    <p>Loading alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="alerts-page animate-fade-in">
            {/* Header */}
            <div className="alerts-header">
                <div className="header-content">
                    <h2 className="page-heading">Alert Center</h2>
                    <p className="page-description">Monitor security alerts and network incidents</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={fetchAlerts}>
                        🔄 Refresh
                    </button>
                </div>
                <div className="alert-summary">
                    <div className="summary-item danger">
                        <span className="summary-count">{activeAlerts.length}</span>
                        <span className="summary-label">Active</span>
                    </div>
                    <div className="summary-item success">
                        <span className="summary-count">{resolvedAlerts.length}</span>
                        <span className="summary-label">Resolved</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            {/* No Alerts State */}
            {alerts.length === 0 && !error && (
                <div className="empty-state">
                    <span className="empty-icon">🛡️</span>
                    <h3>All Clear!</h3>
                    <p>No security alerts at this time. The system is running smoothly.</p>
                </div>
            )}

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
                <section className="alert-section">
                    <h3 className="section-title">
                        <span className="title-icon animate-pulse">🔴</span>
                        Active Alerts
                    </h3>
                    <div className="alerts-list">
                        {activeAlerts.map((alert, index) => (
                            <div
                                key={alert.id}
                                className={`alert-item alert-${alert.type} animate-fade-in-up stagger-${(index % 5) + 1}`}
                            >
                                <div className="alert-icon">{getTypeIcon(alert.type)}</div>
                                <div className="alert-content">
                                    <h4 className="alert-title">{alert.title}</h4>
                                    <p className="alert-message">{alert.message}</p>
                                    <span className="alert-time">{alert.time}</span>
                                </div>
                                <div className="alert-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => console.log('Investigate:', alert)}
                                    >
                                        Investigate
                                    </button>
                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => handleDismiss(alert.id)}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Resolved Alerts */}
            {resolvedAlerts.length > 0 && (
                <section className="alert-section">
                    <h3 className="section-title">
                        <span className="title-icon">✅</span>
                        Resolved Alerts
                    </h3>
                    <div className="alerts-list resolved">
                        {resolvedAlerts.map((alert, index) => (
                            <div
                                key={alert.id}
                                className={`alert-item alert-${alert.type} resolved animate-fade-in-up stagger-${(index % 5) + 1}`}
                            >
                                <div className="alert-icon">{getTypeIcon(alert.type)}</div>
                                <div className="alert-content">
                                    <h4 className="alert-title">{alert.title}</h4>
                                    <p className="alert-message">{alert.message}</p>
                                    <span className="alert-time">{alert.time}</span>
                                </div>
                                <span className="resolved-badge badge badge-success">Resolved</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

export default Alerts;
