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

- **Node.js ≥ 18** (20 LTS recommended) and npm
- That's it. No database server is required — the backend persists to a JSON file
  (`backend/data/db.json`), auto-created and seeded on first boot.

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
| `NODE_ENV`        | `development`                          | Log format etc.                                     |

### Frontend (`frontend/.env`, see `.env.example`)

| Variable            | Default                 | Purpose                                                                                |
| ------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `http://localhost:5000` | API origin used by the Vite **dev proxy**, and by the app when hosted **separately**. Leave **empty** when the backend serves the frontend build (same-origin calls). |

## 5. Demo credentials

| Role      | Phone        | Password       | Scope                                  |
| --------- | ------------ | -------------- | -------------------------------------- |
| Farmer    | `9999999001` | `Farmer@123`   | Own requests, tokens, queue, history   |
| Farmer 2  | `9999999002` | `Farmer@123`   | Seeded queue history at BBSR Central   |
| Officer   | `9999999101` | `Officer@123`  | Bhubaneswar Central Procurement Centre |
| Officer   | `9999999102` | `Officer@123`  | Jatni Mandi Procurement Centre         |
| Authority | `9999999201` | `Authority@123` | District-wide overview (read-only)     |

New farmers can self-register on `/register`. Officers can create walk-in (assisted) tokens from
**Assisted Entry**; first-time phone numbers get an account with default password `Kisan@123`.

Reset all demo data: `cd backend && npm run seed`

## 6. End-to-end demo script

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

AUTHORITY: Login 9999999201 → District Overview (congestion / capacity / volume / alerts)
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
- Secrets are never committed — see `.gitignore` and the `.env.example` pattern.
