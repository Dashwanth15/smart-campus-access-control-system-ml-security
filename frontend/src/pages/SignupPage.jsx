import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/signup.css';

const roleOptions = [
    { value: 'Student', icon: '🎓', description: 'Access your academic records' },
    { value: 'Faculty', icon: '👨‍🏫', description: 'Manage student data' },
    { value: 'Guest', icon: '👤', description: 'View campus information' }
];

function SignupPage({ onSwitchToLogin }) {
    const { signup } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'Student'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleRoleSelect = (role) => {
        setFormData(prev => ({ ...prev, role }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Name is required');
            return false;
        }
        if (!formData.email.trim()) {
            setError('Email is required');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError('');

        const result = await signup(
            formData.name,
            formData.email,
            formData.password,
            formData.role
        );

        setLoading(false);

        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                onSwitchToLogin();
            }, 2000);
        } else {
            setError(result.error);
        }
    };

    if (success) {
        return (
            <div className="signup-container">
                <div className="signup-card card-glass animate-scale-in">
                    <div className="success-message">
                        <div className="success-icon">✅</div>
                        <h2>Registration Successful!</h2>
                        <p>Redirecting to login...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="signup-container">
            <div className="signup-card card-glass animate-scale-in">
                {/* Header */}
                <div className="signup-header">
                    <div className="signup-icon animate-float">📝</div>
                    <h2 className="signup-title">Create Account</h2>
                    <p className="signup-subtitle">Join Smart Campus Network</p>
                </div>

                {/* Form */}
                <form className="signup-form" onSubmit={handleSubmit}>
                    {/* Name Input */}
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <div className="input-wrapper">
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Email Input */}
                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <div className="input-wrapper">
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="form-input"
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
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="At least 6 characters"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="input-group">
                        <label className="input-label">Confirm Password</label>
                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Role Selection */}
                    <div className="input-group">
                        <label className="input-label">Select Your Role</label>
                        <div className="role-selector">
                            {roleOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`role-option ${formData.role === option.value ? 'active' : ''}`}
                                    onClick={() => handleRoleSelect(option.value)}
                                >
                                    <span className="role-icon">{option.icon}</span>
                                    <span className="role-label">{option.value}</span>
                                    <span className="role-desc">{option.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="error-message animate-fade-in">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className={`signup-btn btn-primary btn-lg ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <span>🚀</span>
                                Sign Up
                            </>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="auth-switch">
                    <span>Already have an account?</span>
                    <button className="link-btn" onClick={onSwitchToLogin}>
                        Login here
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
