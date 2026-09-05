import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  jwtSecret: process.env.JWT_SECRET || 'annadata-connect-dev-secret-do-not-use-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || '',
  // Public OAuth client ID only; Google/SMS/email never fall back to demo auth.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  allowDemoLogin: process.env.ALLOW_DEMO_LOGIN === 'true' || (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_LOGIN !== 'false'),
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : false,
  authSmsProvider: process.env.AUTH_SMS_PROVIDER || 'none',
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || '',
  authEmailProvider: process.env.AUTH_EMAIL_PROVIDER || 'none',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || '',
  seedOnBoot: (process.env.SEED_ON_BOOT || 'true') !== 'false',
  dataFile: process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.resolve(__dirname, '../data/db.json'),
  // SMS delivery
  smsProvider: (process.env.SMS_PROVIDER || 'sim').toLowerCase(),
  smsMsg91AuthKey: process.env.SMS_MSG91_AUTH_KEY || '',
  smsMsg91SenderId: process.env.SMS_MSG91_SENDER_ID || 'ADCONE',
  smsTwilioSid: process.env.SMS_TWILIO_SID || '',
  smsTwilioToken: process.env.SMS_TWILIO_AUTH_TOKEN || '',
  smsTwilioFrom: process.env.SMS_TWILIO_FROM || '',
};

if (config.env === 'production' && (config.jwtSecret.length < 32 || config.jwtSecret.includes('change-me') || config.jwtSecret.includes('dev-secret'))) {
  throw new Error('Set a unique JWT_SECRET of at least 32 characters before starting in production.');
}

export default config;
