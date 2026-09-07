import { ApiError } from '../middleware/error.js';
import { FARMERS, VILLAGES } from '../data/seed-data.js';

// Mock-only authentication. There is no Google, Twilio or SMTP integration left
// in this codebase: codes are generated locally and handed straight back to the
// UI, and "Sign in with Google" picks one of the sample accounts below.
// Every entry mirrors a seeded user (see src/data/seed-data.js) so a pick lands
// on real mock data instead of creating a throwaway profile.
// Farmer picker entries are derived from the seeded farmer roster so the two
// can never drift apart. The first two keep their historical `sub` values
// (the e2e suite and older data files reference them).
const LEGACY_SUBS = { 'farmer-demo': 'mock-google-farmer-bijay', 'farmer-demo-2': 'mock-google-farmer-kuni' };
const villageName = (id) => VILLAGES.find((v) => v.id === id)?.nameEn || 'Khordha';
const farmerAccounts = FARMERS.map((f) => ({
  sub: LEGACY_SUBS[f.id] || `mock-google-${f.id}`,
  role: 'farmer',
  name: f.name,
  email: f.email,
  detail: `${f.farmerId} · ${villageName(f.villageId)}`,
}));

export const MOCK_GOOGLE_ACCOUNTS = [
  ...farmerAccounts,
  {
    sub: 'mock-google-officer-rashmi', role: 'officer', name: 'Rashmi Das',
    email: 'rashmi.das.anc@gmail.com', detail: 'Bhubaneswar Central centre',
  },
  {
    sub: 'mock-google-officer-manoj', role: 'officer', name: 'Manoj Behera',
    email: 'manoj.behera.anc@gmail.com', detail: 'Jatni centre',
  },
  {
    sub: 'mock-google-officer-sasmita', role: 'officer', name: 'Sasmita Mohapatra',
    email: 'sasmita.mohapatra.anc@gmail.com', detail: 'Khordha centre',
  },
  {
    sub: 'mock-google-officer-pratap', role: 'officer', name: 'Pratap Keshari Das',
    email: 'pratap.das.anc@gmail.com', detail: 'Choudwar centre · Cuttack',
  },
  {
    sub: 'mock-google-officer-lopamudra', role: 'officer', name: 'Lopamudra Mohanty',
    email: 'lopamudra.mohanty.anc@gmail.com', detail: 'Brahmagiri centre · Puri',
  },
  {
    sub: 'mock-google-officer-bijay', role: 'officer', name: 'Bijay Kumar Padhi',
    email: 'bijay.padhi.anc@gmail.com', detail: 'Chhatrapur centre · Ganjam',
  },
  {
    sub: 'mock-google-authority-suresh', role: 'authority', name: 'Suresh Patnaik',
    email: 'district.admin.anc@gmail.com', detail: 'District Administration · Khordha',
  },
  {
    sub: 'mock-google-authority-anita', role: 'authority', name: 'Anita Meher',
    email: 'state.admin.anc@gmail.com', detail: 'State Monitor · Odisha',
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
