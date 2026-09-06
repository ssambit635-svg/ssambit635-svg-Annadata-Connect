# Annadata Connect Backend API

Node.js + Express REST API for crop-procurement token & queue management.

- Auth (mocked): fake Google account picker, SMS/email OTP codes generated in-process and returned as `mockCode`, and password; role-bound JWT sessions (`farmer | officer | authority`). No Google/Twilio/SMTP integration exists.
- Data: JSON file store at `data/db.json` (auto-seeded with demo centres/crops/users on first boot)
- Serves `../frontend/dist` (built SPA) on non-`/api` routes when present → single-port deployment

```bash
cp .env.example .env
npm install
npm start        # http://localhost:5000
npm run dev      # auto-reload
npm run seed     # wipe + reseed demo data
```

Full endpoint contract: see **../API_INTEGRATION_MAP.md**.
Project-level setup/demo credentials/troubleshooting: see **../README.md**.

Mock accounts, OTP limits and staff provisioning: **../AUTH_SETUP.md**.
Security/contract tests: `npm test`. Real OTPs never use the notification SMS outbox.
