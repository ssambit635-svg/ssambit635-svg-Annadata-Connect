import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { createAuthDelivery } from '../src/services/auth-delivery.service.js';

const settings = {
  googleClientId: 'test-web-client.apps.googleusercontent.com', authSmsProvider: 'twilio-verify',
  smsTwilioSid: 'AC_TEST', smsTwilioToken: 'test-token', twilioVerifyServiceSid: 'VA_TEST',
  authEmailProvider: 'smtp', smtpHost: 'smtp.example.test', smtpPort: 587, smtpSecure: false,
  smtpUser: 'smtp-user', smtpPassword: 'test-password', smtpFrom: 'Annadata <sender@example.test>',
};
const sid = 'VE' + 'a'.repeat(32);
const rejectCode = (code) => (err) => { assert.equal(err.code, code); return true; };

test('unconfigured providers fail closed, including notification SMS sim mode', async () => {
  const provider = createAuthDelivery({ smsProvider: 'sim', authSmsProvider: 'sim' });
  assert.deepEqual(provider.enabled, { google: false, sms: false, email: false });
  await assert.rejects(provider.sendSmsCode('9876543210'), rejectCode('AUTH_PROVIDER_UNAVAILABLE'));
  await assert.rejects(provider.sendEmailCode('test@example.com', '123456'), rejectCode('AUTH_PROVIDER_UNAVAILABLE'));
  await assert.rejects(provider.verifyGoogle('not-a-token'), rejectCode('AUTH_PROVIDER_UNAVAILABLE'));
});

test('Twilio Verify receives E.164 destination and verification SID, never notification messages', async () => {
  const requests = [];
  const provider = createAuthDelivery(settings, { fetcher: async (url, opts) => {
    requests.push({ url, opts });
    return { ok: true, status: 200, json: async () => ({ sid, status: requests.length === 1 ? 'pending' : 'approved' }) };
  } });
  assert.equal(await provider.sendSmsCode('9876543210'), sid);
  assert.equal(await provider.checkSmsCode(sid, '001234'), true);
  assert.equal(requests[0].opts.body.get('To'), '+919876543210');
  assert.equal(requests[0].opts.body.get('Channel'), 'sms');
  assert.equal(requests[1].opts.body.get('Code'), '001234');
  assert.equal(requests[1].opts.body.get('VerificationSid'), sid);
  assert.match(requests[0].url, /^https:\/\/verify\.twilio\.com\/v2\/Services\/VA_TEST\/Verifications$/);
  assert.ok(requests[0].opts.signal);
});

test('Twilio wrong, expired, unavailable, throttled, and malformed responses do not authenticate', async () => {
  for (const status of [400, 404]) {
    const delivery = createAuthDelivery(settings, { fetcher: async () => ({ status, ok: false }) });
    assert.equal(await delivery.checkSmsCode(sid, '123456'), false);
  }
  const wrong = createAuthDelivery(settings, { fetcher: async () => ({ status: 200, ok: true, json: async () => ({ sid, status: 'pending' }) }) });
  assert.equal(await wrong.checkSmsCode(sid, '123456'), false);
  for (const status of [401, 500, 429]) {
    const delivery = createAuthDelivery(settings, { fetcher: async () => ({ status, ok: false }) });
    await assert.rejects(delivery.sendSmsCode('9876543210'), rejectCode(status === 429 ? 'AUTH_RATE_LIMITED' : 'AUTH_DELIVERY_FAILED'));
  }
  const malformed = createAuthDelivery(settings, { fetcher: async () => ({ status: 200, ok: true, json: async () => ({ status: 'pending' }) }) });
  await assert.rejects(malformed.sendSmsCode('9876543210'), rejectCode('AUTH_DELIVERY_FAILED'));
  const offline = createAuthDelivery(settings, { fetcher: async () => { throw new Error('secret provider response'); } });
  await assert.rejects(offline.sendSmsCode('9876543210'), (err) => { assert.equal(err.code, 'AUTH_DELIVERY_FAILED'); assert.ok(!err.message.includes('secret')); return true; });
});

test('email uses authenticated TLS SMTP, a real recipient, and handles rejected delivery', async () => {
  let config;
  let message;
  const delivery = createAuthDelivery(settings, { mailer: { createTransport: (opts) => {
    config = opts;
    return { sendMail: async (mail) => { message = mail; return { accepted: ['farmer@example.com'], rejected: [] }; } };
  } } });
  await delivery.sendEmailCode('farmer@example.com', '001234');
  assert.equal(config.requireTLS, true);
  assert.equal(config.secure, false);
  assert.equal(config.logger, false);
  assert.equal(config.debug, false);
  assert.equal(message.to, 'farmer@example.com');
  assert.match(message.text, /001234/);
  assert.equal(message.disableFileAccess, true);
  const failure = createAuthDelivery(settings, { mailer: { createTransport: () => ({ sendMail: async () => ({ accepted: [], rejected: ['farmer@example.com'] }) }) } });
  await assert.rejects(failure.sendEmailCode('farmer@example.com', '123456'), rejectCode('AUTH_DELIVERY_FAILED'));
});

// Real RSA signature verification with local test keys; only Google's key fetch is mocked.
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' });
const client = new OAuth2Client();
client.getFederatedSignonCertsAsync = async () => ({ certs: { 'test-key': publicKey }, format: 'PEM' });
const signed = (changes = {}, options = {}) => jwt.sign({
  iss: 'https://accounts.google.com', aud: settings.googleClientId, sub: 'google-subject',
  email: 'farmer@example.com', email_verified: true, nonce: 'nonce', exp: Math.floor(Date.now() / 1000) + 600,
  ...changes,
}, keys.privateKey, { algorithm: 'RS256', keyid: 'test-key', ...options });

test('Google tokens are cryptographically verified against the exact web-client audience', async () => {
  const delivery = createAuthDelivery(settings, { googleClient: client });
  const claims = await delivery.verifyGoogle(signed());
  assert.equal(claims.sub, 'google-subject');
  assert.equal(claims.email, 'farmer@example.com');
});

for (const [label, changes] of [
  ['wrong audience', { aud: 'attacker-client' }],
  ['wrong issuer', { iss: 'https://attacker.example' }],
  ['expired (including Google clock-skew allowance)', { exp: Math.floor(Date.now() / 1000) - 10 }],
  ['unverified email', { email_verified: false }],
  ['string rather than boolean verified claim', { email_verified: 'true' }],
  ['missing subject', { sub: '' }],
]) test(`Google rejects ${label}`, async () => {
  const delivery = createAuthDelivery(settings, { googleClient: client });
  await assert.rejects(delivery.verifyGoogle(signed(changes)), rejectCode('AUTH_GOOGLE_INVALID'));
});

test('Google rejects forged signatures and unsigned credentials', async () => {
  const delivery = createAuthDelivery(settings, { googleClient: client });
  const token = signed();
  const [header, payload, signature] = token.split('.');
  const altered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), email: 'authority@example.com' })).toString('base64url');
  await assert.rejects(delivery.verifyGoogle(`${header}.${altered}.${signature}`), rejectCode('AUTH_GOOGLE_INVALID'));
  await assert.rejects(delivery.verifyGoogle('authority@example.com'), rejectCode('AUTH_GOOGLE_INVALID'));
});
