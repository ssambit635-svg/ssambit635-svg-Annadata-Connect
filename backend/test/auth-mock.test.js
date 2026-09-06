import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockDelivery, MOCK_GOOGLE_ACCOUNTS } from '../src/services/auth-mock.service.js';
import { USERS } from '../src/data/seed-data.js';

const rejectCode = (code) => (err) => { assert.equal(err.code, code); return true; };

test('every sign-in channel is available with no provider configuration', () => {
  const delivery = createMockDelivery();
  assert.equal(delivery.mock, true);
  assert.deepEqual(delivery.enabled, { google: true, sms: true, email: true });
  assert.equal(delivery.requireEnabled('sms'), undefined);
  assert.equal(delivery.requireEnabled('email'), undefined);
  assert.equal(delivery.requireEnabled('google'), undefined);
});

test('mock delivery records codes in an in-memory outbox and never calls a provider', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('mock auth must not reach the network'); };
  try {
    const delivery = createMockDelivery();
    await delivery.sendCode({ channel: 'sms', destination: '9876543210', code: '001234' });
    await delivery.sendCode({ channel: 'email', destination: 'farmer@example.com', code: '654321' });
    assert.deepEqual(delivery.outbox.map((m) => [m.channel, m.destination, m.code]), [
      ['sms', '9876543210', '001234'], ['email', 'farmer@example.com', '654321'],
    ]);
    assert.ok(delivery.outbox.every((m) => typeof m.sentAt === 'string'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('the mock outbox stays bounded', async () => {
  const delivery = createMockDelivery();
  for (let i = 0; i < 60; i += 1) await delivery.sendCode({ channel: 'sms', destination: '9876543210', code: String(i).padStart(6, '0') });
  assert.equal(delivery.outbox.length, 50);
  assert.equal(delivery.outbox.at(-1).code, '000059');
});

test('mock Google accounts are grouped by role', () => {
  const delivery = createMockDelivery();
  assert.deepEqual(delivery.googleAccounts('farmer').map((a) => a.email).length, 2);
  assert.deepEqual(delivery.googleAccounts('officer').map((a) => a.role), ['officer', 'officer']);
  assert.deepEqual(delivery.googleAccounts('authority').map((a) => a.role), ['authority']);
  assert.equal(delivery.googleAccounts().length, MOCK_GOOGLE_ACCOUNTS.length);
  assert.ok(delivery.googleAccounts('farmer').every((a) => a.sub && a.name && a.email));
});

test('every mock Google account maps onto a seeded sample user of the same role', () => {
  for (const account of MOCK_GOOGLE_ACCOUNTS) {
    const user = USERS.find((entry) => (entry.email || '').toLowerCase() === account.email);
    assert.ok(user, `no seeded user for ${account.email}`);
    assert.equal(user.role, account.role);
  }
  assert.equal(new Set(MOCK_GOOGLE_ACCOUNTS.map((a) => a.email)).size, MOCK_GOOGLE_ACCOUNTS.length);
  assert.equal(new Set(MOCK_GOOGLE_ACCOUNTS.map((a) => a.sub)).size, MOCK_GOOGLE_ACCOUNTS.length);
});

test('verifyGoogle accepts a picker email and rejects anything else', () => {
  const delivery = createMockDelivery();
  const identity = delivery.verifyGoogle({ email: ' District.Admin.anc@gmail.com ' });
  assert.deepEqual(identity, {
    channel: 'google', destination: 'district.admin.anc@gmail.com',
    googleSub: 'mock-google-authority-suresh', name: 'Suresh Patnaik', role: 'authority',
  });
  for (const email of ['authority@example.com', 'not-an-account@gmail.com', '', undefined, null, 42]) {
    assert.throws(() => delivery.verifyGoogle({ email }), rejectCode('AUTH_GOOGLE_INVALID'));
  }
  assert.throws(() => delivery.verifyGoogle(), rejectCode('AUTH_GOOGLE_INVALID'));
});
