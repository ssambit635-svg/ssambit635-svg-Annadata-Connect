import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'annadata-auth-tests-'));
process.env.DATA_FILE = path.join(directory, 'db.json');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-signing-key-that-is-not-a-production-secret';
const { default: config } = await import('../src/config.js');
const { getDb } = await import('../src/db/store.js');
const { createAuthRouter } = await import('../src/routes/auth.routes.js');
const { createVerificationService } = await import('../src/services/auth-verification.service.js');
const { createAuthDelivery } = await import('../src/services/auth-delivery.service.js');
const { ApiError, errorHandler } = await import('../src/middleware/error.js');

const passwordHash = bcrypt.hashSync('Secure-Test-Password', 10);
function fixture({ realUnconfigured = false, overrides = {}, allowDemoLogin = false } = {}) {
  const db = getDb();
  db.users = [
    { id: 'real-farmer', role: 'farmer', phone: '9876543210', name: 'Farmer', passwordHash, villageId: 'v-baranga', farmerId: 'ANC-F-0100' },
    { id: 'real-officer', role: 'officer', phone: '9876543211', email: 'officer@example.com', name: 'Officer', passwordHash, accessApproved: true, centreId: 'centre-jatni' },
    { id: 'real-authority', role: 'authority', phone: '9876543212', email: 'authority@example.com', name: 'Authority', passwordHash, accessApproved: true },
    { id: 'legacy-staff', role: 'authority', email: 'legacy@example.com', name: 'Legacy', registeredBy: 'self:google' },
    { id: 'sample', role: 'farmer', phone: '9999999001', name: 'Demo farmer', isDemo: true, passwordHash },
  ];
  let time = Date.now();
  const messages = [];
  const settings = { ...config, googleClientId: 'test-google-client', allowDemoLogin, ...overrides };
  const delivery = realUnconfigured ? createAuthDelivery({}) : {
    enabled: { google: true, sms: true, email: true },
    requireEnabled() {},
    async sendEmailCode(destination, code) { messages.push({ destination, code }); },
    async sendSmsCode(destination) {
      const sid = `VE${messages.length}`;
      messages.push({ destination, sid, code: '001234' });
      return sid;
    },
    async checkSmsCode(sid, code) { return messages.some((m) => m.sid === sid && m.code === code); },
    async verifyGoogle(credential) {
      if (typeof credential !== 'object' || !credential?.sub) throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'Invalid Google credential.');
      return credential;
    },
  };
  const verification = createVerificationService(delivery, { now: () => time });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ settings, delivery, verification, save() {} }));
  app.use(errorHandler);
  const api = request(app);
  const send = async (destination, channel = 'sms', role = 'farmer') => {
    const result = await api.post('/api/auth/otp/request').send({ destination, channel, role });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.token, undefined);
    assert.equal(result.body.code, undefined);
    return { ...result.body, code: messages.at(-1).code, role };
  };
  const verify = (challenge, extras = {}) => api.post('/api/auth/otp/verify').send({ challengeId: challenge.challengeId, code: challenge.code, role: challenge.role, ...extras });
  const google = async (email, role, sub = `sub:${email}`) => {
    const challenge = await api.post('/api/auth/google/challenge').send({ role });
    assert.equal(challenge.status, 200);
    return api.post('/api/auth/google').send({ role, challengeId: challenge.body.challengeId, credential: { sub, email, email_verified: true, hd: 'example.com', nonce: challenge.body.nonce, name: 'Google Farmer' } });
  };
  return { api, db, settings, delivery, messages, send, verify, google, advance: (ms) => { time += ms; } };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('public auth options expose configuration, not provider credentials', async () => {
  const { api } = fixture();
  const result = await api.get('/api/auth/options');
  assert.equal(result.status, 200);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.deepEqual(Object.keys(result.body).sort(), ['demoEnabled', 'email', 'google', 'password', 'sms']);
  assert.equal(result.body.google.clientId, 'test-google-client');
  assert.equal(result.body.demoEnabled, false);
  assert.equal(JSON.stringify(result.body).includes('Secret'), false);
});

