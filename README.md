# अन्नदाता कनेक्ट Annadata Connect — Full-Stack MVP

A real, locally-runnable crop-procurement platform connecting **Farmers**, **Procurement Officers / Centres**, and **District Authority** — with token generation, live queue tracking, rule-based smart centre recommendation, **Smart Selling Options that compare buyers before you sell** (government MSP centres vs above-MSP market buyers), **historical mandi price intelligence built on real Agmarknet records (2021–2025)**, a trilingual
(English · हिन्दी · ଓଡ଼ିଆ) UI, an installable PWA + sideloadable **Android APK** built for free on GitHub Actions, and a controlled rule-based farmer assistant.

> **Deploy for $0** — Render free backend, GitHub Actions APK, cron-job.org keep-awake: see **[FREE_STACK.md](FREE_STACK.md)**.
>
> **Get the app free** — the landing page has a *Get the App* section: the Android APK
> button downloads `annadata-connect-latest.apk` from the rolling GitHub Release
> (`…/releases/latest/download/annadata-connect-latest.apk`, rebuilt automatically on
> every `main` push by the Android APK workflow), and the laptop/other-phone option
> opens the same app in any browser — no install. Trilingual UI; mobile-first shell.

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
endpoints and no disconnected demo screens. Sign-in is deliberately **mocked** (see below).
Farmer and officer UIs share
the same backend state (officer actions update the farmer's view in real time via polling).

---

## 1. Prerequisites

- **Node.js ≥ 22** (22 LTS or newer) and npm
- That's it. No database server is required for the local pilot — the backend persists to a JSON file
  (`backend/data/db.json`), auto-created and seeded on first boot.
- Sign-in needs **no configuration at all**: Google, SMS and email are mocked end to end.
  See [AUTH_SETUP.md](AUTH_SETUP.md).

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
| `ALLOW_DEMO_LOGIN` | `true` | Set `false` to disable password sign-in for the sample accounts and hide the demo panel |
| `TRUST_PROXY` | `0` | Exact trusted reverse-proxy hop count for IP rate limits |
| `NODE_ENV`        | `development`                          | Log format etc.                                     |

### Frontend (`frontend/.env`, see `.env.example`)

| Variable               | Default                 | Purpose                                                                                |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | empty = same origin | Optional public HTTPS API origin for a separately hosted production frontend. Dev browsers always use same-origin `/api`. |
| `API_PROXY_TARGET` | `http://127.0.0.1:5000` | Server-side Vite proxy target, never called directly by a remote browser. |

## 5. Mocked sign-in & sample credentials

The bilingual login page offers **fake Google, SMS OTP, email OTP, and password** for all
three roles. Nothing is real: no Google script or OAuth client, no Twilio Verify, no SMTP.

- **Fake Google:** a **Fake Google sign-in** switch (per-browser, on by default) enables a
  Google-styled button that opens a local picker of sample accounts for the selected role.
  Picking one posts `{role, email}` and returns a session. Accounts live in
  `backend/src/services/auth-mock.service.js` and are served by `/api/auth/options`.
- **SMS OTP / Email OTP:** the API generates a six-digit code and returns it as `mockCode`;
  the screen shows it in a "Mock SMS · your code" card with a **Fill** button. Expiry
  (5 min), five attempts, the 60-second resend cooldown and hourly/IP limits still apply.
- **Password:** real bcrypt check against the sample accounts below, for every role.

New farmers verify a contact first, then complete their name and village; setting a
password is optional. Any account can open **Account menu → Sign-in & contact details** to
link an email or mobile without creating a duplicate profile. Email-only accounts still
receive in-app notifications; SMS notifications need a linked phone.

Roles stay enforced server-side: choosing a role in the UI never grants privileges, and
officer/authority contacts must exist in the data. Full mock-account list, limits,
provisioning and pre-deployment warnings: **[AUTH_SETUP.md](AUTH_SETUP.md)**.

### Sample accounts

Sample accounts are the mock data, so `ALLOW_DEMO_LOGIN` defaults to `true`. Set it to
`false` in `backend/.env` to hide the **Explore demo accounts** panel and disable their
password logins (the fake Google picker and mock OTP codes keep working).

| Role      | Phone        | Email                             | Password        | Scope                                  |
| --------- | ------------ | --------------------------------- | --------------- | -------------------------------------- |
| Farmer    | `9999999001` | `bijay.pradhan.anc@gmail.com`     | `Farmer@123`    | Own requests, tokens, queue, history    |
| Farmer 2  | `9999999002` | `kuni.sahoo.anc@gmail.com`        | `Farmer@123`    | Seeded queue history at BBSR Central    |
| Officer   | `9999999101` | `rashmi.das.anc@gmail.com`        | `Officer@123`   | Bhubaneswar Central Procurement Centre |
| Officer   | `9999999102` | `manoj.behera.anc@gmail.com`      | `Officer@123`   | Jatni Mandi Procurement Centre          |
| Authority | `9999999201` | `district.admin.anc@gmail.com`    | `Authority@123` | District-wide overview                  |
| Authority | `9999999202` | `state.admin.anc@gmail.com`       | `Authority@123` | State-wide command centre               |

The seed now spans **6 Odisha districts (Khordha, Cuttack, Puri, Ganjam, Sambalpur,
Balasore), 14 centres, 30 farmers and 6 officers**, with a deterministic week of
procurement history so the state monitor always has trend data. The **Explore demo
accounts** panel lists a dozen named sample farmers (not just the original two), and the
fake-Google picker lists all 30.

Walk-in farmers created by officers claim their account with a mock SMS code; there is no
shared default password. Old bypass-era sessions are invalidated, and legacy self-created
staff accounts require explicit re-provisioning.

Reset sample data: `cd backend && npm run seed` (**destructive; never use on real user data**).

## 6. End-to-end demo script

Pick the matching role and any method: the **fake Google picker**, a **mock OTP** (the code
is printed on screen), or the **Password** shortcut below.

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
Login 9999999001 / Farmer@123 → Sell Now → pick paddy + 20 q → compare ranked buyers
(Govt MSP centres vs market buyers paying above MSP) → choose → booked as token (MSP)
or a market booking reference (SSB-…) with on-the-spot settlement; market bookings are
listed & cancellable on the Smart Sell page. If the farmer already holds an active
request or booking, the page shows a clear "Sell Now is paused" panel with one-tap
"Cancel request/booking & sell" actions instead of a silently disabled button.

AUTHORITY: Login 9999999201 / Authority@123 → District Overview (congestion / capacity / volume / alerts)
        → State Monitor (/authority/state): whole-state command centre — KPI grid,
        7-day procurement trend, district comparison bars, crop-mix donut, live
        pipeline flowchart, and one-tap drill-down into every district's centres.
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
- Auth endpoints enforce IP limits; mock OTPs also have contact-level limits, expiry and single-use checks.
- **Authentication is mocked** — anyone can sign in as a sample account and codes are shown on
  screen. Never expose this build to real users; see [AUTH_SETUP.md](AUTH_SETUP.md).
- Use persistent transactional storage and a shared verification/rate-limit store before scaling beyond one process.
