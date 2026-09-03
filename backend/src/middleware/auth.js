import jwt from 'jsonwebtoken';
import config from '../config.js';
import { getDb } from '../db/store.js';
import { ApiError } from './error.js';

export function publicUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

// Verifies the Bearer token and attaches req.user.
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'AUTH_TOKEN_MISSING', 'Authentication token is required.'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = getDb().users.find((u) => u.id === payload.sub);
    if (!user) return next(new ApiError(401, 'AUTH_TOKEN_INVALID', 'User no longer exists.'));
    req.user = user;
    next();
  } catch {
    return next(new ApiError(401, 'AUTH_TOKEN_INVALID', 'Session expired or invalid. Please log in again.'));
  }
}

// Role-based authorization guard.
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'AUTH_TOKEN_MISSING', 'Authentication token is required.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'You are not allowed to access this resource.'));
    }
    next();
  };
}