test('legacy phone-only, typed Google email, and unverified registration cannot sign in', async () => {
  const { api } = fixture();
  const phone = await api.post('/api/auth/phone-login').send({ phone: '9876543212', role: 'authority' });
  assert.equal(phone.status, 410);
  assert.equal(phone.body.token, undefined);
  const google = await api.post('/api/auth/google').send({ email: 'authority@example.com', role: 'authority' });
  assert.equal(google.status, 401);
  const register = await api.post('/api/auth/register').send({ phone: '9876543220', password: 'Password123', name: 'Fake', villageId: 'v-baranga' });
  assert.equal(register.status, 400);
  assert.equal(register.body.token, undefined);
});

test('unconfigured Google, SMS and email are unavailable even with notification sim configured', async () => {
  const { api } = fixture({ realUnconfigured: true });
  const options = await api.get('/api/auth/options');
  assert.equal(options.body.sms.enabled, false);
  for (const body of [{ destination: '9876543210', channel: 'sms' }, { destination: 'farmer@example.com', channel: 'email' }]) {
    const result = await api.post('/api/auth/otp/request').send({ ...body, role: 'farmer' });
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, 'AUTH_PROVIDER_UNAVAILABLE');
    assert.equal(result.body.challengeId, undefined);
  }
  const google = await api.post('/api/auth/google').send({ role: 'authority', email: 'authority@example.com' });
  assert.equal(google.status, 503);
});

test('password works for all roles with phone or linked email; wrong role cannot elevate access', async () => {
  const { api } = fixture();
  for (const [identifier, role] of [['9876543210', 'farmer'], ['officer@example.com', 'officer'], ['+91 9876543212', 'authority']]) {
    const result = await api.post('/api/auth/login').send({ identifier, role, password: 'Secure-Test-Password' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.user.role, role);
    assert.equal(result.body.user.passwordHash, undefined);
    assert.equal(jwt.decode(result.body.token).purpose, 'session');
  }
  const wrongRole = await api.post('/api/auth/login').send({ identifier: '9876543210', role: 'authority', password: 'Secure-Test-Password' });
  assert.equal(wrongRole.status, 401);
  const incorrect = await api.post('/api/auth/login').send({ identifier: '9876543210', role: 'farmer', password: 'incorrect' });
  assert.equal(incorrect.status, 401);
});

test('existing farmer must verify SMS before receiving a usable session', async () => {
  const { api, send, verify } = fixture();
  const challenge = await send('+91 98765 43210');
  assert.equal((await verify(challenge, { code: '999999' })).status, 401);
  const result = await verify(challenge);
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, 'real-farmer');
  assert.equal(result.body.user.phoneVerified, true);
  assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${result.body.token}`)).status, 200);
  assert.equal((await verify(challenge)).status, 401);
});

test('approved authorities and officers can sign in via real-verification SMS and email paths', async () => {
  for (const [destination, channel, role] of [
    ['9876543212', 'sms', 'authority'], ['authority@example.com', 'email', 'authority'],
    ['9876543211', 'sms', 'officer'], ['officer@example.com', 'email', 'officer'],
  ]) {
    const { send, verify } = fixture();
    const result = await verify(await send(destination, channel, role));
    assert.equal(result.status, 200);
    assert.equal(result.body.user.role, role);
    if (role === 'officer') assert.equal(result.body.user.centreId, 'centre-jatni');
  }
});

test('new verified identities never self-register as authority or officer', async () => {
  for (const role of ['authority', 'officer']) {
    const { api, db, send, verify, google } = fixture();
    const before = db.users.length;
    const result = await verify(await send('9876543299', 'sms', role));
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'AUTH_APPROVAL_REQUIRED');
    assert.equal(result.body.registrationToken, undefined);
    assert.equal((await google('new-staff@example.com', role)).status, 403);
    assert.equal(db.users.length, before);
    assert.equal((await api.post('/api/auth/google/challenge').send({ role: 'admin' })).status, 400);
  }
});

test('new email farmer registration is identity-bound, always farmer, single-use, and supports password', async () => {
  const { api, db, send, verify } = fixture();
  const result = await verify(await send('New.Farmer@Example.com', 'email'));
  assert.equal(result.body.registrationRequired, true);
  assert.equal(result.body.token, undefined);
  const { registrationToken } = result.body;
  assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${registrationToken}`)).status, 401);
  const payload = { registrationToken, name: 'New Farmer', villageId: 'v-baranga', password: 'PrivateFarmerPassword', role: 'authority', phone: '9876543212', email: 'authority@example.com' };
  const registered = await api.post('/api/auth/register').send(payload);
  assert.equal(registered.status, 201, JSON.stringify(registered.body));
  assert.equal(registered.body.user.role, 'farmer');
  assert.equal(registered.body.user.email, 'new.farmer@example.com');
  assert.equal(registered.body.user.phone, undefined);
  assert.equal(registered.body.user.emailVerified, true);
  assert.match(registered.body.user.farmerId, /^ANC-F-\d+$/);
  assert.equal(registered.body.user.passwordHash, undefined);
  const user = db.users.find((u) => u.id === registered.body.user.id);
  assert.equal(bcrypt.compareSync(payload.password, user.passwordHash), true);
  assert.equal((await api.post('/api/auth/register').send(payload)).status, 401);
  const signedIn = await api.post('/api/auth/login').send({ identifier: 'new.farmer@example.com', password: payload.password, role: 'farmer' });
  assert.equal(signedIn.status, 200);
});

