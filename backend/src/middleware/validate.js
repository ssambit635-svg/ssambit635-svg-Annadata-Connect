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

export function requirePhone(value, name = 'phone') {
  const s = String(value || '').trim();
  if (!/^[6-9]\d{9}$/.test(s)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${name} must be a valid 10-digit Indian mobile number.`);
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
