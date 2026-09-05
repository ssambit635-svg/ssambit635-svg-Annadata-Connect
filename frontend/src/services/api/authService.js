import { api } from './client.js';

export const authService = {
  login: (phone, password) => api('/api/auth/login', { method: 'POST', body: { phone, password } }),
  register: (payload) => api('/api/auth/register', { method: 'POST', body: payload }),
  // Passwordless login with any 10-digit mobile number; new numbers are asked
  // for name + village once (AUTH_PROFILE_REQUIRED) and then created.
  phoneLogin: (payload) => api('/api/auth/phone-login', { method: 'POST', body: payload }),
  // Google sign-in for officers / authorities. `credential` is the Google ID
  // token when real Google Identity Services is configured; without it the
  // backend demo mode accepts an email address directly.
  googleLogin: (payload) => api('/api/auth/google', { method: 'POST', body: payload }),
  me: () => api('/api/auth/me'),
};
