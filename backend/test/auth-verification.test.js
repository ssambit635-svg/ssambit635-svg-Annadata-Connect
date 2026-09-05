import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerificationService, OTP_TTL_MS, OTP_COOLDOWN_MS } from '../src/services/auth-verification.service.js';

function fixture(overrides = {}) {
  let clock = Date.now();
  const messages = [];
  let smsChecks = 0;
  const delivery = {
    requireEnabled() {},
    async sendEmailCode(destination, code) { messages.push({ destination, code }); },
    async sendSmsCode(destination) { messages.push({ destination }); return 'VE123'; },
    async checkSmsCode(_sid, code) { smsChecks++; return code === '123456'; },
    async verifyGoogle(credential) { return credential; },
    ...overrides,
  };
  const service = createVerificationService(delivery, { now: () => clock });
  return { service, messages, advance: (ms) => { clock += ms; }, smsChecks: () => smsChecks };
}
const email = { channel: 'email', destination: 'farmer@example.com', role: 'farmer' };
const assertCode = (code) => (err) => { assert.equal(err.code, code); return true; };

test('email sends a random six-digit code but never returns it; proof is single-use', async () => {
  const { service, messages } = fixture();
  const sent = await service.request(email);
  assert.match(messages[0].code, /^\d{6}$/);
  assert.equal(sent.code, undefined);
  assert.equal(sent.token, undefined);
  assert.equal(sent.destination, 'f•••@example.com');
  assert.equal(sent.expiresInSeconds, 300);
  assert.equal(sent.retryAfterSeconds, 60);
  assert.ok(!JSON.stringify(sent).includes(messages[0].code));
  const payload = { challengeId: sent.challengeId, code: messages[0].code, role: 'farmer' };
  assert.deepEqual(await service.verify(payload), { channel: 'email', destination: email.destination });
  await assert.rejects(service.verify(payload), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('five failed attempts lock a challenge; malformed code still uses an attempt', async () => {
  const { service, messages } = fixture();
  const sent = await service.request(email);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(service.verify({ challengeId: sent.challengeId, code: 'bad', role: 'farmer' }), (err) => {
      assert.equal(err.code, 'AUTH_OTP_INVALID');
      assert.equal(err.details.attemptsRemaining, 4 - i);
      return true;
    });
  }
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: messages[0].code, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('OTP expiry is server-side, not based on the browser clock', async () => {
  const { service, messages, advance } = fixture();
  const sent = await service.request(email);
  advance(OTP_TTL_MS);
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: messages[0].code, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('resend cooldown is shared across roles and purposes, and invalidates the prior challenge', async () => {
  const { service, messages, advance } = fixture();
  const first = await service.request(email);
  await assert.rejects(service.request({ ...email, role: 'authority' }), assertCode('AUTH_RATE_LIMITED'));
  await assert.rejects(service.request({ ...email, purpose: 'link', userId: 'farmer-id' }), assertCode('AUTH_RATE_LIMITED'));
  advance(OTP_COOLDOWN_MS);
  const second = await service.request(email);
  assert.notEqual(first.challengeId, second.challengeId);
  await assert.rejects(service.verify({ challengeId: first.challengeId, code: messages[0].code, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  assert.equal((await service.verify({ challengeId: second.challengeId, code: messages[1].code, role: 'farmer' })).destination, email.destination);
});

test('hourly send limit prevents OTP bombing and resets after the window', async () => {
  const { service, advance, messages } = fixture();
  for (let i = 0; i < 5; i++) { await service.request(email); advance(OTP_COOLDOWN_MS); }
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  assert.equal(messages.length, 5);
  advance(3600000);
  await service.request(email);
  assert.equal(messages.length, 6);
});

test('resending cannot reset the hourly code-guess budget', async () => {
  const { service, advance, messages } = fixture();
  for (let i = 0; i < 3; i++) {
    const challenge = await service.request(email);
    for (let guess = 0; guess < 5; guess++) await assert.rejects(service.verify({ challengeId: challenge.challengeId, role: 'farmer', code: 'bad' }), assertCode('AUTH_OTP_INVALID'));
    advance(OTP_COOLDOWN_MS);
  }
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  assert.equal(messages.length, 3);
});

test('parallel sends reserve their throttle before contacting the provider', async () => {
  let delivered;
  const { service } = fixture({ sendEmailCode: () => new Promise((resolve) => { delivered = resolve; }) });
  const first = service.request(email);
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  delivered();
  await first;
});

test('provider failure does not create a usable challenge or silently simulate delivery', async () => {
  const { service } = fixture({ async sendEmailCode() { throw new Error('Provider unavailable'); } });
  await assert.rejects(service.request(email), /Provider unavailable/);
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
});

test('SMS verification calls provider; correct-looking digits alone do not sign in', async () => {
  const { service, smsChecks } = fixture();
  const sent = await service.request({ channel: 'sms', destination: '9876543210', role: 'authority' });
  assert.equal(sent.destination, '+91 ••••••3210');
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: '000000', role: 'authority' }), assertCode('AUTH_OTP_INVALID'));
  const identity = await service.verify({ challengeId: sent.challengeId, code: '123456', role: 'authority' });
  assert.equal(smsChecks(), 2);
  assert.equal(identity.destination, '9876543210');
});

test('parallel checks cannot consume the same SMS challenge twice', async () => {
  let checked;
  const { service } = fixture({ checkSmsCode: () => new Promise((resolve) => { checked = resolve; }) });
  const challenge = await service.request({ channel: 'sms', destination: '9876543210', role: 'farmer' });
  const params = { challengeId: challenge.challengeId, code: '123456', role: 'farmer' };
  const first = service.verify(params);
  await assert.rejects(service.verify(params), assertCode('AUTH_VERIFICATION_PENDING'));
  checked(true);
  await first;
  await assert.rejects(service.verify(params), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('OTP proofs are bound to role, linking purpose, and authenticated user', async () => {
  const { service, messages } = fixture();
  const challenge = await service.request({ ...email, purpose: 'link', userId: 'owner' });
  const payload = { challengeId: challenge.challengeId, code: messages[0].code, role: 'farmer' };
  await assert.rejects(service.verify(payload), assertCode('AUTH_CHALLENGE_EXPIRED'));
  await assert.rejects(service.verify({ ...payload, purpose: 'link', userId: 'attacker' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  await assert.rejects(service.verify({ ...payload, purpose: 'link', userId: 'owner', role: 'authority' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  assert.equal((await service.verify({ ...payload, purpose: 'link', userId: 'owner' })).destination, email.destination);
});

test('Google requires a one-use nonce bound to the chosen role', async () => {
  const { service } = fixture();
  const challenge = service.googleChallenge('farmer');
  const credential = { nonce: challenge.nonce, sub: 'google-user', email: 'Farmer@Example.com', name: 'Farmer' };
  const proof = await service.verifyGoogle({ ...challenge, credential, role: 'farmer' });
  assert.equal(proof.destination, 'farmer@example.com');
  assert.equal(proof.googleSub, 'google-user');
  await assert.rejects(service.verifyGoogle({ ...challenge, credential, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  const second = service.googleChallenge('farmer');
  await assert.rejects(service.verifyGoogle({ ...second, credential, role: 'farmer' }), assertCode('AUTH_GOOGLE_INVALID'));
  const third = service.googleChallenge('farmer');
  await assert.rejects(service.verifyGoogle({ ...third, credential: { ...credential, nonce: third.nonce }, role: 'authority' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('Google challenges and profile tickets expire; profile tickets are consumed once', async () => {
  const { service, advance } = fixture();
  const google = service.googleChallenge('farmer');
  advance(OTP_TTL_MS);
  await assert.rejects(service.verifyGoogle({ ...google, credential: {}, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  const profile = service.registration({ channel: 'email', destination: 'farmer@example.com' });
  assert.equal(profile.token, undefined);
  assert.equal(service.getRegistration(profile.registrationToken).destination, 'farmer@example.com');
  service.consumeRegistration(profile.registrationToken);
  assert.throws(() => service.getRegistration(profile.registrationToken), assertCode('AUTH_REGISTRATION_EXPIRED'));
  const expired = service.registration({ channel: 'sms', destination: '9876543210' });
  advance(600000);
  assert.throws(() => service.getRegistration(expired.registrationToken), assertCode('AUTH_REGISTRATION_EXPIRED'));
});

test('a code spanning the hourly rate-window boundary still verifies', async () => {
  const { service, messages, advance } = fixture();
  await service.request(email);
  advance(59 * 60 * 1000);
  const second = await service.request(email);
  advance(61 * 1000);
  assert.equal((await service.verify({ challengeId: second.challengeId, code: messages[1].code, role: 'farmer' })).destination, email.destination);
});
