import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import config from '../config.js';
import { getDb, saveDb, mintFarmerId } from '../db/store.js';
import { authenticate, publicUser, signToken, assertAccountEnabled } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requirePassword, requirePhone, requireEmail } from '../middleware/validate.js';
import { createMockDelivery } from '../services/auth-mock.service.js';
import { createVerificationService } from '../services/auth-verification.service.js';

const invalidCredentials = () => new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect mobile number, email, password, or account role.');
// Also compare when a user does not exist, to avoid a fast account-enumeration path.
const DUMMY_HASH = bcrypt.hashSync('not-a-user-password', 10);

function roleOf(value) {
  if (!['farmer', 'officer', 'authority'].includes(value)) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose farmer, officer, or authority.');
  return value;
}
function contactOf(body) {
  if (!['sms', 'email'].includes(body.channel)) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose SMS or email verification.');
  const destination = body.channel === 'sms' ? requirePhone(body.destination) : requireEmail(body.destination);
  if (body.channel === 'sms' && !/^[6-9]\d{9}$/.test(destination)) throw new ApiError(400, 'VALIDATION_ERROR', 'Enter a valid Indian mobile number beginning with 6, 7, 8, or 9.');
  return { channel: body.channel, destination };
}
const contactField = (identity) => identity.channel === 'sms' ? 'phone' : 'email';
const contactUser = (db, identity) => db.users.find((u) => (u[contactField(identity)] || '').toLowerCase() === identity.destination);

function limiter(limit) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Too many sign-in attempts. Please try again later.', details: { retryAfterSeconds: 900 } } }),
  });
}

