import axios from 'axios';

/**
 * Single Axios instance for the whole app.
 * - baseURL "/api" (same-origin in production; proxied by Vite in dev).
 * - Request interceptor attaches the JWT from localStorage.
 * - Response interceptor handles global 401 (expired/invalid session).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const onAuthPage = ['/login', '/register'].includes(window.location.pathname);

    if (status === 401 && !onAuthPage) {
      localStorage.removeItem('token');
      // Full reload so all in-memory state is reset cleanly.
      window.location.assign('/login?expired=1');
    }
    return Promise.reject(error);
  }
);

/** Human-friendly message extraction for any API/network error. */
export const getErrorMessage = (error) => {
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Please check your connection.';
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
};

export default api;
