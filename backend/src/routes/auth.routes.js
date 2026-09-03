import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import config from '../config.js';
import { getDb, saveDb, mintFarmerId } from '../db/store.js';
import { authenticate, publicUser } from '../middleware/auth.js';
import { ApiError } from '../middleware/error.js';
import { requireFields, requirePassword, requirePhone } from '../middleware/validate.js';
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
    const phone = String(req.body.phone).trim();
    const user = db.users.find((u) => u.phone === phone);
    if (!user || !bcrypt.compareSync(String(req.body.password), user.passwordHash)) {
      throw new ApiError(401, 'AUTH_INVALID_CREDENTIALS', 'Incorrect phone number or password.');
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;
