# Annadata Saathi — the Android app frontend

**Annadata Saathi** (`अन्नदाता साथी`, "Harvest Companion") is the bespoke UI that ships
inside the Android APK. It is a *different frontend* from the website on purpose:
same product, same backend, same green-gold-cream theme — but its own design
language, its own name, its own typography and its own components, tuned for a
₹8,000 phone held in one hand in bright sunlight.

The website is untouched. One codebase, two frontends:

| | Website (`src/pages`, `src/components`) | Android app (`src/mobile`) |
|---|---|---|
| Boots in | Browsers (default) | Capacitor APK (always), or any browser with `?app=1` |
| Navigation | Top header + nav bar + mobile tab bar | Bottom tab bar with a raised gold **+** button |
| Name / wordmark | Annadata Connect | **Annadata Saathi** · Harvest Companion |
| Typography | System UI stack | **Baloo 2** display + **Mukta** body (Devanagari + Latin, bundled offline) |
| Cards | Flat bordered cards | Rounded "passbook" cards, perforated token tickets, toran scallop strips |
| Illustration | Line icons only | Hand-drawn folk-art SVG kit (`src/mobile/art.jsx`) — sun, farmer, cow, tractor, mandi, scales |
| Empty/error states | Text + icon | Illustrated (basket, sleepy sun, cow) |
| Confirmations | `window.confirm` | Bottom sheets |

## Design language

- **Palette** — the website's theme, warmed up: forest green `#14532d/#0f3d22`,
  MSP green `#166534`, gold `#fbbf24`, cream paper `#fbfaf5`, leaf tint `#e3f2e7`.
- **Folk-art illustration** — every illustration is inline SVG (no image assets,
  nothing to download): a smiling sun, a waving farmer with a gold turban knot,
  a cow with a bell, a little tractor, mandi awnings, weighing scales. Bold ink
  outlines, flat fills, dotted details — Indian government-poster inspired.
- **The token ticket** — the signature card: green header strip, huge Baloo 2
  token number, a dashed perforation with punched side notches, then a 2×2 info
  grid. Readable at arm's length.
- **Touch-first** — 52px pill buttons, 56px steppers, 40px+ chips, safe-area
  padding for notches, gentle pop/rise animations (disabled under
  `prefers-reduced-motion`).

## Feature parity with the website

Both frontends sit on the same `AuthContext`, `I18nContext` (EN/हिंदी/ଓଡ଼଼ିଆ),
`usePoll` hook and `src/services/api` layer, so parity is by construction:

- **Auth** — password, SMS/email mock-OTP (with the on-screen mock code card),
  mock Google picker, demo accounts, farmer registration (name + village).
- **Farmer** — home with live ticket, 3-step new-request wizard (crop chips,
  quantity stepper, recommended centre, success burst), token live view,
  status journey, records with earnings, ID card with QR, centres, Smart Sell
  (buyer comparison + Agmarknet price benchmark + bookings), mandi price
  history (sparkline, seasonality, top-paying mandis), rule-based assistant
  in a bottom sheet.
- **Officer** — centre control room (stats, intake pause/resume, serving
  counter, payments to settle, alerts, SMS outbox), live queue, request
  register with filters, assisted entry.
- **Authority** — district overview (congestion/capacity/demand bars, alerts)
  and per-centre drill-down.
- **App extras** — Android back button integration (exits only from root
  screens), offline pill, runtime server-URL setting for sideloaded APKs.

## Files

```
frontend/src/
├── mobile/
│   ├── isApp.js          # which frontend boots (native OR ?app=1 preview flag)
│   ├── MobileApp.jsx     # router + shell: app bar, bottom tabs, assistant FAB
│   ├── art.jsx           # folk-art SVG illustration kit
│   ├── ui.jsx            # design-system primitives (cards, buttons, ticket, journey…)
│   └── pages/            # Welcome, Home, NewRequest, SmartSell, Token, Status,
│                         # History, IdCard, Centres, Prices, Account,
│                         # Officer*, Authority*
└── styles/mobile.css     # the whole design system, scoped under .m-root
```

The website never loads app markup: `App.jsx` renders `<WebApp/>` or
`<MobileApp/>` exactly once per page load, and every app style is namespaced
under `.m-root`.

## Previewing and building

```bash
cd frontend
npm run dev                        # website at http://localhost:5173
open http://localhost:5173/?app=1  # app UI (sticky preview; ?app=0 to exit)
npm run android:apk                # build + cap sync + assembleDebug APK
```

Inside the APK the app UI is always used (`Capacitor.isNativePlatform()`); in a
browser the website is always the default — `?app=1` just flips a stored
preview flag so the app screens can be reviewed without a phone.

Screenshots: [`screenshots/saathi/`](screenshots/saathi/).
