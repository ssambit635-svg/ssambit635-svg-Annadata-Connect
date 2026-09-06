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
  // Authentication is mocked end to end: no Google OAuth, Twilio Verify or SMTP
  // credentials exist any more. OTP codes are generated in-process and returned
  // to the UI, and "Sign in with Google" picks a sample account from the picker.
  authMock: true,
  // Sample accounts are the primary mock data, so they stay usable unless switched off.
  allowDemoLogin: process.env.ALLOW_DEMO_LOGIN !== 'false',
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY || '') ? Number(process.env.TRUST_PROXY) : false,
  seedOnBoot: (process.env.SEED_ON_BOOT || 'true') !== 'false',
  dataFile: process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.resolve(__dirname, '../data/db.json'),
  // Procurement notification SMS (never used for sign-in)
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
