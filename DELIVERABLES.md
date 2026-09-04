# Annadata Connect — Deliverables, Feature Coverage & Known Limitations

## Implemented features (all working end-to-end)

- ✅ **Public portal homepage** at `/` (no login needed) — government-portal style: tricolor
  strip, department banner, nav (Features / How it works / MSP Rates / Centres), announcements
  ticker, hero with yellow **Login** + **Register as Farmer** buttons, portal stats, 6 feature
  cards, 4-step guide, indicative MSP table, pilot centre list, assisted-entry banner, helpline
  footer; fully bilingual; Signed-in visitors get an **Open Dashboard** button

### Cross-cutting
- ✅ Real Express backend + real React frontend sharing one stateful backend (JSON persistence)
- ✅ JWT login/register with bcrypt password storage; 12h tokens; server-side role authorization
- ✅ Roles: `farmer`, `officer`, `authority` — role-based routing in UI + enforced on every API call
- ✅ English ↔ हिन्दी toggle across the entire UI (dictionary-based, persists across navigation);
  backend data fields are bilingual too (`nameEn/nameHi`, `messageEn/messageHi`)
- ✅ Loading / error / empty / retry states on every screen; friendly, non-technical failure text
- ✅ 401 → automatic logout + redirect to login; 403 → dedicated "not allowed" page
- ✅ Responsive layouts (mobile-first farmer UI verified at 390px; desktop officer/authority views)
- ✅ Controlled rule-based assistant — 10 approved intents (token, queue, status, centre, register,
  language, assisted mode, about, thanks), Hinglish + Devanagari pattern matching, strict
  out-of-scope fallback. **Not an LLM; cannot answer anything outside the FAQ.**

### Farmer
- ✅ Self-registration (name, phone, village, password) and login
- ✅ **Tokens & Records dashboard** — every token with procurement status AND payment status,
  plus running totals (tokens count, completed count, amount received, payment pending)
- ✅ **Payment tracking** — completing a procurement opens a payment record (qty × MSP);
  officer marks it paid with a UTR/reference; farmer is notified and sees Paid/Pending everywhere
- ✅ Dashboard: profile, active request, token card, queue position, estimated wait, notifications
  (auto-refresh every 10 s), quick actions
- ✅ 3-step procurement request: crop+quantity → transparent centre recommendation
  (distance, queue, capacity %, estimated wait, eligibility reasons) → confirm → token `ANC-xxx`
- ✅ Duplicate active-request protection (server 409 surfaced in UI)
- ✅ Live token page (8 s polling) with centre queue summary; visual procurement journey
  (Submitted → Token → Waiting → Called → Processing → Completed) translating statuses to
  farmer-friendly bilingual labels; full history page; request cancellation
- ✅ Public procurement-centre directory with live queue/storage state
- ✅ Notifications for token creation and every officer action — in-app (bilingual) **and SMS**
  via the provider layer: welcome SMS, token booked, called, processing, completed, payment events,
  assisted-account credentials. Officers see everything in the dashboard **SMS Outbox**; default
  mode records messages (SIMULATED), flip `SMS_PROVIDER=msg91|twilio` + keys in `.env` for real delivery

### Officer (bound to their centre)
- ✅ Dashboard: farmers today / waiting / processing / completed / capacity %, storage bar,
  rule-based alerts (capacity ≥75/≥90%, long queue, paused centre), at-counter list, next-in-queue
- ✅ One-click lifecycle actions: Call → Start → Complete, Reject (with optional reason)
- ✅ Full queue table and filterable request register
- ✅ Pause/resume centre intake (blocks new tokens server-side while paused)
- ✅ Assisted entry for farmers without smartphones (creates account + token at the counter)

### Authority
- ✅ District overview: totals, centre-wise demand/congestion bars, capacity utilization,
  procured volume AND value (₹ procured / ₹ paid per centre), aggregated alerts, centre table
- ✅ **Authority centre drill-down** — click any centre row for its full detail page:
  live stats, storage bar, alerts, recent requests register with payment status

- ✅ **UI polish pass (UX-grade)**: full SVG icon system (ticket, queue, target, payment, SMS, users,
  search, eye-toggle, alerts, pin, clock — no emoji glyphs), refined typographic scale, consistent
  spacing rhythm, elevation tiers and hover micro-interactions (lift + shadow on cards/stats/rows),
  input focus rings, uppercased table headers with row hover, demo-account "Use" quick-fill buttons

