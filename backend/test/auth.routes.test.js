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
const { createMockDelivery, MOCK_GOOGLE_ACCOUNTS } = await import('../src/services/auth-mock.service.js');
const { errorHandler } = await import('../src/middleware/error.js');

const passwordHash = bcrypt.hashSync('Secure-Test-Password', 10);
const mockEmail = (role) => MOCK_GOOGLE_ACCOUNTS.find((account) => account.role === role).email;

function fixture({ overrides = {}, allowDemoLogin = true, dropUsers = [] } = {}) {
  const db = getDb();
  db.users = [
    { id: 'mock-farmer', role: 'farmer', phone: '9876543210', email: mockEmail('farmer'), name: 'Farmer', passwordHash, villageId: 'v-baranga', farmerId: 'ANC-F-0100' },
    { id: 'mock-officer', role: 'officer', phone: '9876543211', email: mockEmail('officer'), name: 'Officer', passwordHash, accessApproved: true, centreId: 'centre-jatni' },
    { id: 'mock-authority', role: 'authority', phone: '9876543212', email: mockEmail('authority'), name: 'Authority', passwordHash, accessApproved: true },
    { id: 'legacy-staff', role: 'authority', email: 'legacy@example.com', name: 'Legacy', registeredBy: 'self:google' },
    { id: 'sample', role: 'farmer', phone: '9999999001', name: 'Demo farmer', isDemo: true, passwordHash },
  ].filter((user) => !dropUsers.includes(user.id));
  let time = Date.now();
  const settings = { ...config, allowDemoLogin, ...overrides };
  const delivery = createMockDelivery();
  const verification = createVerificationService(delivery, { now: () => time });
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createAuthRouter({ settings, delivery, verification, save() {} }));
  app.use(errorHandler);
  const api = request(app);
  const send = async (destination, channel = 'sms', role = 'farmer') => {
    const result = await api.post('/api/auth/otp/request').send({ destination, channel, role });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.match(result.body.mockCode, /^\d{6}$/, 'mock mode must hand the code to the client');
    assert.equal(result.body.token, undefined);
    return { ...result.body, role };
  };
  const verify = (challenge, extras = {}) => api.post('/api/auth/otp/verify')
    .send({ challengeId: challenge.challengeId, code: challenge.mockCode, role: challenge.role, ...extras });
  const google = (email, role) => api.post('/api/auth/google').send({ role, email });
  return { api, db, settings, delivery, send, verify, google, advance: (ms) => { time += ms; } };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('options advertise mock mode and the sample Google accounts', async () => {
  const { api } = fixture();
  const result = await api.get('/api/auth/options');
  assert.equal(result.status, 200);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.deepEqual(Object.keys(result.body).sort(), ['demoEnabled', 'email', 'google', 'mock', 'password', 'sms']);
  assert.equal(result.body.mock, true);
  assert.equal(result.body.google.mock, true);
  assert.equal(result.body.google.clientId, undefined);
  assert.equal(result.body.google.accounts.length, MOCK_GOOGLE_ACCOUNTS.length);
  assert.deepEqual(result.body.sms, { enabled: true, mock: true });
  assert.deepEqual(result.body.email, { enabled: true, mock: true });
  assert.equal(result.body.demoEnabled, true);
  assert.equal(JSON.stringify(result.body).toLowerCase().includes('secret'), false);
});

test('the retired unverified phone login stays gone', async () => {
  const { api } = fixture();
  const phone = await api.post('/api/auth/phone-login').send({ phone: '9876543212', role: 'authority' });
  assert.equal(phone.status, 410);
  assert.equal(phone.body.token, undefined);
});

