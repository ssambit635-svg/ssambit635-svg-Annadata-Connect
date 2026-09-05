import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import config from '../config.js';
import { ApiError } from '../middleware/error.js';

// Login codes NEVER use sms.service.js: its simulated outbox is visible to staff.
// Twilio Verify owns SMS code generation/storage. Email codes are sent over TLS.
export function createAuthDelivery(settings = config, { fetcher = fetch, mailer = nodemailer, googleClient = new OAuth2Client({ transporterOptions: { timeout: 8000, retry: false } }) } = {}) {
  let transport;
  const enabled = {
    google: Boolean(settings.googleClientId),
    sms: settings.authSmsProvider === 'twilio-verify' && Boolean(settings.smsTwilioSid && settings.smsTwilioToken && settings.twilioVerifyServiceSid),
    email: settings.authEmailProvider === 'smtp' && Boolean(settings.smtpHost && settings.smtpUser && settings.smtpPassword && settings.smtpFrom),
  };

  function requireEnabled(channel) {
    if (!enabled[channel]) {
      throw new ApiError(503, 'AUTH_PROVIDER_UNAVAILABLE', `${channel === 'sms' ? 'SMS' : channel === 'email' ? 'Email' : 'Google'} sign-in is not configured yet. Please use another sign-in method or contact the administrator.`);
    }
  }

  async function twilio(resource, body) {
    requireEnabled('sms');
    let res;
    try {
      res = await fetcher(`https://verify.twilio.com/v2/Services/${encodeURIComponent(settings.twilioVerifyServiceSid)}/${resource}`, {
        method: 'POST',
        signal: AbortSignal.timeout(12000),
        headers: {
          Authorization: `Basic ${Buffer.from(`${settings.smsTwilioSid}:${settings.smsTwilioToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(body),
      });
    } catch {
      throw new ApiError(502, 'AUTH_DELIVERY_FAILED', 'The SMS service could not be reached. Please try again later.');
    }
    // Never expose/log the provider response: it can contain personal data.
    if (res.status === 429) throw new ApiError(429, 'AUTH_RATE_LIMITED', 'Too many SMS requests. Please wait before trying again.', { retryAfterSeconds: 60 });
    if (resource === 'VerificationCheck' && (res.status === 404 || res.status === 400)) return { status: 'invalid' };
    if (!res.ok) throw new ApiError(502, 'AUTH_DELIVERY_FAILED', 'The SMS provider could not process this request. Please try again later.');
    try {
      return await res.json();
    } catch {
      throw new ApiError(502, 'AUTH_DELIVERY_FAILED', 'The SMS provider returned an invalid response. Please try again later.');
    }
  }

  return {
    enabled,
    requireEnabled,
    async sendSmsCode(phone) {
      const result = await twilio('Verifications', { To: `+91${phone}`, Channel: 'sms' });
      if (result.status !== 'pending' || !/^VE[a-f\d]{32}$/i.test(result.sid || '')) {
        throw new ApiError(502, 'AUTH_DELIVERY_FAILED', 'The SMS provider did not accept the verification request. No sign-in code was confirmed.');
      }
      return result.sid;
    },
    async checkSmsCode(verificationSid, code) {
      const result = await twilio('VerificationCheck', { VerificationSid: verificationSid, Code: code });
      return result.status === 'approved' && result.sid === verificationSid;
    },
    async sendEmailCode(email, code) {
      requireEnabled('email');
      transport ||= mailer.createTransport({
        host: settings.smtpHost,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        requireTLS: !settings.smtpSecure,
        auth: { user: settings.smtpUser, pass: settings.smtpPassword },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        logger: false,
        debug: false,
      });
      try {
        const result = await transport.sendMail({
          from: settings.smtpFrom,
          to: email,
          subject: 'Your Annadata Connect verification code',
          text: `Your Annadata Connect code is ${code}. It expires in 5 minutes. Do not share it with anyone, including Annadata Connect staff. If you did not request this code, ignore this email.`,
          // No user-supplied HTML, tracking pixels, attachments, or arbitrary links.
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        if (!result.accepted?.length || result.rejected?.length) throw new Error('Recipient not accepted');
      } catch {
        throw new ApiError(502, 'AUTH_DELIVERY_FAILED', 'The email provider could not accept the message. Please try again later or use another method.');
      }
    },
    async verifyGoogle(credential) {
      requireEnabled('google');
      if (typeof credential !== 'string' || credential.length > 12000 || !credential) {
        throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'A valid Google sign-in credential is required.');
      }
      try {
        // Verifies signature against cached Google keys, audience, issuer and expiry.
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: settings.googleClientId });
        const payload = ticket.getPayload();
        if (typeof payload?.sub !== 'string' || !payload.sub || payload.email_verified !== true || typeof payload.email !== 'string' || !payload.email ||
            payload.aud !== settings.googleClientId || !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) ||
            !Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) throw new Error('Invalid claims');
        return payload;
      } catch {
        throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'Google sign-in could not be verified. Please choose your Google account again.');
      }
    },
  };
}
