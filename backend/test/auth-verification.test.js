import test from 'node:test';
import assert from 'node:assert/strict';
import { createVerificationService, OTP_TTL_MS, OTP_COOLDOWN_MS } from '../src/services/auth-verification.service.js';
import { createMockDelivery } from '../src/services/auth-mock.service.js';

function fixture(overrides = {}) {
  let clock = Date.now();
  const messages = [];
  const delivery = {
    ...createMockDelivery(),
    async sendCode(message) { messages.push(message); return message; },
    ...overrides,
  };
  const service = createVerificationService(delivery, { now: () => clock });
  return { service, messages, advance: (ms) => { clock += ms; } };
}
const email = { channel: 'email', destination: 'farmer@example.com', role: 'farmer' };
const sms = { channel: 'sms', destination: '9876543210', role: 'farmer' };
const assertCode = (code) => (err) => { assert.equal(err.code, code); return true; };

test('a random six-digit code is generated, "delivered" to the outbox and returned as mockCode', async () => {
  const { service, messages } = fixture();
  const sent = await service.request(email);
  assert.match(sent.mockCode, /^\d{6}$/);
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], { channel: 'email', destination: 'farmer@example.com', code: sent.mockCode });
  assert.equal(sent.token, undefined);
  assert.equal(sent.destination, 'f•••@example.com');
  assert.equal(sent.expiresInSeconds, 300);
  assert.equal(sent.retryAfterSeconds, 60);
  const payload = { challengeId: sent.challengeId, code: sent.mockCode, role: 'farmer' };
  assert.deepEqual(await service.verify(payload), { channel: 'email', destination: email.destination });
  await assert.rejects(service.verify(payload), assertCode('AUTH_CHALLENGE_EXPIRED')); // proof is single-use
});

test('SMS uses the same locally generated mock code, with no provider round-trip', async () => {
  const { service, messages } = fixture();
  const sent = await service.request(sms);
  assert.equal(sent.destination, '+91 ••••••3210');
  assert.equal(messages[0].channel, 'sms');
  assert.equal(messages[0].code, sent.mockCode);
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: '000000', role: 'farmer' }), assertCode('AUTH_OTP_INVALID'));
  assert.equal((await service.verify({ challengeId: sent.challengeId, code: sent.mockCode, role: 'farmer' })).destination, '9876543210');
});

test('five failed attempts lock a challenge; malformed codes still use an attempt', async () => {
  const { service } = fixture();
  const sent = await service.request(email);
  for (let i = 0; i < 5; i += 1) {
    await assert.rejects(service.verify({ challengeId: sent.challengeId, code: 'bad', role: 'farmer' }), (err) => {
      assert.equal(err.code, 'AUTH_OTP_INVALID');
      assert.equal(err.details.attemptsRemaining, 4 - i);
      return true;
    });
  }
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: sent.mockCode, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('OTP expiry is server-side, not based on the browser clock', async () => {
  const { service, advance } = fixture();
  const sent = await service.request(email);
  advance(OTP_TTL_MS);
  await assert.rejects(service.verify({ challengeId: sent.challengeId, code: sent.mockCode, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
});

test('resend cooldown is shared across roles and purposes, and invalidates the prior challenge', async () => {
  const { service, advance } = fixture();
  const first = await service.request(email);
  await assert.rejects(service.request({ ...email, role: 'authority' }), assertCode('AUTH_RATE_LIMITED'));
  await assert.rejects(service.request({ ...email, purpose: 'link', userId: 'farmer-id' }), assertCode('AUTH_RATE_LIMITED'));
  advance(OTP_COOLDOWN_MS);
  const second = await service.request(email);
  assert.notEqual(first.challengeId, second.challengeId);
  assert.notEqual(first.mockCode, second.mockCode);
  await assert.rejects(service.verify({ challengeId: first.challengeId, code: first.mockCode, role: 'farmer' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  assert.equal((await service.verify({ challengeId: second.challengeId, code: second.mockCode, role: 'farmer' })).destination, email.destination);
});

test('hourly send limit prevents OTP bombing and resets after the window', async () => {
  const { service, advance, messages } = fixture();
  for (let i = 0; i < 5; i += 1) { await service.request(email); advance(OTP_COOLDOWN_MS); }
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  assert.equal(messages.length, 5);
  advance(3600000);
  await service.request(email);
  assert.equal(messages.length, 6);
});

test('resending cannot reset the hourly code-guess budget', async () => {
  const { service, advance, messages } = fixture();
  for (let i = 0; i < 3; i += 1) {
    const challenge = await service.request(email);
    for (let guess = 0; guess < 5; guess += 1) await assert.rejects(service.verify({ challengeId: challenge.challengeId, role: 'farmer', code: 'bad' }), assertCode('AUTH_OTP_INVALID'));
    advance(OTP_COOLDOWN_MS);
  }
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  assert.equal(messages.length, 3);
});

test('parallel sends reserve their throttle before the mock delivery', async () => {
  let delivered;
  const { service } = fixture({ sendCode: () => new Promise((resolve) => { delivered = resolve; }) });
  const first = service.request(email);
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
  delivered();
  await first;
});

test('a delivery failure does not create a usable challenge', async () => {
  const { service } = fixture({ async sendCode() { throw new Error('Outbox unavailable'); } });
  await assert.rejects(service.request(email), /Outbox unavailable/);
  await assert.rejects(service.request(email), assertCode('AUTH_RATE_LIMITED'));
});

test('OTP proofs are bound to role, linking purpose, and authenticated user', async () => {
  const { service } = fixture();
  const challenge = await service.request({ ...email, purpose: 'link', userId: 'owner' });
  const payload = { challengeId: challenge.challengeId, code: challenge.mockCode, role: 'farmer' };
  await assert.rejects(service.verify(payload), assertCode('AUTH_CHALLENGE_EXPIRED'));
  await assert.rejects(service.verify({ ...payload, purpose: 'link', userId: 'attacker' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  await assert.rejects(service.verify({ ...payload, purpose: 'link', userId: 'owner', role: 'authority' }), assertCode('AUTH_CHALLENGE_EXPIRED'));
  assert.equal((await service.verify({ ...payload, purpose: 'link', userId: 'owner' })).destination, email.destination);
});

test('profile tickets expire, carry the identity, and are consumed once', async () => {
  const { service, advance } = fixture();
  const profile = service.registration({ channel: 'email', destination: 'farmer@example.com', name: 'Farmer' });
  assert.equal(profile.registrationRequired, true);
  assert.equal(profile.token, undefined);
  assert.deepEqual(profile.profile, { name: 'Farmer', email: 'farmer@example.com' });
  assert.equal(service.getRegistration(profile.registrationToken).destination, 'farmer@example.com');
  service.consumeRegistration(profile.registrationToken);
  assert.throws(() => service.getRegistration(profile.registrationToken), assertCode('AUTH_REGISTRATION_EXPIRED'));
  const expired = service.registration({ channel: 'sms', destination: '9876543210' });
  advance(600000);
  assert.throws(() => service.getRegistration(expired.registrationToken), assertCode('AUTH_REGISTRATION_EXPIRED'));
});

test('a code spanning the hourly rate-window boundary still verifies', async () => {
  const { service, advance } = fixture();
  await service.request(email);
  advance(59 * 60 * 1000);
  const second = await service.request(email);
  advance(61 * 1000);
  assert.equal((await service.verify({ challengeId: second.challengeId, code: second.mockCode, role: 'farmer' })).destination, email.destination);
});
