import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import config from '../config.js';
import { getDb } from '../db/store.js';
import { ApiError } from './error.js';

const issuer = 'annadata-connect';
const audience = 'annadata-connect:web';

export function publicUser(user) {
  if (!user) return null;
  const fields = ['id', 'role', 'name', 'phone', 'email', 'farmerId', 'villageId', 'district', 'centreId', 'preferredLanguage', 'createdAt', 'registeredBy', 'phoneVerified', 'emailVerified', 'isDemo'];
  return Object.fromEntries(fields.filter((key) => user[key] !== undefined).map((key) => [key, user[key]]));
}

export function assertAccountEnabled(user, settings = config) {
  if (user.authDisabled || (user.isDemo && !settings.allowDemoLogin)) {
    throw new ApiError(403, 'AUTH_ACCOUNT_DISABLED', 'This account is disabled. Please contact your administrator.');
  }
  if (user.role !== 'farmer' && !user.isDemo && !user.accessApproved) {
    throw new ApiError(403, 'AUTH_APPROVAL_REQUIRED', 'Officer and authority accounts require administrator approval.');
  }
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, purpose: 'session' }, config.jwtSecret, {
    algorithm: 'HS256', issuer, audience, expiresIn: config.jwtExpiresIn, jwtid: randomUUID(),
  });
}

// Requiring issuer/audience/purpose also invalidates sessions minted by the old
// unverified phone/email endpoints. Google and profile tokens are never sessions.
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'AUTH_TOKEN_MISSING', 'Authentication token is required.'));
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer, audience });
    if (payload.purpose !== 'session') throw new Error('Not a session');
    const user = getDb().users.find((u) => u.id === payload.sub && u.role === payload.role);
    if (!user) throw new Error('Unknown account');
    assertAccountEnabled(user);
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, 'AUTH_TOKEN_INVALID', 'Session expired or invalid. Please log in again.'));
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'AUTH_TOKEN_MISSING', 'Authentication token is required.'));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, 'FORBIDDEN', 'You are not allowed to access this resource.'));
    next();
  };
}
