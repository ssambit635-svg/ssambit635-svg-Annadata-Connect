# Mock sign-in (no real providers)

Authentication in this project is **fully mocked**. There is no Google OAuth, no Twilio
Verify, and no SMTP anywhere in the codebase — `google-auth-library` and `nodemailer` are
not even dependencies any more. Nothing needs to be configured, no credentials exist, and
no code, message, or account leaves the machine.

Everything runs on the seeded sample data:

| Method | What actually happens |
| --- | --- |
| **Fake Google** | A Google-styled button opens a local picker of sample accounts. Picking one posts `{role, email}` to `/api/auth/google`, which matches it against the mock account list and issues a session. |
| **SMS OTP** | The API generates a six-digit code, records it in an in-memory mock outbox, and returns it as `mockCode`. The login screen prints it in a "Mock SMS · your code" card. |
| **Email OTP** | Identical to SMS, shown as a "Mock email · your code" card. |
| **Password** | Real bcrypt comparison against the sample accounts' passwords. |

Role-bound JWT sessions, expiry, attempt limits, and rate limits are all still real — only
the identity *delivery* is mocked.

## 1. The fake Google switch

The login page has a **"Fake Google sign-in"** switch above the Google button:

- **On** (default): the button opens the mock account picker for the currently selected
  role, labelled `MOCK DATA`.
- **Off**: the button is disabled and a note explains why. The choice is stored per
  browser in `localStorage` under `ks-mock-google`, so it survives reloads.

Switching roles closes the picker, and `Escape` (or clicking the backdrop) dismisses it.
No Google script is loaded and no request is made to `accounts.google.com`.

### The sample Google accounts

Defined once, server-side, in `backend/src/services/auth-mock.service.js`
(`MOCK_GOOGLE_ACCOUNTS`) and served to the UI by `GET /api/auth/options`:

| Role | Name | Email |
| --- | --- | --- |
| Farmer | Bijay Pradhan | `bijay.pradhan.anc@gmail.com` |
| Farmer | Kuni Sahoo | `kuni.sahoo.anc@gmail.com` |
| Officer | Rashmi Das | `rashmi.das.anc@gmail.com` |
| Officer | Manoj Behera | `manoj.behera.anc@gmail.com` |
| Authority | Suresh Patnaik | `district.admin.anc@gmail.com` |

Each account's email matches a seeded user in `backend/src/data/seed-data.js`, so a pick
lands on real mock data (requests, tokens, queue history) instead of an empty profile.

**To add or change a mock account:** edit `MOCK_GOOGLE_ACCOUNTS`, then make sure a user
with the same email exists in `USERS` (seed data) — otherwise the picker entry behaves
like a brand-new farmer and issues a profile-completion ticket. Officers and authorities
must also keep `accessApproved: true` in the seed data. Restart the backend; the frontend
picks the list up automatically from `/api/auth/options`.

An email that is not in the list is rejected with `AUTH_GOOGLE_INVALID`, and picking an
account whose role differs from the selected tab returns `AUTH_ROLE_MISMATCH`.

## 2. Mock OTP codes

1. Choose **SMS OTP** or **Email OTP**, enter any valid contact, and press send.
2. The response contains `mockCode`; the UI shows it in a dashed card with a **Fill**
   button that copies it into the code field.
3. Submit it to receive a session (`{token, user}`), or — for a contact with no account —
   a farmer profile ticket.

The mock flow keeps every real guard rail, so the timing behaviour you see is the real
behaviour:

- codes expire after **5 minutes**, single-use, and only the hashed code is stored;
- **5 wrong attempts** kill a challenge; a resend replaces the previous code;
- **60-second** resend cooldown, **5 sends** and **15 checks** per contact per hour;
- IP rate limits on the sign-in, send, and verify endpoints;
- contact linking (`/api/auth/contact/*`) is bound to the authenticated user and purpose.

Sample contacts you can type in: `9999999001`, `9999999002` (farmers), `9999999101`,
`9999999102` (officers), `9999999201` (authority), or any of the emails in the table
above. Any other valid number/address walks the new-farmer registration path.

## 3. Sample accounts (password shortcut)

`ALLOW_DEMO_LOGIN` defaults to **true** because the sample accounts *are* the mock data.
Set it to `false` in `backend/.env` to disable password sign-in for them and hide the
**Explore demo accounts** panel; the mock Google picker and mock OTP codes keep working.

| Role | Phone | Email | Password | Scope |
| --- | --- | --- | --- | --- |
| Farmer | `9999999001` | `bijay.pradhan.anc@gmail.com` | `Farmer@123` | Own requests, tokens, queue, history |
| Farmer 2 | `9999999002` | `kuni.sahoo.anc@gmail.com` | `Farmer@123` | Seeded queue history at BBSR Central |
| Officer | `9999999101` | `rashmi.das.anc@gmail.com` | `Officer@123` | Bhubaneswar Central Procurement Centre |
| Officer | `9999999102` | `manoj.behera.anc@gmail.com` | `Officer@123` | Jatni Mandi Procurement Centre |
| Authority | `9999999201` | `district.admin.anc@gmail.com` | `Authority@123` | District-wide overview |

Data files seeded before farmers had emails are backfilled automatically on boot by
`backend/src/db/store.js`. Reset everything with `cd backend && npm run seed`.

## 4. Extra staff accounts (optional)

To add a staff account outside the seed data, stop the backend (the JSON store is
single-writer) and run:

```bash
npm --prefix backend run auth:provision -- \
  --role officer --name "Extra Officer" \
  --email "extra.officer@example.org" --phone "9876543211" \
  --district "Khordha" --centre-id "centre-jatni"
```

Then sign in with a mock OTP to that phone/email, or add the same email to
`MOCK_GOOGLE_ACCOUNTS` so it appears in the picker. Restart the backend afterwards.

## 5. Things to know before deploying

- **This is mock authentication.** Do not expose it to real users or real data: anyone can
  sign in as any sample account, and OTP codes are printed on screen. Re-introduce a real
  provider layer (Google token verification, Twilio Verify, SMTP) before production use.
- `JWT_SECRET` still matters — set a unique random value of at least 32 characters
  (`openssl rand -hex 32`) and `NODE_ENV=production`.
- Verification state, the mock outbox, and rate limits are in-memory and single-process;
  a restart clears pending codes.
- Procurement notification SMS (`SMS_PROVIDER`) is a separate subsystem and is unrelated to
  sign-in; `sim` mode keeps messages in the officer outbox.
- Legacy endpoints stay retired: `POST /api/auth/phone-login` returns `410`, and staff
  accounts created by the old self-service Google flow remain disabled until re-provisioned.

## Checks

```bash
npm --prefix backend test        # mock delivery, verification limits, route contracts, setup CLI
npm --prefix frontend run build
# Browser tests for the picker, the switch and the on-screen codes:
cd frontend && npx playwright install chromium && npm run test:e2e
```
