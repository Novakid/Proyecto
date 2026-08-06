import api from './api';

export const login = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials);
  localStorage.setItem('access_token', data.accessToken);
  localStorage.setItem('current_user', JSON.stringify(data.user));
  return data.user;
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('current_user');
};

export const isAuthenticated = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      logout();
      return false;
    }
    return true;
  } catch {
    logout();
    return false;
  }
};
