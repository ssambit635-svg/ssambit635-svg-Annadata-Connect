import { api } from './client.js';

const post = (path, body) => api(`/api/auth/${path}`, { method: 'POST', body });
export const authService = {
  options: () => api('/api/auth/options'),
  login: (identifier, password, role) => post('login', { identifier, password, role }),
  requestOtp: (payload) => post('otp/request', payload),
  verifyOtp: (payload) => post('otp/verify', payload),
  // Mock Google: the picker posts the chosen sample account's email.
  googleLogin: ({ role, email }) => post('google', { role, email }),
  register: (payload) => post('register', payload),
  requestContact: (payload) => post('contact/request', payload),
  verifyContact: (payload) => post('contact/verify', payload),
  me: () => api('/api/auth/me'),
};
