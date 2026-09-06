import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../middleware/error.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const opaqueId = () => randomBytes(32).toString('base64url');

// Mock OTP flow: codes are generated here, "delivered" by the mock outbox and
// returned to the client as `mockCode` so the UI can show them. Expiry, attempt
// limits, resend cooldowns and hourly budgets behave exactly like the real thing.
// Single-process, short-lived state; a restart invalidates all pending codes.
export function createVerificationService(delivery, { now = Date.now } = {}) {
  const secret = randomBytes(32);
  const challenges = new Map();
  const destinations = new Map();
  const registrations = new Map();
  const digest = (value) => createHmac('sha256', secret).update(value).digest();

  function prune() {
    for (const map of [challenges, destinations, registrations]) {
      for (const [key, value] of map) if (value.expiresAt <= now()) map.delete(key);
    }
  }
  function expired() {
    return new ApiError(401, 'AUTH_CHALLENGE_EXPIRED', 'This verification has expired or was already used. Please request a new code.');
  }
  function rateLimited(wait) {
    return new ApiError(429, 'AUTH_RATE_LIMITED', 'Too many verification requests. Please wait before trying again.', { retryAfterSeconds: Math.max(1, Math.ceil(wait / 1000)) });
  }

  return {
    async request({ channel, destination, role, purpose = 'signin', userId = null }) {
      prune();
      delivery.requireEnabled(channel);
      const key = digest(`${channel}:${destination}`).toString('hex');
      let bucket = destinations.get(key);
      if (!bucket) {
        bucket = { count: 0, checks: 0, lastSentAt: -Infinity, expiresAt: now() + HOUR_MS };
        destinations.set(key, bucket);
      }
      if (bucket.count >= 5 || bucket.checks >= 15) throw rateLimited(bucket.expiresAt - now());
      if (now() - bucket.lastSentAt < OTP_COOLDOWN_MS) throw rateLimited(OTP_COOLDOWN_MS - (now() - bucket.lastSentAt));
      // Reserve BEFORE "sending", so parallel requests cannot spam the outbox.
      bucket.count += 1;
      bucket.lastSentAt = now();
      const id = opaqueId();
      const code = String(randomInt(0, 1000000)).padStart(6, '0');
      const entry = {
        channel, destination, role, purpose, userId, key, attempts: 0, checking: false,
        codeHash: digest(`${id}:${code}`), expiresAt: now() + OTP_TTL_MS,
      };
      await delivery.sendCode({ channel, destination, code });
      // A resend replaces the old challenge, but does not reset its hourly budget.
      for (const [oldId, old] of challenges) if (old.key === key) challenges.delete(oldId);
      challenges.set(id, entry);
      return {
        challengeId: id,
        channel,
        destination: channel === 'sms' ? `+91 ••••••${destination.slice(-4)}` : destination.replace(/^(.)(.*)(@.*)$/, '$1•••$3'),
        expiresInSeconds: Math.max(0, Math.floor((entry.expiresAt - now()) / 1000)),
        retryAfterSeconds: Math.max(0, Math.ceil((bucket.lastSentAt + OTP_COOLDOWN_MS - now()) / 1000)),
        // Mock mode: the "sent" code is shown on screen instead of a real SMS/email.
        mockCode: code,
      };
    },
    async verify({ challengeId, code, role, purpose = 'signin', userId = null }) {
      prune();
      const entry = challenges.get(challengeId);
      if (!entry || entry.role !== role || entry.purpose !== purpose || entry.userId !== userId) throw expired();
      if (entry.checking) throw new ApiError(409, 'AUTH_VERIFICATION_PENDING', 'Verification is already in progress.');
      let bucket = destinations.get(entry.key);
      if (!bucket) {
        bucket = { count: 0, checks: 0, lastSentAt: -Infinity, expiresAt: now() + HOUR_MS };
        destinations.set(entry.key, bucket);
      }
      if (bucket.checks >= 15) throw rateLimited(bucket.expiresAt - now());
      bucket.checks += 1;
      entry.attempts += 1;
      entry.checking = true;
      try {
        const valid = typeof code === 'string' && /^\d{6}$/.test(code) && timingSafeEqual(entry.codeHash, digest(`${challengeId}:${code}`));
        if (entry.expiresAt <= now() || challenges.get(challengeId) !== entry) throw expired();
        if (!valid) throw new ApiError(401, 'AUTH_OTP_INVALID', 'Incorrect code. Check the six digits and try again.', { attemptsRemaining: Math.max(0, 5 - entry.attempts) });
        challenges.delete(challengeId); // Consume before returning identity or issuing a session.
        return { channel: entry.channel, destination: entry.destination };
      } finally {
        entry.checking = false;
        if (entry.attempts >= 5) challenges.delete(challengeId);
      }
    },
    registration(identity) {
      prune();
      const registrationToken = opaqueId();
      registrations.set(registrationToken, { ...identity, expiresAt: now() + 10 * 60 * 1000 });
      return { registrationRequired: true, registrationToken, profile: { name: identity.name || '', [identity.channel === 'sms' ? 'phone' : 'email']: identity.destination }, expiresInSeconds: 600 };
    },
    getRegistration(token) {
      prune();
      const identity = registrations.get(token);
      if (!identity) throw new ApiError(401, 'AUTH_REGISTRATION_EXPIRED', 'Please verify your phone or email again before creating an account.');
      return identity;
    },
    consumeRegistration(token) {
      registrations.delete(token);
    },
  };
}
