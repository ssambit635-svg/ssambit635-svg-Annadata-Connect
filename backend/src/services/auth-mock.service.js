import { ApiError } from '../middleware/error.js';

// Mock-only authentication. There is no Google, Twilio or SMTP integration left
// in this codebase: codes are generated locally and handed straight back to the
// UI, and "Sign in with Google" picks one of the sample accounts below.
// Every entry mirrors a seeded user (see src/data/seed-data.js) so a pick lands
// on real mock data instead of creating a throwaway profile.
export const MOCK_GOOGLE_ACCOUNTS = [
  {
    sub: 'mock-google-farmer-bijay', role: 'farmer', name: 'Bijay Pradhan',
    email: 'bijay.pradhan.anc@gmail.com', detail: 'ANC-F-0001 · Baranga',
  },
  {
    sub: 'mock-google-farmer-kuni', role: 'farmer', name: 'Kuni Sahoo',
    email: 'kuni.sahoo.anc@gmail.com', detail: 'ANC-F-0002 · Harirajpur',
  },
  {
    sub: 'mock-google-officer-rashmi', role: 'officer', name: 'Rashmi Das',
    email: 'rashmi.das.anc@gmail.com', detail: 'Bhubaneswar Central centre',
  },
  {
    sub: 'mock-google-officer-manoj', role: 'officer', name: 'Manoj Behera',
    email: 'manoj.behera.anc@gmail.com', detail: 'Jatni centre',
  },
  {
    sub: 'mock-google-authority-suresh', role: 'authority', name: 'Suresh Patnaik',
    email: 'district.admin.anc@gmail.com', detail: 'District Administration · Khordha',
  },
];

const OUTBOX_LIMIT = 50;

// Same shape the old provider delivery exposed, so routes/verification are unchanged.
export function createMockDelivery() {
  const outbox = [];
  return {
    mock: true,
    enabled: { google: true, sms: true, email: true },
    // Every channel is always available: nothing external has to be configured.
    requireEnabled() {},
    // "Delivers" a code by recording it in an in-memory mock outbox.
    async sendCode({ channel, destination, code }) {
      const message = { channel, destination, code, sentAt: new Date().toISOString() };
      outbox.push(message);
      if (outbox.length > OUTBOX_LIMIT) outbox.shift();
      return message;
    },
    googleAccounts(role) {
      return MOCK_GOOGLE_ACCOUNTS.filter((account) => !role || account.role === role);
    },
    // No signature, audience, issuer or nonce checks: a mock pick is trusted as-is.
    verifyGoogle({ email } = {}) {
      const wanted = String(email || '').trim().toLowerCase();
      const account = MOCK_GOOGLE_ACCOUNTS.find((entry) => entry.email === wanted);
      if (!account) {
        throw new ApiError(401, 'AUTH_GOOGLE_INVALID', 'Choose one of the mock Google accounts shown in the picker.');
      }
      return { channel: 'google', destination: account.email, googleSub: account.sub, name: account.name, role: account.role };
    },
    outbox,
  };
}
