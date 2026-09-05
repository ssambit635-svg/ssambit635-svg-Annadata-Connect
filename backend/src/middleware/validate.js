import { ApiError } from './error.js';

// Minimal request-body validators. The backend remains the source of validation truth.
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
  if (missing.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', `Missing required field(s): ${missing.join(', ')}`, {
      fields: missing,
    });
  }
}

export function requireNumber(value, name, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (Number.isNaN(n)) throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be a number.`);
  if (n < min || n > max) throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be between ${min} and ${max}.`);
  return n;
}

// Accepts any 10-digit mobile number, with or without the +91 / 91 / 0 prefix.
export function normalizePhone(value, name = 'phone') {
  let s = String(value || '').trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (/^91\d{10}$/.test(s)) s = s.slice(2);
  else if (/^0\d{10}$/.test(s)) s = s.slice(1);
  if (!/^\d{10}$/.test(s)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be a valid 10-digit mobile number.`);
  }
  return s;
}

export function requirePhone(value, name = 'phone') {
  return normalizePhone(value, name);
}

export function requireEmail(value, name = 'email') {
  const s = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) || s.length > 254) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be a valid email address.`);
  }
  return s;
}

export function requirePassword(value) {
  const s = String(value || '');
  if (s.length < 8) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters long.');
  }
  return s;
}
