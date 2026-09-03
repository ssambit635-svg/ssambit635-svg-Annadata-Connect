import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getStoredAuth, setStoredAuth, ApiError } from '../services/api/client.js';
import { authService } from '../services/api/authService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const logout = useCallback(() => {
    setStoredAuth(null);
    setAuth(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('ks:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ks:unauthorized', onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      user: auth?.user || null,
      token: auth?.token || null,
      role: auth?.user?.role || null,
      isAuthenticated: Boolean(auth?.token),
      async login(phone, password) {
        const data = await authService.login(phone, password);
        setStoredAuth(data);
        setAuth(data);
        return data.user;
      },
      async register(payload) {
        const data = await authService.register(payload);
        setStoredAuth(data);
        setAuth(data);
        return data.user;
      },
      logout,
    }),
    [auth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function homeFor(role) {
  if (role === 'officer') return '/officer';
  if (role === 'authority') return '/authority';
  return '/farmer';
}

export { ApiError };