test('invalid farmer profile can be corrected without losing proof, but tickets expire', async () => {
  const { api, send, verify, advance } = fixture();
  const result = await verify(await send('9876543299'));
  const payload = { registrationToken: result.body.registrationToken, name: 'New Farmer', villageId: 'missing' };
  assert.equal((await api.post('/api/auth/register').send(payload)).status, 400);
  advance(600000);
  const expired = await api.post('/api/auth/register').send({ ...payload, villageId: 'v-baranga' });
  assert.equal(expired.status, 401);
  assert.equal(expired.body.error.code, 'AUTH_REGISTRATION_EXPIRED');
});

test('parallel registrations cannot replay a ticket or create duplicate users', async () => {
  const { api, db, send, verify } = fixture();
  const result = await verify(await send('9876543299'));
  const payload = { registrationToken: result.body.registrationToken, name: 'Farmer', villageId: 'v-baranga', password: 'PrivateFarmerPassword' };
  const responses = await Promise.all([api.post('/api/auth/register').send(payload), api.post('/api/auth/register').send(payload)]);
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 401]);
  assert.equal(db.users.filter((u) => u.phone === '9876543299').length, 1);
});

test('Google works for all roles, binds subject, and does not expose internal claims', async () => {
  const { api, google, db } = fixture();
  for (const role of ['officer', 'authority']) {
    const signed = await google(`${role}@example.com`, role);
    assert.equal(signed.status, 200);
    assert.equal(signed.body.user.role, role);
    assert.equal(signed.body.user.googleSub, undefined);
    assert.equal(db.users.find((u) => u.role === role).googleSub, `sub:${role}@example.com`);
  }
  const newFarmer = await google('google-farmer@example.com', 'farmer');
  assert.equal(newFarmer.body.registrationRequired, true);
  const created = await api.post('/api/auth/register').send({ registrationToken: newFarmer.body.registrationToken, name: 'Google Farmer', villageId: 'v-baranga' });
  assert.equal(created.status, 201);
  assert.equal((await google('google-farmer@example.com', 'farmer')).body.user.id, created.body.user.id);
});

test('valid OTP or Google for a staff contact does not silently switch from farmer to staff', async () => {
  const { send, verify, google } = fixture();
  const result = await verify(await send('9876543212', 'sms', 'farmer'));
  assert.equal(result.status, 403);
  assert.equal(result.body.error.code, 'AUTH_ROLE_MISMATCH');
  assert.equal((await google('officer@example.com', 'farmer')).status, 403);
});

test('unapproved legacy staff and seed identities cannot use real provider login', async () => {
  const { google, send, verify } = fixture({ allowDemoLogin: true });
  assert.equal((await google('legacy@example.com', 'authority')).status, 403);
  const demo = await verify(await send('9999999001'));
  assert.equal(demo.status, 403);
  assert.equal(demo.body.error.code, 'AUTH_DEMO_ACCOUNT');
});

test('demo password access is separately opt-in and blocked when disabled', async () => {
  const payload = { identifier: '9999999001', password: 'Secure-Test-Password', role: 'farmer' };
  assert.equal((await fixture().api.post('/api/auth/login').send(payload)).status, 403);
  assert.equal((await fixture({ allowDemoLogin: true }).api.post('/api/auth/login').send(payload)).status, 200);
});

