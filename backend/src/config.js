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
  // Google Sign-In (officers / district authorities). When GOOGLE_CLIENT_ID is
  // set, Google ID-token credentials are verified against it; when it is empty
  // the API runs in demo mode and accepts any Google-style email address so
  // the flow works out of the box without registering OAuth credentials.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  seedOnBoot: (process.env.SEED_ON_BOOT || 'true') !== 'false',
  dataFile: path.resolve(__dirname, '../data/db.json'),
  // SMS delivery
  smsProvider: (process.env.SMS_PROVIDER || 'sim').toLowerCase(),
  smsMsg91AuthKey: process.env.SMS_MSG91_AUTH_KEY || '',
  smsMsg91SenderId: process.env.SMS_MSG91_SENDER_ID || 'ADCONE',
  smsTwilioSid: process.env.SMS_TWILIO_SID || '',
  smsTwilioToken: process.env.SMS_TWILIO_AUTH_TOKEN || '',
  smsTwilioFrom: process.env.SMS_TWILIO_FROM || '',
};

export default config;
