import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});


// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle auth errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Only force-logout on non-login endpoints to avoid clearing token on wrong-password 401s
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/signup')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Reload so AuthContext re-hydrates from empty localStorage → shows login
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default API;