test('contact linking requires a session and proof; linked email signs in to same farmer', async () => {
  const { api, db, messages, send, verify, advance } = fixture();
  const login = await api.post('/api/auth/login').send({ identifier: '9876543210', password: 'Secure-Test-Password', role: 'farmer' });
  const auth = `Bearer ${login.body.token}`;
  assert.equal((await api.post('/api/auth/contact/request').send({ channel: 'email', destination: 'my-farm@example.com' })).status, 401);
  const challenge = await api.post('/api/auth/contact/request').set('Authorization', auth).send({ channel: 'email', destination: 'my-farm@example.com' });
  assert.equal(challenge.status, 200);
  assert.equal(db.users.find((u) => u.id === 'real-farmer').email, undefined);
  const body = { challengeId: challenge.body.challengeId, code: messages.at(-1).code };
  assert.equal((await api.post('/api/auth/otp/verify').send({ ...body, role: 'farmer' })).status, 401);
  const linked = await api.post('/api/auth/contact/verify').set('Authorization', auth).send(body);
  assert.equal(linked.status, 200);
  assert.equal(linked.body.user.emailVerified, true);
  advance(60000);
  const emailLogin = await verify(await send('my-farm@example.com', 'email'));
  assert.equal(emailLogin.body.user.id, 'real-farmer');
  assert.equal(db.users.filter((u) => u.role === 'farmer').length, 2); // original + isolated sample
});

test('linking an existing contact cannot merge accounts or steal a staff identity', async () => {
  const { api, messages } = fixture();
  const login = await api.post('/api/auth/login').send({ identifier: '9876543210', password: 'Secure-Test-Password', role: 'farmer' });
  const auth = `Bearer ${login.body.token}`;
  const sent = await api.post('/api/auth/contact/request').set('Authorization', auth).send({ channel: 'email', destination: 'authority@example.com' });
  const linked = await api.post('/api/auth/contact/verify').set('Authorization', auth).send({ challengeId: sent.body.challengeId, code: messages.at(-1).code });
  assert.equal(linked.status, 409);
  assert.equal(linked.body.error.code, 'AUTH_IDENTITY_CONFLICT');
});

test('old bypass-era JWTs and wrong-purpose JWTs no longer access protected APIs', async () => {
  const { api } = fixture();
  for (const token of [
    jwt.sign({ sub: 'real-authority', role: 'authority' }, config.jwtSecret),
    jwt.sign({ sub: 'real-authority', role: 'authority', purpose: 'registration' }, config.jwtSecret, { issuer: 'annadata-connect', audience: 'annadata-connect:web' }),
  ]) assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status, 401);
});

test('OTP send cooldown is surfaced as HTTP 429 with Retry-After', async () => {
  const { api, send } = fixture();
  await send('9876543210');
  const result = await api.post('/api/auth/otp/request').send({ destination: '9876543210', channel: 'sms', role: 'authority' });
  assert.equal(result.status, 429);
  assert.equal(result.headers['retry-after'], '60');
});

test('IP rate limiter also bounds bogus code verification requests', async () => {
  const { api } = fixture();
  for (let i = 0; i < 30; i++) await api.post('/api/auth/otp/verify').send({ challengeId: 'bogus', code: '000000', role: 'farmer' });
  const result = await api.post('/api/auth/otp/verify').send({ challengeId: 'bogus', code: '000000', role: 'farmer' });
  assert.equal(result.status, 429);
  assert.equal(result.body.error.code, 'AUTH_RATE_LIMITED');
});


test('a stale non-Gmail Google email cannot claim an approved staff identity', async () => {
  const { api } = fixture();
  const challenge = await api.post('/api/auth/google/challenge').send({ role: 'authority' });
  const result = await api.post('/api/auth/google').send({
    role: 'authority', challengeId: challenge.body.challengeId,
    credential: { sub: 'former-email-owner', email: 'authority@example.com', email_verified: true, nonce: challenge.body.nonce },
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.error.code, 'AUTH_GOOGLE_EMAIL_CONFIRMATION_REQUIRED');
  assert.equal(result.body.token, undefined);
});
