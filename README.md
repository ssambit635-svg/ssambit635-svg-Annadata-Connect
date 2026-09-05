# अन्नदाता कनेक्ट Annadata Connect — Full-Stack MVP

A real, locally-runnable crop-procurement platform connecting **Farmers**, **Procurement Officers / Centres**, and **District Authority** — with token generation, live queue tracking, rule-based smart centre recommendation, **Smart Selling Options that compare buyers before you sell** (government MSP centres vs above-MSP market buyers), **historical mandi price intelligence built on real Agmarknet records (2021–2025)**, a bilingual
(English ↔ हिन्दी) UI, and a controlled rule-based farmer assistant.

```
kis an sathi/
├── backend/      Node.js + Express API (JWT auth, role-based access, JSON data store)
├── frontend/     React + Vite SPA (farmer / officer / authority interfaces)
├── scripts/      Data pipeline (historical Agmarknet extract builder)
├── API_INTEGRATION_MAP.md
├── HISTORICAL_DATA.md (real Agmarknet mandi price source + pipeline)
└── DELIVERABLES.md (features implemented + known limitations)
```

This repository ships **both** halves. The backend implements the API contract documented in
`API_INTEGRATION_MAP.md`, and the frontend is built strictly against that contract — no invented
endpoints, no frontend-only fake auth, no disconnected demo screens. Farmer and officer UIs share
the same backend state (officer actions update the farmer's view in real time via polling).

---

## 1. Prerequisites

- **Node.js ≥ 22** (22 LTS or newer; required by the Google authentication SDK) and npm
- That's it. No database server is required for the local pilot — the backend persists to a JSON file
  (`backend/data/db.json`), auto-created and seeded on first boot.
- Real Google/SMS/email sign-in needs your own provider configuration; see [AUTH_SETUP.md](AUTH_SETUP.md).

## 2. Quick start (recommended: single-port deployment)

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install

# 2. Frontend (build once)
cd ../frontend
cp .env.example .env       # optional; defaults work for local dev
npm install
npm run build

# 3. Run everything on one port
cd ../backend
npm start
# → http://localhost:5000  (UI + API)
```

The backend automatically serves `frontend/dist` when it exists, so **one process** hosts the
whole app at `http://localhost:5000`. This is also the recommended production layout.

## 2b. Historical mandi prices (real data, no mock)

The *Mandi Prices* page and the Smart Sell price check are driven by a real multilevel Agmarknet
panel — 7,208 monthly records across three levels (493 mandi + 3,567 district + 3,148 state
observations; paddy, wheat, maize, mustard, cotton; 2021–2025), extracted from
[pointbreak71/dpi410-final-project-v2](https://github.com/pointbreak71/dpi410-final-project-v2)
(scraped from `api.agmarknet.gov.in`, 2010–2025 nationally). The state level covers 19 states,
including Odisha.

```
Historical CSVs -> Backend loader -> Filter/aggregate -> /api/market-prices -> Frontend
```

The extracts are committed under `backend/src/data/agmarknet/`, so the app works
offline with no extra setup. To regenerate or widen them:

```bash
npm run data:agmarknet:all  # clones the upstream repo into .data-src/ and rebuilds all extracts
```

Full details — provenance, columns, selection rule, the `modal_price_avg` caveat and every endpoint —
are in **[HISTORICAL_DATA.md](HISTORICAL_DATA.md)**.

## 3. Development mode (two terminals, hot reload)

```bash
# Terminal 1 — API on :5000
cd backend && npm run dev

# Terminal 2 — Vite dev server on :5173, /api proxied to :5000
cd frontend && npm run dev
# → open http://localhost:5173
```

## 4. Environment variables

### Backend (`backend/.env`, see `.env.example`)

| Variable          | Default                                | Purpose                                             |
| ----------------- | -------------------------------------- | --------------------------------------------------- |
| `PORT`            | `5000`                                 | API port                                            |
| `JWT_SECRET`      | dev default — **change in production** | Signs auth tokens                                   |
| `JWT_EXPIRES_IN`  | `12h`                                  | Token validity                                      |
| `CORS_ORIGIN`     | empty = allow any (dev convenience)    | Comma-separated allowed origins in production       |
| `SEED_ON_BOOT`    | `true`                                 | Creates demo data if `data/db.json` is missing      |
| `GOOGLE_CLIENT_ID` | empty = unavailable | Google Web OAuth client ID, shared with the frontend at runtime |
| `AUTH_SMS_PROVIDER` | `none` | `twilio-verify` for real SMS OTP; needs Twilio credentials + Verify Service SID |
| `AUTH_EMAIL_PROVIDER` | `none` | `smtp` for email OTP; needs authenticated SMTP settings |
| `ALLOW_DEMO_LOGIN` | false in production | Opt in only for isolated sample-account password demos |
| `TRUST_PROXY` | `0` | Exact trusted reverse-proxy hop count for IP rate limits |
| `NODE_ENV`        | `development`                          | Log format etc.                                     |

### Frontend (`frontend/.env`, see `.env.example`)

| Variable               | Default                 | Purpose                                                                                |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | empty = same origin | Optional public HTTPS API origin for a separately hosted production frontend. Dev browsers always use same-origin `/api`. |
| `API_PROXY_TARGET` | `http://127.0.0.1:5000` | Server-side Vite proxy target, never called directly by a remote browser. |

## 5. Verified sign-in & demo credentials

The bilingual login page offers **Google, SMS OTP, email OTP, and password** for all three
roles. Provider methods are unavailable until configured — no fake account chooser,
no arbitrary-email Google login, and no unverified phone-number login.

- **Google:** Google's official account-selection UI; server verifies signed Google ID
  tokens (audience, issuer, expiry, verified email, and one-use nonce).
- **SMS OTP:** Twilio Verify sends a real six-digit code to an Indian mobile number;
  checking the code is required before sign-in. Available to **authorities**, officers,
  and farmers. This does not use the notification `SMS_PROVIDER=sim` outbox.
- **Email OTP:** an authenticated SMTP provider sends a real verification code. Farmers
  can create an email-based profile or use an email already linked to their account.
- **Password:** registered mobile or linked email plus password, for every role.

New farmers verify first, then complete their name and village; setting a password is
optional. Existing farmers can open **Account menu → Sign-in & contact details** to
verify and link email or mobile without creating a duplicate profile. Email-only
accounts still receive in-app notifications; SMS notifications need a linked phone.

**Officers and authorities require administrator-provisioned contacts and scope.**
Choosing a role in the UI never grants privileges. Full provider setup, staff provisioning,
security limits, migration notes and live-testing instructions: **[AUTH_SETUP.md](AUTH_SETUP.md)**.
Do not put real credentials in frontend variables or source control.

### Isolated local demo (password only)

To explore sample data without configuring providers, set `ALLOW_DEMO_LOGIN=true` in
`backend/.env` and restart. The login page then has a separately labelled **Explore demo
accounts** section. Leave it **false for real deployments** (the example `.env` does).
Real Google/SMS/email sign-ins never authenticate seeded sample identities.

| Role      | Phone        | Password        | Scope                                  |
| --------- | ------------ | --------------- | -------------------------------------- |
| Farmer    | `9999999001` | `Farmer@123`    | Own requests, tokens, queue, history    |
| Farmer 2  | `9999999002` | `Farmer@123`    | Seeded queue history at BBSR Central    |
| Officer   | `9999999101` | `Officer@123`   | Bhubaneswar Central Procurement Centre |
| Officer   | `9999999102` | `Officer@123`   | Jatni Mandi Procurement Centre          |
| Authority | `9999999201` | `Authority@123` | District-wide overview                  |

Walk-in farmers created by officers use SMS verification to claim their account; there
is no shared default password. Old bypass-era sessions are invalidated, and legacy
self-created staff accounts require explicit re-provisioning.

Reset sample data: `cd backend && npm run seed` (**destructive; never use on real user data**).

## 6. End-to-end demo script

For an isolated demo, first enable sample password access as described above. Select the
matching role and the **Password** method, or use the explicit demo section.

```
FARMER                                    OFFICER (same backend state)
─────                                     ─────────────────────────────
Login 9999999001 / Farmer@123
Dashboard → New Request
Pick crop + quantity → Find Best Centre
Read transparent recommendation           Login 9999999101 / Officer@123
(distance/queue/capacity/wait)            Officer Dashboard → stats + alerts
Confirm centre → Token ANC-xxx            Queue → Call → Start → Complete
                                        Live queue + journey auto-refresh  ◄────── Farmer gets notified at each step
                                        Assisted Entry → token for walk-in farmer

SMART SELL (compare buyers before selling):
Login 9999999001 / Farmer@123 → Smart Sell → pick paddy + 20 q → compare ranked buyers
(Govt MSP centres vs market buyers paying above MSP) → choose → booked as token (MSP)
or a market booking reference (SSB-…) with on-the-spot settlement; market bookings are
listed & cancellable on the Smart Sell page.

AUTHORITY: Login 9999999201 / Authority@123 → District Overview (congestion / capacity / volume / alerts)
```

## 7. Troubleshooting

| Symptom                                   | Fix                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Cannot reach the server` in the UI       | Backend not running: `cd backend && npm start`. Check port 5000 is free (`lsof -i :5000`).   |
| Login page loads, API calls 404           | In dev, run the Vite dev server (proxy handles `/api`); in prod, use the single-port layout. |
| Demo data looks stale / weird             | `cd backend && npm run seed` resets the JSON database.                                       |
| 401 right after login                     | System clock skew, or `JWT_SECRET` changed between restarts — log in again.                  |
| Port already in use                       | Set a different `PORT` in `backend/.env` and mirror it in `frontend/.env` (dev proxy).        |

## 8. Production build & deployment notes

- `cd frontend && npm run build` → static bundle in `frontend/dist`.
- **Single-node deploy (recommended):** copy `frontend/dist` next to the backend, run the API
  with `NODE_ENV=production node src/index.js`. Express serves the SPA with correct fallbacks.
- Set a strong `JWT_SECRET`, restrict `CORS_ORIGIN` to your real domain, and put the API behind
  HTTPS (e.g. nginx/Caddy reverse proxy).
- The JSON store is demo-grade. For production, swap `backend/src/db/store.js` for PostgreSQL
  (routes/services are isolated; no route code needs to change).
- No hard-coded hosts, ports, or secrets are baked into either side — everything is env-driven.

## 9. Security notes

- Passwords are bcrypt-hashed; JWTs verified on every protected route; role checks enforced
  server-side (`farmer` / `officer` / `authority`). Frontend route guards are UX-only.
- Farmers can only see/touch their own requests and notifications; officers only their own centre.
- Request validation lives in the backend; the UI validates only for convenience.
- Auth endpoints enforce IP limits; OTPs also have contact-level limits, expiry and single-use checks.
- Provider secrets stay server-side — see `.gitignore`, `.env.example`, and [AUTH_SETUP.md](AUTH_SETUP.md).
- Use persistent transactional storage and a shared verification/rate-limit store before scaling beyond one process.
