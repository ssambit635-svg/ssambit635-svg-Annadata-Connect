import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import config from '../config.js';
import { getDb, saveDb, mintFarmerId } from '../db/store.js';
import { authenticate, publicUser } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requirePassword, requirePhone, normalizePhone, requireEmail } from '../middleware/validate.js';
import { sendSms } from '../services/sms.service.js';

const router = Router();

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// POST /api/auth/register — public, creates a FARMER account only.
router.post('/register', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['name', 'phone', 'password', 'villageId']);
    const name = String(req.body.name).trim();
    if (name.length < 2) throw new ApiError(400, 'VALIDATION_ERROR', 'Name is too short.');
    const phone = requirePhone(req.body.phone);
    const password = requirePassword(req.body.password);
    const village = db.villages.find((v) => v.id === req.body.villageId);
    if (!village) throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid village.');
    if (db.users.some((u) => u.phone === phone)) {
      throw new ApiError(409, 'PHONE_ALREADY_REGISTERED', 'An account with this phone number already exists.');
    }
    const user = {
      id: randomUUID(),
      role: 'farmer',
      farmerId: mintFarmerId(db),
      name,
      phone,
      passwordHash: bcrypt.hashSync(password, 10),
      villageId: village.id,
      district: 'Khordha',
      preferredLanguage: req.body.preferredLanguage === 'hi' ? 'hi' : 'en',
      createdAt: new Date().toISOString(),
      registeredBy: 'self',
    };
    db.users.push(user);
    saveDb();
    sendSms(getDb(), {
      to: user.phone,
      text: `Annadata Connect: Welcome ${user.name}! Your farmer account is ready. Login with your mobile number to book procurement tokens.`,
    }).catch(() => {});
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['phone', 'password']);
    const phone = normalizePhone(req.body.phone);
    const user = db.users.find((u) => u.phone === phone);
    if (!user) {
      throw new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect phone number or password.');
    }
    if (!user.passwordHash) {
      // Account created through quick phone / Google sign-in — no password set.
      throw new ApiError(401, 'AUTH_NO_PASSWORD', 'This account signs in with its mobile number or Google. Please use quick login.');
    }
    if (!bcrypt.compareSync(String(req.body.password), user.passwordHash)) {
      throw new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect phone number or password.');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/phone-login — passwordless "real" mobile login.
// Any 10-digit number works: an existing account (any role) is signed in
// straight away; a brand-new number creates a farmer account after a one-time
// name + village step.
router.post('/phone-login', (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['phone']);
    const phone = normalizePhone(req.body.phone);

    const existing = db.users.find((u) => u.phone === phone);
    if (existing) {
      return res.json({ token: signToken(existing), user: publicUser(existing), isNewUser: false });
    }

    // New number → finish creating the farmer profile first.
    const name = String(req.body.name || '').trim();
    const village = req.body.villageId ? db.villages.find((v) => v.id === req.body.villageId) : null;
    if (name.length < 2 || !village) {
      throw new ApiError(422, 'AUTH_PROFILE_REQUIRED', 'New number — please complete your profile to continue.', {
        fields: ['name', 'villageId'],
      });
    }

    const user = {
      id: randomUUID(),
      role: 'farmer',
      farmerId: mintFarmerId(db),
      name,
      phone,
      passwordHash: null,
      villageId: village.id,
      district: 'Khordha',
      preferredLanguage: req.body.preferredLanguage === 'hi' ? 'hi' : 'en',
      createdAt: new Date().toISOString(),
      registeredBy: 'self:phone',
    };
    db.users.push(user);
    saveDb();
    sendSms(getDb(), {
      to: user.phone,
      text: `Annadata Connect: Welcome ${user.name}! Your farmer account is ready. Login with your mobile number to book procurement tokens.`,
    }).catch(() => {});
    res.status(201).json({ token: signToken(user), user: publicUser(user), isNewUser: true });
  } catch (e) {
    next(e);
  }
});

// POST /api/auth/google — Google (Gmail) sign-in for officers & authorities.
//
// Two modes:
//   • credential present → the Google ID token is verified against Google's
//     tokeninfo endpoint (and GOOGLE_CLIENT_ID when configured). This is the
//     production path used with Google Identity Services on the frontend.
//   • no credential → demo mode. Only allowed while GOOGLE_CLIENT_ID is not
//     configured, so the flow works out of the box. Accepts any valid email.
router.post('/google', async (req, res, next) => {
  try {
    const db = getDb();
    requireFields(req.body, ['role']);
    const role = String(req.body.role);
    if (role !== 'officer' && role !== 'authority') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Google sign-in is available for officers and authorities.');
    }

    let email;
    let name = String(req.body.name || '').trim();

    if (req.body.credential) {
      // Production path: verify the Google-issued ID token.
      const verified = await verifyGoogleCredential(String(req.body.credential));
      email = verified.email;
      if (!name) name = verified.name || '';
    } else {
      if (config.googleClientId) {
        throw new ApiError(401, 'AUTH_GOOGLE_CREDENTIAL_REQUIRED', 'Google credential is required.');
      }
      email = requireEmail(req.body.email);
    }

    const existing = db.users.find((u) => (u.email || '').toLowerCase() === email);
    if (existing) {
      // Log the account in with its real role, whatever tab was selected.
      return res.json({ token: signToken(existing), user: publicUser(existing), isNewUser: false });
    }

    if (!name) name = prettyNameFromEmail(email);

    const user = {
      id: randomUUID(),
      role,
      name,
      email,
      passwordHash: null,
      district: 'Khordha',
      createdAt: new Date().toISOString(),
      registeredBy: 'self:google',
    };
    if (role === 'officer') {
      // Assign a default open centre; the authority dashboard can re-assign later.
      const centre = db.centres.find((c) => c.status === 'OPEN') || db.centres[0];
      user.centreId = centre ? centre.id : null;
    }
    db.users.push(user);
    saveDb();
    res.status(201).json({ token: signToken(user), user: publicUser(user), isNewUser: true });
  } catch (e) {
    next(e);
  }
});

// Derives a display name from an email local part: "arun.patel21" → "Arun Patel",
// "meera.nayak.ias" → "Meera Nayak IAS".
function prettyNameFromEmail(email) {
  const local = email.split('@')[0].replace(/[._\-+]+/g, ' ').replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!local) return 'Google User';
  const words = local.split(' ');
  return words
    .map((w, i) => {
      if (i > 0 && i === words.length - 1 && /^[a-z]{2,3}$/.test(w)) return w.toUpperCase(); // looks like IAS/PCS
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .slice(0, 60);
}

// Verifies a Google ID token via Google's public tokeninfo endpoint.
async function verifyGoogleCredential(credential) {
  let payload;
  try {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`tokeninfo returned ${r.status}`);
    payload = await r.json();
  } catch {
    throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'Could not verify the Google sign-in. Please try again.');
  }
  if (config.googleClientId && payload.aud !== config.googleClientId) {
    throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'This Google sign-in was not issued for this app.');
  }
  if (!payload.email || String(payload.email_verified) !== 'true') {
    throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'Google account email is not verified.');
  }
  return { email: payload.email.toLowerCase(), name: payload.name || '' };
}

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
