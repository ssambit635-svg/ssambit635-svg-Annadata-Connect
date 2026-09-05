import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getStoredAuth, setStoredAuth, ApiError } from '../services/api/client.js';
import { authService } from '../services/api/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());
  const [initializing, setInitializing] = useState(() => Boolean(getStoredAuth()?.token));
  const logout = useCallback(() => { setStoredAuth(null); setAuth(null); }, []);

  useEffect(() => {
    window.addEventListener('ks:unauthorized', logout);
    return () => window.removeEventListener('ks:unauthorized', logout);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    if (!auth?.token) { setInitializing(false); return undefined; }
    authService.me().then(({ user }) => {
      if (!cancelled) {
        setAuth((current) => current ? { ...current, user } : null);
        const stored = getStoredAuth();
        if (stored?.token === auth.token) setStoredAuth({ ...stored, user });
      }
    }).catch(() => { /* API client clears invalid sessions; transient network failures don't. */ })
      .finally(() => { if (!cancelled) setInitializing(false); });
    return () => { cancelled = true; };
  }, [auth?.token]);

  const acceptSession = useCallback((data) => {
    // Registration tickets and OTP challenges are never stored as logged-in sessions.
    if (data.token && data.user) {
      const session = { token: data.token, user: data.user };
      setStoredAuth(session);
      setAuth(session);
    }
    return data;
  }, []);

  const updateUser = useCallback((user) => {
    setAuth((current) => {
      if (!current) return current;
      const next = { ...current, user };
      setStoredAuth(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user: auth?.user || null,
    token: auth?.token || null,
    role: auth?.user?.role || null,
    isAuthenticated: Boolean(auth?.token),
    initializing,
    login: async (identifier, password, role) => acceptSession(await authService.login(identifier, password, role)),
    verifyOtp: async (payload) => acceptSession(await authService.verifyOtp(payload)),
    loginWithGoogle: async (payload) => acceptSession(await authService.googleLogin(payload)),
    register: async (payload) => acceptSession(await authService.register(payload)),
    updateUser,
    logout,
  }), [auth, initializing, acceptSession, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
export function homeFor(role) {
  if (role === 'officer') return '/officer';
  if (role === 'authority') return '/authority';
  return '/farmer';
}
export { ApiError };
