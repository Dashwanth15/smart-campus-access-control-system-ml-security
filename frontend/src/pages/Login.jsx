import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { getDeviceId } from '../utils/deviceFingerprint';
import '../styles/login.css';

function Login({ onLoginSuccess, onSwitchToSignup }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [isPermanentBlock, setIsPermanentBlock] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  // Compute device fingerprint on mount (async SHA-256)
  useEffect(() => {
    getDeviceId()
      .then(id => {
        setDeviceId(id);
        console.log('🔐 Device fingerprint ready:', id.slice(0, 16) + '…');
      })
      .catch(err => {
        console.error('Fingerprint error:', err);
        setDeviceId('fallback-device');
      });
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    let interval;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    // Use SHA-256 browser fingerprint as device identifier
    const id = deviceId || await getDeviceId();
    console.log('🔑 Logging in with device_id:', id.slice(0, 16) + '…');

    const result = await login(email, password, id);

    setLoading(false);

    // Debug: Log the full result
    console.log('🔍 Login Result:', result);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      const displayMessage = result.message || result.error;
      setError(displayMessage);

      if (result.permanent) {
        setIsPermanentBlock(true);
        setLockoutTimer(0);
        setRemainingAttempts(null);
      } else if (result.locked && result.remaining_seconds) {
        setIsPermanentBlock(false);
        setLockoutTimer(result.remaining_seconds);
        setRemainingAttempts(null);
      } else {
        // Still within attempts — show how many are left
        setIsPermanentBlock(false);
        if (result.remaining_attempts !== undefined) {
          setRemainingAttempts(result.remaining_attempts);
        }
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card-glass animate-scale-in">
        {/* Header */}
        <div className="login-header">
          <div className="login-icon animate-float">🔐</div>
          <h2 className="login-title">Smart Campus Login</h2>
          <p className="login-subtitle">Access your dashboard securely</p>
        </div>

        {/* Permanent Block Warning */}
        {isPermanentBlock && (
          <div className="lockout-banner permanent animate-fade-in">
            <div className="lockout-icon">🚫</div>
            <div className="lockout-content">
              <h4>Account Permanently Blocked</h4>
              <p>Too many failed login attempts.</p>
              <p className="contact-admin">Contact administrator to unlock your account.</p>
            </div>
          </div>
        )}

        {/* Temporary Lockout Warning */}
        {!isPermanentBlock && lockoutTimer > 0 && (
          <div className="lockout-banner animate-fade-in">
            <div className="lockout-icon">🔒</div>
            <div className="lockout-content">
              <h4>Account Temporarily Blocked</h4>
              <p>Too many failed attempts. Try again in:</p>
              <div className="lockout-timer">{formatTime(lockoutTimer)}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* Email Input */}
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-input"
                disabled={lockoutTimer > 0 || isPermanentBlock}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label className="input-label">Password</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input"
                disabled={lockoutTimer > 0 || isPermanentBlock}
              />
            </div>
          </div>

          {/* Remaining Attempts Warning */}
          {!lockoutTimer && !isPermanentBlock && remainingAttempts !== null && remainingAttempts > 0 && (
            <div className={`attempts-warning animate-fade-in ${remainingAttempts === 1 ? 'danger' : 'caution'}`}>
              <span className="attempts-icon">{remainingAttempts === 1 ? '🚨' : '⚠️'}</span>
              <span>
                {remainingAttempts === 1
                  ? 'Last attempt! Account will be blocked after this.'
                  : `${remainingAttempts} attempts remaining before temporary block.`}
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && !lockoutTimer && !isPermanentBlock && remainingAttempts === null && (
            <div className="error-message animate-fade-in">
              <span className="error-icon">⚠️</span>
              <div className="error-content">
                <span>{error}</span>
              </div>
            </div>
          )}


          {/* Submit Button */}
          <button
            type="submit"
            className={`login-btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
            disabled={loading || lockoutTimer > 0 || isPermanentBlock}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Authenticating...
              </>
            ) : (lockoutTimer > 0 || isPermanentBlock) ? (
              <>
                <span>🔒</span>
                Blocked
              </>
            ) : (
              <>
                <span>🚀</span>
                Login
              </>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="auth-switch">
          <span>Don't have an account?</span>
          <button className="link-btn" onClick={onSwitchToSignup}>
            Sign up here
          </button>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <span className="notice-icon">🛡️</span>
          <span>Your device fingerprint is verified for security</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
