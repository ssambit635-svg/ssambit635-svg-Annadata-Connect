import { api } from './client.js';

export const authService = {
  login: (phone, password) => api('/api/auth/login', { method: 'POST', body: { phone, password } }),
  register: (payload) => api('/api/auth/register', { method: 'POST', body: payload }),
  me: () => api('/api/auth/me'),
};
