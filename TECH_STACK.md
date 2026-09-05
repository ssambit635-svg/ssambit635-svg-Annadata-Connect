# Annadata Connect — Tech Stack (Serial List)

## 1. Runtime & Language
- **Node.js 22+** — JavaScript runtime for the backend (ES Modules mode)
- **JavaScript (ES2023)** — one language for both frontend and backend

## 2. Frontend (React App)
1. **React 18.3** — UI component framework
2. **Vite 5** — fast build tool and dev server
3. **React Router 6** — page routing (public landing → role dashboards)
4. **Fetch API** — HTTP calls to the backend via a central `api()` wrapper (auto-attaches JWT)
5. **Custom i18n Context** — English + हिंदी translations (no external library)
6. **Hand-written CSS design system** (`global.css`) — CSS variables, cards, shadows, hover effects; no UI library
7. **Custom SVG icon system** (`components/Icon.jsx`) — 30 stroke icons, no emoji dependence

## 3. Backend (API Server)
1. **Express 4.21** — REST API framework (single process serves API + built frontend)
2. **JSON Web Tokens (jsonwebtoken 9)** — login sessions with role-based access (farmer / officer / authority)
3. **bcryptjs 2.4** — password hashing
4. **dotenv 16.4** — environment configuration (.env for secrets)
5. **morgan** — request logging
6. **cors** — cross-origin control
7. **Custom middleware** — auth guard, role guard, input validation, error handler
8. **google-auth-library / Google Identity Services** — signed Google ID tokens and official account chooser
9. **Twilio Verify / Nodemailer SMTP** — real SMS/email verification, never the notification simulator
10. **express-rate-limit** — IP throttling alongside contact-level OTP limits

## 4. Database
- **JSON file store** (`backend/data/db.json`) — zero-install demo database with seeded data
- **Swap-ready design** — all data access isolated in `db/store.js`; move to PostgreSQL/MongoDB by changing one module only

## 5. Services Layer (Business Logic)
1. **queue.service.js** — queue positions, wait-time estimates, centre stats, alerts
2. **recommendation.service.js** — rule-based smart centre picker (45% wait time, 30% distance, 25% storage)
3. **notification.service.js / notifier.service.js** — bilingual in-app notifications
4. **sms.service.js** — pluggable SMS gateways: **MSG91** (India + DLT), **Twilio**, `sim` simulation mode (chosen via `SMS_PROVIDER` in .env), visible in the officer SMS Outbox

## 6. Security
- bcrypt password hashing
- JWT expiry + role middleware on every protected route
- Input validation on all write endpoints
- Secrets only in backend environment settings (never in frontend code)
- One-use Google nonces; expiring, attempt-limited OTPs; administrator-provisioned staff roles
- Provider activation and single-process limitations: [AUTH_SETUP.md](AUTH_SETUP.md)

## 7. Testing & Tooling
1. **Playwright (headless Chromium)** — end-to-end browser tests with screenshots
2. **npm workspaces-style scripts** — `npm run setup` → `npm run build` → `npm run start`
3. **Seed CLI** — `npm run seed` resets demo data
4. **Node test runner + Supertest** — auth security, provider contracts, migrations, provisioning tests

## 8. Packaging
- Single zip, single Node process — clone → setup → build → start → open `http://localhost:5000`

---
**One-liner:** React 18 + Vite bilingual SPA · Express 4 + JWT REST API · JSON-store with DB-swappable layer · rule-based recommendation engine · MSG91/Twilio-ready SMS gateway.