// Dependencies are injected only by tests; the app always uses the mock provider.
export function createAuthRouter({ db = getDb, save = saveDb, settings = config, delivery = createMockDelivery(), verification = createVerificationService(delivery), authMiddleware = authenticate } = {}) {
  const router = Router();
  const signinLimit = limiter(30);
  const sendLimit = limiter(10);
  const verifyLimit = limiter(30);
  const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);
  router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  function session(user) {
    return { token: signToken(user), user: publicUser(user) };
  }
  function signInIdentity(identity, role) {
    const store = db();
    const bySubject = identity.googleSub ? store.users.find((u) => u.googleSub === identity.googleSub) : null;
    const existing = bySubject || contactUser(store, identity);
    if (!existing) {
      if (role !== 'farmer') throw new ApiError(403, 'AUTH_APPROVAL_REQUIRED', 'Officer and authority accounts must be provisioned by your administrator with this phone number or email.');
      return verification.registration(identity);
    }
    assertAccountEnabled(existing, settings);
    if (existing.role !== role) throw new ApiError(403, 'AUTH_ROLE_MISMATCH', 'This account is not registered for the selected role. Choose the correct role and sign in again.');
    if (identity.googleSub) {
      if (existing.googleSub && existing.googleSub !== identity.googleSub) throw new ApiError(409, 'AUTH_IDENTITY_CONFLICT', 'A different Google account is linked. Use your verified email or mobile instead.');
      existing.googleSub = identity.googleSub;
    }
    if (!bySubject || existing.email?.toLowerCase() === identity.destination) {
      existing[identity.channel === 'sms' ? 'phoneVerified' : 'emailVerified'] = true;
    }
    save();
    return session(existing);
  }

  // Mock mode: the frontend renders the fake Google picker from `google.accounts`.
  router.get('/options', (_req, res) => res.json({
    mock: true,
    google: { enabled: delivery.enabled.google, mock: true, accounts: delivery.googleAccounts() },
    sms: { enabled: delivery.enabled.sms, mock: true },
    email: { enabled: delivery.enabled.email, mock: true },
    password: { enabled: true },
    demoEnabled: settings.allowDemoLogin,
  }));

  router.post('/login', signinLimit, wrap(async (req, res) => {
    const role = roleOf(req.body.role);
    const raw = String(req.body.identifier || req.body.phone || '').trim();
    let identifier;
    try { identifier = raw.includes('@') ? requireEmail(raw) : requirePhone(raw); } catch { throw invalidCredentials(); }
    const user = db().users.find((u) => u.phone === identifier || (u.email || '').toLowerCase() === identifier);
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (Buffer.byteLength(password) > 72) throw invalidCredentials();
    const valid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    if (!user?.passwordHash || !valid || user.role !== role) throw invalidCredentials();
    assertAccountEnabled(user, settings);
    res.json(session(user));
  }));

  // Retire the previous authentication bypass rather than silently preserving it.
  router.post('/phone-login', (_req, res) => res.status(410).json({ error: { code: 'AUTH_VERIFICATION_REQUIRED', message: 'Mobile sign-in now requires SMS verification. Request and verify an OTP to continue.' } }));

  router.post('/otp/request', sendLimit, wrap(async (req, res) => {
    const role = roleOf(req.body.role);
    res.json(await verification.request({ ...contactOf(req.body), role }));
  }));
  router.post('/otp/verify', verifyLimit, wrap(async (req, res) => {
    const role = roleOf(req.body.role);
    const identity = await verification.verify({ challengeId: req.body.challengeId, code: req.body.code, role });
    res.json(signInIdentity(identity, role));
  }));

  // Mock Google: the picker posts the chosen sample account's email; no token exists.
  router.post('/google', signinLimit, wrap((req, res) => {
    const role = roleOf(req.body.role);
    const identity = delivery.verifyGoogle({ email: req.body.email });
    identity.destination = requireEmail(identity.destination);
    res.json(signInIdentity(identity, role));
  }));

  // A profile ticket is NOT a login token; identity always comes from verification.
  router.post('/register', signinLimit, wrap(async (req, res) => {
    requireFields(req.body, ['registrationToken', 'name', 'villageId']);
    const identity = verification.getRegistration(req.body.registrationToken);
    const name = String(req.body.name).trim();
    if (name.length < 2 || name.length > 100) throw new ApiError(400, 'VALIDATION_ERROR', 'Name must be between 2 and 100 characters.');
    const village = db().villages.find((v) => v.id === req.body.villageId);
    if (!village) throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid village.');
    const password = req.body.password ? requirePassword(req.body.password) : null;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    // Recheck after hashing to prevent concurrent ticket replay or duplicate identities.
    verification.getRegistration(req.body.registrationToken);
    if (contactUser(db(), identity) || (identity.googleSub && db().users.some((u) => u.googleSub === identity.googleSub))) {
      verification.consumeRegistration(req.body.registrationToken);
      throw new ApiError(409, 'AUTH_ACCOUNT_EXISTS', 'An account now exists for this contact. Please sign in again.');
    }
    const user = {
      id: randomUUID(), role: 'farmer', farmerId: mintFarmerId(db()), name,
      [contactField(identity)]: identity.destination,
      [identity.channel === 'sms' ? 'phoneVerified' : 'emailVerified']: true,
      ...(identity.googleSub ? { googleSub: identity.googleSub } : {}),
      passwordHash, villageId: village.id, district: 'Khordha',
      preferredLanguage: ['hi', 'or'].includes(req.body.preferredLanguage) ? req.body.preferredLanguage : 'en',
      createdAt: new Date().toISOString(), registeredBy: `self:verified-${identity.channel}`,
    };
    verification.consumeRegistration(req.body.registrationToken);
    db().users.push(user);
    save();
    res.status(201).json(session(user));
  }));

  // Let existing farmers add email (and email-only farmers add mobile) without
  // duplicate profiles. Proof is bound to the authenticated user and link purpose.
  router.post('/contact/request', authMiddleware, sendLimit, wrap(async (req, res) => {
    const contact = contactOf(req.body);
    const field = contactField(contact);
    if (req.user[field] && req.user[field].toLowerCase() !== contact.destination) throw new ApiError(409, 'AUTH_CONTACT_EXISTS', 'A contact is already linked. Ask your administrator to change it.');
    res.json(await verification.request({ ...contact, role: req.user.role, purpose: 'link', userId: req.user.id }));
  }));
  router.post('/contact/verify', authMiddleware, verifyLimit, wrap(async (req, res) => {
    const identity = await verification.verify({ challengeId: req.body.challengeId, code: req.body.code, role: req.user.role, purpose: 'link', userId: req.user.id });
    const field = contactField(identity);
    const owner = contactUser(db(), identity);
    if ((owner && owner.id !== req.user.id) || (req.user[field] && req.user[field].toLowerCase() !== identity.destination)) {
      throw new ApiError(409, 'AUTH_IDENTITY_CONFLICT', 'This contact cannot be linked to this account. Accounts are never merged automatically.');
    }
    req.user[field] = identity.destination;
    req.user[field === 'phone' ? 'phoneVerified' : 'emailVerified'] = true;
    save();
    res.json({ user: publicUser(req.user) });
  }));

  router.get('/me', authMiddleware, (req, res) => res.json({ user: publicUser(req.user) }));
  return router;
}

export default createAuthRouter();
