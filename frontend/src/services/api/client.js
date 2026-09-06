// Central API client. All backend calls go through here.
// - Attaches the JWT Bearer token automatically
// - Normalizes errors into { status, code, message }
// - Emits 'ks:unauthorized' on 401 so the app can log out cleanly

// Dev browsers always use Vite's same-origin /api proxy, including remote previews.
// Production web builds default to same-origin (Express serves dist/).
// The Android APK (Capacitor) has no same-origin server, so it MUST be built with
// VITE_API_BASE_URL=https://<your-render-app>.onrender.com. A runtime override
// (localStorage 'ks-api-base') is also honoured so a sideloaded demo APK can be
// pointed at a different backend without rebuilding.
const API_BASE_KEY = 'ks-api-base';
function resolveBase() {
  if (import.meta.env.DEV) return '';
  try {
    const override = localStorage.getItem(API_BASE_KEY);
    if (override) return override;
  } catch { /* storage unavailable */ }
  return import.meta.env.VITE_API_BASE_URL || '';
}
const BASE = resolveBase().replace(/\/$/, '');
export const API_BASE = BASE;
export function setApiBaseOverride(url) {
  if (url) localStorage.setItem(API_BASE_KEY, url.trim().replace(/\/$/, ''));
  else localStorage.removeItem(API_BASE_KEY);
}
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
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Hard ceiling for a single API call. Free-tier backends wake slowly (the UI
// says so via ks:api-slow at 4 s), but a hung socket must never leave the app
// stuck on a spinner forever — that reads as a crash on a phone. After this
// the request settles into a friendly NETWORK_ERROR with a Retry button.
const API_TIMEOUT_MS = 35000;

export async function api(path, { method = 'GET', body, token } = {}) {
  const auth = getStoredAuth();
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const bearer = token || auth?.token;
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;

  let res;
  // If the API takes > 4 s (typical Render free-tier cold start) tell the UI.
  const slowTimer = setTimeout(() => window.dispatchEvent(new Event('ks:api-slow')), 4000);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutTimer = setTimeout(() => controller?.abort(), API_TIMEOUT_MS);
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller ? controller.signal : undefined,
    });
  } catch {
    clearTimeout(slowTimer);
    clearTimeout(timeoutTimer);
    window.dispatchEvent(new Event('ks:api-ok')); // the request settled (failed); drop the "waking" banner
    throw new ApiError(0, 'NETWORK_ERROR', 'NETWORK_ERROR');
  } finally {
    clearTimeout(slowTimer);
    clearTimeout(timeoutTimer);
  }
  window.dispatchEvent(new Event('ks:api-ok'));

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401 && bearer && ['AUTH_TOKEN_INVALID', 'AUTH_TOKEN_MISSING'].includes(err.code) && getStoredAuth()?.token === bearer) {
      window.dispatchEvent(new Event('ks:unauthorized'));
    }
    throw new ApiError(res.status, err.code || 'ERROR', err.message || 'Unexpected error', err.details);
  }
  return data;
}
