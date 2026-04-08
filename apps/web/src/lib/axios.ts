import axios, { AxiosInstance, AxiosError } from 'axios';
import { API_CONFIG } from '../config';

// ─── Shared interceptor setup ─────────────────────────────────────────────────
// Both clients need identical auth + redirect behaviour — extracted once here.

const attachInterceptors = (instance: AxiosInstance) => {
  // Attach Bearer token from localStorage on every request
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error),
  );

  // Redirect to login on 401 (except login endpoint itself)
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const isLoginEndpoint = error.config?.url?.includes('/login');
      if (error.response?.status === 401 && !isLoginEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );
};

// ─── Main API client — REACT_APP_API_URL (includes /api/v1) ──────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: API_CONFIG.HEADERS,
  timeout: API_CONFIG.TIMEOUT,
});

attachInterceptors(apiClient);

// ─── Health client — REACT_APP_HEALTH_URL (root base, no /api/v1) ────────────

export const healthClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.HEALTH_URL,
  headers: API_CONFIG.HEADERS,
  timeout: API_CONFIG.TIMEOUT,
});

attachInterceptors(healthClient);

// ─── Exports ──────────────────────────────────────────────────────────────────

export default apiClient;