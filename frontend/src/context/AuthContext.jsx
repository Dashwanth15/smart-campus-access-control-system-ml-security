import { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password, deviceId = null) => {
        try {
            const response = await API.post('/api/auth/login', {
                email,
                password,
                device_id: deviceId
            });

            const { token: newToken, user: userData, access, intrusion_detected } = response.data;

            // Store token and user
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));

            setToken(newToken);
            setUser(userData);

            return {
                success: true,
                user: userData,
                access,
                intrusion_detected
            };
        } catch (error) {
            const errorData = error.response?.data || {};

            // Debug: Log the full error response
            console.log('🔍 Login Error Response:', errorData);
            console.log('🔍 Full error object:', error.response);

            return {
                success: false,
                error: errorData.error || 'Login failed',
                locked: errorData.locked || false,
                permanent: errorData.permanent || false,
                remaining_attempts: errorData.remaining_attempts,
                remaining_seconds: errorData.remaining_seconds,
                message: errorData.message,
                warning: errorData.warning || false,
                ml_decision: errorData.ml_decision
            };
        }
    };

    const signup = async (name, email, password, role) => {
        try {
            const response = await API.post('/api/auth/signup', {
                name,
                email,
                password,
                role
            });

            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            const errorData = error.response?.data || {};
            return {
                success: false,
                error: errorData.error || 'Signup failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const isAuthenticated = () => {
        return !!token && !!user;
    };

    const hasRole = (...roles) => {
        return user && roles.includes(user.role);
    };

    const value = {
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated,
        hasRole
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