- ✅ **Farmer ID Card generator** — every registered farmer gets a permanent Farmer ID
  (`ANC-F-0001…`, minted at registration or assisted entry); the farmer's **ID Card** page shows a
  printable government-style card: name, mobile, village, registered crops and a **QR code**
  (free `qrcode` lib, encodes ID/name/mobile/village for counter verification) with
  Print / Save-as-PDF support

### Smart Selling Options — compare buyers before selling
- ✅ New **Smart Sell** flow (nav + `/sell`) lets a farmer pick crop + quantity and compare **every
  buyer** side-by-side before committing: government **MSP procurement centres** (guaranteed MSP,
  queue/wait/storage) AND private **market buyers** (FPO / mill / trader) who pay an above-MSP rate
  settled on the spot.
- ✅ Transparent rule-based ranking: each option shows offer ₹/q, gross value, and net value after an
  estimated transport cost (`₹0.4 per km per quintal`, same for every channel); options ranked by net
  value, ties by distance; flags tag **Best value**, **Best MSP option** and **Best price**.
- ✅ MSP options are derived live from the existing centres (OPEN + capacity ≥ quantity); market buyers
  are a new seeded entity with per-crop offer rates, intake capacity and settlement terms.
- ✅ One active sale per farmer across both channels (server-enforced); bookable MSP choice creates the
  usual token (`ANC-…`); bookable market choice records a market booking (`SSB-…`) with the buyer and
  releases quantity back on cancel. In-app **and** SMS notifications on every event.
- ✅ Farmer sees their **market bookings** (reference, rate, status) on the Smart Sell page and can cancel
  a confirmed booking; fully bilingual (EN/हिन्दी).

## Backend-dependent feature notes

The backend is **in-repo** and implements the whole contract in `API_INTEGRATION_MAP.md`, so there
are no blocked features. If this frontend is pointed at a *different* backend, it depends on that
backend providing: JWT login with phone+password, the exact endpoint set and field names in the
map, bilingual `nameEn/nameHi` fields, and the request lifecycle transitions listed there.

## Known limitations (by design for MVP)

- JSON file store is demo-grade (single-writer, debounced saves). Swap `backend/src/db/store.js`
  for PostgreSQL before production; routes/services don't change.
- Queue ETA is an honest estimate (`ahead × centre processing speed`) — no per-token GPS/timing.
- Distances are straight-line (haversine) from village to centre coordinates, not road distance.
- SMS is **integration-ready**: full provider layer implemented (real MSG91/Twilio HTTP calls);
  physical delivery requires a provider account (`SMS_PROVIDER=msg91|twilio` + credentials in
  `.env`; in India, MSG91's transactional route also needs DLT-registered templates). Until
  configured it runs in `sim` mode with a visible SMS Outbox on the officer dashboard.
- No IVR/display-board/offline-sync yet — assisted counter entry is the implemented bridge
  for farmers without smartphones; the rest are intentional future integrations.
- MSP figures in seed data are indicative demo values, not official notifications.
- Push notifications remain in-app (polled); SMS covers the offline channel once a gateway is configured.
- No password-reset flow; officers create assisted accounts with the default password `Kisan@123`.
- Single district (Khordha) seeded; add more districts in `backend/src/data/seed-data.js`.
- Market-buyer offer rates, capacities and coordinates in `BUYERS` are indicative demo values; the
  transport-cost constant (`₹0.4/km/q`) is a documented rule for fair comparison, not a carrier quote.
- Market bookings are a lightweight confirmation record (reference + terms); full in-yard delivery
  tracking for private buyers is a future integration.

## Quality checklist — status

| Check | Status |
| --- | --- |
| No broken routes / dead nav / fake buttons | ✅ verified via browser E2E across all roles |
| No console errors | ✅ zero console/page errors in automated runs |
| No invented endpoints / fake auth | ✅ UI only calls endpoints in the map; JWT enforced server-side |
| Hindi toggle works everywhere | ✅ incl. API data fields, statuses, assistant, errors |
| Assistant answers only approved FAQs | ✅ out-of-scope questions hit the fixed fallback |
| Farmer workflow end-to-end | ✅ login → request → recommendation → token → queue → journey |
| Smart Selling end-to-end | ✅ compare MSP + market buyers → book token or market booking → cancel/release |
| Officer workflow end-to-end | ✅ login → dashboard → call/start/complete/reject → farmer sees updates |
| Unauthorized actions blocked | ✅ 401/403/redirects verified (incl. authority→officer, anon→app) |
| Loading/error/empty states | ✅ every screen |
| Mobile layout | ✅ 390px verified; touch targets ≥44px |
| Production build succeeds | ✅ `vite build` clean |
| README complete | ✅ setup, env, demo creds, troubleshooting, deployment |
