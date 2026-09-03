// Central API client. All backend calls go through here.
// - Attaches the JWT Bearer token automatically
// - Normalizes errors into { status, code, message }
// - Emits 'ks:unauthorized' on 401 so the app can log out cleanly

const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'ks-auth';

export function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth) {
  if (auth) localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  const auth = getStoredAuth();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = token || auth?.token;
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'NETWORK_ERROR');
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && bearer) {
      window.dispatchEvent(new Event('ks:unauthorized'));
    }
    throw new ApiError(res.status, err.code || 'ERROR', err.message || 'Unexpected error');
  }
  return data;
}
