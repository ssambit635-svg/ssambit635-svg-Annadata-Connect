# Annadata Connect Frontend

React 18 + Vite SPA for the Annadata Connect procurement platform.

- Roles: Farmer / Officer / Authority — role-based routing + server-enforced auth (JWT)
- Bilingual UI (English ↔ हिन्दी) via a translation dictionary (`src/i18n/translations.js`)
- Controlled rule-based farmer assistant (`src/assistant/brain.js`) — FAQ intents only, no LLM
- Dedicated API service layer in `src/services/api/`

```bash
cp .env.example .env    # browser calls /api; Vite proxies to the backend
npm install
npm run dev             # http://localhost:5173 (proxies /api → backend)
npm run build           # production bundle in dist/ (backend serves it)
```

Structure:

```
src/
├── components/   AppShell, TokenCard, StatusJourney, StatusBadge, states, assistant widget…
├── pages/        farmer/ officer/ authority/ + auth + error pages
├── hooks/        usePoll (data + auto-refresh)
├── services/api/ client.js + authService / farmerService / requestService / officerService / authorityService
├── auth/         AuthContext (JWT in localStorage, ks:unauthorized handling)
├── i18n/         translations + context (persistent EN/HI choice)
├── assistant/    rule-based FAQ brain
└── utils/        formatters, status maps
```

See **../README.md** for the full run guide and **../API_INTEGRATION_MAP.md** for the contract.

Verified Google/SMS/email sign-in and provider activation: **../AUTH_SETUP.md**.
Google client configuration comes from the backend at runtime; do not add provider secrets to VITE_* variables.
Browser contract tests: `npx playwright install chromium && npm run test:e2e`.