test('password works for all roles with phone or linked email; wrong role cannot elevate access', async () => {
  const { api } = fixture();
  for (const [identifier, role] of [['9876543210', 'farmer'], [mockEmail('officer'), 'officer'], ['+91 9876543212', 'authority']]) {
    const result = await api.post('/api/auth/login').send({ identifier, role, password: 'Secure-Test-Password' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.user.role, role);
    assert.equal(result.body.user.passwordHash, undefined);
    assert.equal(jwt.decode(result.body.token).purpose, 'session');
  }
  assert.equal((await api.post('/api/auth/login').send({ identifier: '9876543210', role: 'authority', password: 'Secure-Test-Password' })).status, 401);
  assert.equal((await api.post('/api/auth/login').send({ identifier: '9876543210', role: 'farmer', password: 'incorrect' })).status, 401);
});

test('mock SMS OTP: the code shown on screen is required, single-use, and issues a session', async () => {
  const { api, send, verify, delivery } = fixture();
  const challenge = await send('+91 98765 43210');
  assert.equal(delivery.outbox.at(-1).code, challenge.mockCode);
  const wrong = await api.post('/api/auth/otp/verify').send({ challengeId: challenge.challengeId, code: '999999', role: 'farmer' });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.code, 'AUTH_OTP_INVALID');
  assert.equal(wrong.body.error.details.attemptsRemaining, 4);
  const result = await verify(challenge);
  assert.equal(result.status, 200);
  assert.equal(result.body.user.id, 'mock-farmer');
  assert.equal(result.body.user.phoneVerified, true);
  assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${result.body.token}`)).status, 200);
  assert.equal((await verify(challenge)).status, 401);
});

test('officers and authorities sign in with mock SMS and mock email codes', async () => {
  for (const [destination, channel, role] of [
    ['9876543212', 'sms', 'authority'], [mockEmail('authority'), 'email', 'authority'],
    ['9876543211', 'sms', 'officer'], [mockEmail('officer'), 'email', 'officer'],
  ]) {
    const { send, verify } = fixture();
    const result = await verify(await send(destination, channel, role));
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.user.role, role);
    if (role === 'officer') assert.equal(result.body.user.centreId, 'centre-jatni');
  }
});

test('new verified identities never self-register as authority or officer', async () => {
  for (const role of ['authority', 'officer']) {
    const { db, send, verify } = fixture();
    const before = db.users.length;
    const result = await verify(await send('9876543299', 'sms', role));
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'AUTH_APPROVAL_REQUIRED');
    assert.equal(result.body.registrationToken, undefined);
    assert.equal(db.users.length, before);
  }
});

test('unapproved legacy staff cannot use their email even with a valid mock code', async () => {
  const { send, verify } = fixture();
  const result = await verify(await send('legacy@example.com', 'email', 'authority'));
  assert.equal(result.status, 403);
  assert.equal(result.body.error.code, 'AUTH_APPROVAL_REQUIRED');
});

test('new email farmer registration is identity-bound, always farmer, single-use, and supports password', async () => {
  const { api, db, send, verify } = fixture();
  const result = await verify(await send('New.Farmer@Example.com', 'email'));
  assert.equal(result.body.registrationRequired, true);
  assert.equal(result.body.token, undefined);
  const { registrationToken } = result.body;
  assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${registrationToken}`)).status, 401);
  const payload = { registrationToken, name: 'New Farmer', villageId: 'v-baranga', password: 'PrivateFarmerPassword', role: 'authority', phone: '9876543212', email: mockEmail('authority') };
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

test('the mock Google picker signs every role into its sample account and binds the subject', async () => {
  const { api, google, db } = fixture();
  for (const role of ['farmer', 'officer', 'authority']) {
    const signed = await google(mockEmail(role), role);
    assert.equal(signed.status, 200, JSON.stringify(signed.body));
    assert.equal(signed.body.user.role, role);
    assert.equal(signed.body.user.emailVerified, true);
    assert.equal(signed.body.user.googleSub, undefined);
    assert.equal(db.users.find((u) => u.email === mockEmail(role)).googleSub, MOCK_GOOGLE_ACCOUNTS.find((a) => a.role === role).sub);
  }
  assert.equal((await api.get('/api/auth/me').set('Authorization', `Bearer ${(await google(mockEmail('authority'), 'authority')).body.token}`)).status, 200);
});

test('mock Google rejects unknown accounts, wrong roles, and body-only emails', async () => {
  const { api, google } = fixture();
  const unknown = await google('authority@example.com', 'authority');
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.error.code, 'AUTH_GOOGLE_INVALID');
  const mismatch = await google(mockEmail('officer'), 'farmer');
  assert.equal(mismatch.status, 403);
  assert.equal(mismatch.body.error.code, 'AUTH_ROLE_MISMATCH');
  assert.equal((await api.post('/api/auth/google').send({ email: mockEmail('farmer') })).status, 400);
  assert.equal((await api.post('/api/auth/google').send({ role: 'admin', email: mockEmail('farmer') })).status, 400);
});

test('a mock Google account with no matching user becomes a farmer registration', async () => {
  const { api, google } = fixture({ dropUsers: ['mock-farmer'] });
  const result = await google(mockEmail('farmer'), 'farmer');
  assert.equal(result.status, 200);
  assert.equal(result.body.registrationRequired, true);
  assert.equal(result.body.profile.email, mockEmail('farmer'));
  const created = await api.post('/api/auth/register').send({ registrationToken: result.body.registrationToken, name: 'Bijay Pradhan', villageId: 'v-baranga' });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, mockEmail('farmer'));
  assert.equal((await google(mockEmail('farmer'), 'farmer')).body.user.id, created.body.user.id);
});

test('sample accounts are usable mock data, and can be switched off with ALLOW_DEMO_LOGIN=false', async () => {
  const enabled = fixture();
  const demoOtp = await enabled.verify(await enabled.send('9999999001'));
  assert.equal(demoOtp.status, 200);
  assert.equal(demoOtp.body.user.id, 'sample');
  assert.equal((await enabled.google('not-in-picker@gmail.com', 'farmer')).status, 401); // picker list is fixed
  assert.equal((await enabled.api.post('/api/auth/login').send({ identifier: '9999999001', password: 'Secure-Test-Password', role: 'farmer' })).status, 200);
  const disabled = fixture({ allowDemoLogin: false });
  const blocked = await disabled.verify(await disabled.send('9999999001'));
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.error.code, 'AUTH_ACCOUNT_DISABLED');
  assert.equal((await disabled.api.post('/api/auth/login').send({ identifier: '9999999001', password: 'Secure-Test-Password', role: 'farmer' })).status, 403);
});

