import axios from 'axios';

// VITE_API_URL is injected at BUILD TIME by Vite from your .env / Render env vars.
// It must start with VITE_ to be exposed to the browser bundle.
// Local dev: create frontend/.env.local → VITE_API_URL=http://localhost:5000
// Production (Render): set VITE_API_URL in the Static Site → Environment tab.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  // Warn loudly in development; in production this means the env var was not set at build time.
  console.warn(
    '[api.js] VITE_API_URL is not set. ' +
    'For local dev, create frontend/.env.local with VITE_API_URL=http://localhost:5000. ' +
    'For Render, add VITE_API_URL in the Static Site environment variables and redeploy.'
  );
}

const API = axios.create({
  baseURL: API_URL,
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
