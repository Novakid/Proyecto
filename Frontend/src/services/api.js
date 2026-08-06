import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 5000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('current_user');
      if (window.location.protocol === 'file:') {
        if (window.location.hash !== '#/login') window.location.hash = '#/login';
      } else if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export const getApiAssetUrl = (path) => {
  if (!path) return '';
  const baseUrl = api.defaults.baseURL?.replace(/\/$/, '') || '';
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};
