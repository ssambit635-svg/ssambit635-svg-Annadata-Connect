import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../middleware/error.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const opaqueId = () => randomBytes(32).toString('base64url');

// Single-process, short-lived verification state. For multiple replicas use an
// atomic shared store (e.g. Redis); a restart deliberately invalidates all codes.
export function createVerificationService(delivery, { now = Date.now } = {}) {
  const secret = randomBytes(32);
  const challenges = new Map();
  const destinations = new Map();
  const googleChallenges = new Map();
  const registrations = new Map();
  const digest = (value) => createHmac('sha256', secret).update(value).digest();

  function prune() {
    for (const map of [challenges, destinations, googleChallenges, registrations]) {
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
      // Reserve BEFORE awaiting provider delivery, so parallel requests cannot spam.
      bucket.count += 1;
      bucket.lastSentAt = now();
      const id = opaqueId();
      const entry = { channel, destination, role, purpose, userId, key, attempts: 0, checking: false, expiresAt: now() + OTP_TTL_MS };
      if (channel === 'sms') {
        entry.verificationSid = await delivery.sendSmsCode(destination);
      } else {
        const code = String(randomInt(0, 1000000)).padStart(6, '0');
        entry.codeHash = digest(`${id}:${code}`);
        await delivery.sendEmailCode(destination, code);
      }
      // A resend replaces the old challenge, but does not reset its hourly budget.
      for (const [oldId, old] of challenges) if (old.key === key) challenges.delete(oldId);
      challenges.set(id, entry);
      return {
        challengeId: id,
        channel,
        destination: channel === 'sms' ? `+91 ••••••${destination.slice(-4)}` : destination.replace(/^(.)(.*)(@.*)$/, '$1•••$3'),
        expiresInSeconds: Math.max(0, Math.floor((entry.expiresAt - now()) / 1000)),
        retryAfterSeconds: Math.max(0, Math.ceil((bucket.lastSentAt + OTP_COOLDOWN_MS - now()) / 1000)),
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
      let valid = false;
      try {
        if (typeof code === 'string' && /^\d{6}$/.test(code)) {
          valid = entry.channel === 'sms'
            ? await delivery.checkSmsCode(entry.verificationSid, code)
            : timingSafeEqual(entry.codeHash, digest(`${challengeId}:${code}`));
        }
        if (entry.expiresAt <= now() || challenges.get(challengeId) !== entry) throw expired();
        if (!valid) throw new ApiError(401, 'AUTH_OTP_INVALID', 'Incorrect code. Check the six digits and try again.', { attemptsRemaining: Math.max(0, 5 - entry.attempts) });
        challenges.delete(challengeId); // Consume before returning identity or issuing a session.
        return { channel: entry.channel, destination: entry.destination };
      } finally {
        entry.checking = false;
        if (entry.attempts >= 5) challenges.delete(challengeId);
      }
    },
    googleChallenge(role) {
      prune();
      delivery.requireEnabled('google');
      const challengeId = opaqueId();
      const nonce = opaqueId();
      googleChallenges.set(challengeId, { nonce, role, expiresAt: now() + OTP_TTL_MS });
      return { challengeId, nonce, expiresInSeconds: OTP_TTL_MS / 1000 };
    },
    async verifyGoogle({ challengeId, credential, role }) {
      prune();
      delivery.requireEnabled('google');
      const entry = googleChallenges.get(challengeId);
      googleChallenges.delete(challengeId); // One attempt per nonce; never replayable.
      if (!entry || entry.role !== role) throw expired();
      const payload = await delivery.verifyGoogle(credential);
      if (payload.nonce !== entry.nonce || entry.expiresAt <= now()) throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'This Google sign-in has expired. Please choose your account again.');
      return {
        channel: 'google', destination: payload.email.toLowerCase(), googleSub: payload.sub, name: payload.name || '',
        // For third-party consumer addresses, Google's email_verified can be stale.
        // Gmail and Workspace are authoritative; otherwise use current email OTP.
        googleEmailAuthoritative: /@(gmail|googlemail)\.com$/i.test(payload.email) || Boolean(payload.hd),
      };
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