test('contact linking requires a session and the mock code; linked email signs in to the same farmer', async () => {
  const { api, db, send, verify, advance } = fixture();
  delete db.users.find((u) => u.id === 'mock-farmer').email; // a farmer without an email yet
  const login = await api.post('/api/auth/login').send({ identifier: '9876543210', password: 'Secure-Test-Password', role: 'farmer' });
  const auth = `Bearer ${login.body.token}`;
  assert.equal((await api.post('/api/auth/contact/request').send({ channel: 'email', destination: 'my-farm@example.com' })).status, 401);
  const challenge = await api.post('/api/auth/contact/request').set('Authorization', auth).send({ channel: 'email', destination: 'my-farm@example.com' });
  assert.equal(challenge.status, 200);
  assert.match(challenge.body.mockCode, /^\d{6}$/);
  const body = { challengeId: challenge.body.challengeId, code: challenge.body.mockCode };
  assert.equal((await api.post('/api/auth/otp/verify').send({ ...body, role: 'farmer' })).status, 401); // wrong purpose
  const linked = await api.post('/api/auth/contact/verify').set('Authorization', auth).send(body);
  assert.equal(linked.status, 200);
  assert.equal(linked.body.user.emailVerified, true);
  assert.equal(db.users.find((u) => u.id === 'mock-farmer').email, 'my-farm@example.com');
  advance(60000);
  assert.equal((await verify(await send('my-farm@example.com', 'email'))).body.user.id, 'mock-farmer');
});

test('linking an existing contact cannot merge accounts or steal a staff identity', async () => {
  const { api, db } = fixture();
  delete db.users.find((u) => u.id === 'mock-farmer').email;
  const login = await api.post('/api/auth/login').send({ identifier: '9876543210', password: 'Secure-Test-Password', role: 'farmer' });
  const auth = `Bearer ${login.body.token}`;
  const sent = await api.post('/api/auth/contact/request').set('Authorization', auth).send({ channel: 'email', destination: mockEmail('authority') });
  const linked = await api.post('/api/auth/contact/verify').set('Authorization', auth)
    .send({ challengeId: sent.body.challengeId, code: sent.body.mockCode });
  assert.equal(linked.status, 409);
  assert.equal(linked.body.error.code, 'AUTH_IDENTITY_CONFLICT');
});

test('sample accounts can link a contact in mock mode', async () => {
  const { api } = fixture();
  const login = await api.post('/api/auth/login').send({ identifier: '9999999001', password: 'Secure-Test-Password', role: 'farmer' });
  const auth = `Bearer ${login.body.token}`;
  const sent = await api.post('/api/auth/contact/request').set('Authorization', auth).send({ channel: 'email', destination: 'sample.link@example.com' });
  assert.equal(sent.status, 200);
  const linked = await api.post('/api/auth/contact/verify').set('Authorization', auth)
    .send({ challengeId: sent.body.challengeId, code: sent.body.mockCode });
  assert.equal(linked.status, 200);
  assert.equal(linked.body.user.email, 'sample.link@example.com');
  assert.equal(linked.body.user.emailVerified, true);
});

test('old bypass-era JWTs and wrong-purpose JWTs no longer access protected APIs', async () => {
  const { api } = fixture();
  for (const token of [
    jwt.sign({ sub: 'mock-authority', role: 'authority' }, config.jwtSecret),
    jwt.sign({ sub: 'mock-authority', role: 'authority', purpose: 'registration' }, config.jwtSecret, { issuer: 'annadata-connect', audience: 'annadata-connect:web' }),
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
  for (let i = 0; i < 30; i += 1) await api.post('/api/auth/otp/verify').send({ challengeId: 'bogus', code: '000000', role: 'farmer' });
  const result = await api.post('/api/auth/otp/verify').send({ challengeId: 'bogus', code: '000000', role: 'farmer' });
  assert.equal(result.status, 429);
  assert.equal(result.body.error.code, 'AUTH_RATE_LIMITED');
});

test('contact details are validated before any mock code is generated', async () => {
  const { api, delivery } = fixture();
  for (const body of [{ destination: '12345', channel: 'sms' }, { destination: 'not-an-email', channel: 'email' }, { destination: '9876543210', channel: 'whatsapp' }]) {
    const result = await api.post('/api/auth/otp/request').send({ ...body, role: 'farmer' });
    assert.equal(result.status, 400);
    assert.equal(result.body.error.code, 'VALIDATION_ERROR');
  }
  assert.equal(delivery.outbox.length, 0);
});
