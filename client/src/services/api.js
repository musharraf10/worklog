import axios from 'axios';
import { getAuthToken, clearAuthToken, clearStoredUser } from '../utils/storageUtils';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 unauthorized & detect network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't intercept 401 on login or register endpoints
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        clearAuthToken();
        clearStoredUser();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Determine if an error is caused by a network disconnection or unreachable server
 */
export const isNetworkError = (error) => {
  if (!error) return false;
  if (!navigator.onLine) return true;
  if (error.code === 'ERR_NETWORK') return true;
  if (error.code === 'ECONNABORTED') return true;
  if (!error.response && error.request) return true;
  return false;
};

export default api;
