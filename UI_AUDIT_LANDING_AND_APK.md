# UI Audit — Landing Page + Android APK UI
**Date:** 19 Oct 2026 · **Scope:** `frontend/src/pages/LandingPage.jsx` (website `/`) and `frontend/src/mobile/` (Capacitor APK UI, preview `?app=1`) · **Status:** Critical round (§6) + logo unification (§7) + final deferred-items round (§8) all implemented 19 Oct 2026.

> How this was checked: read every landing/mobile source file + all 10 CSS files + Android/Capacitor config, ran backend (`:5000`) + Vite (`:5173`) live, ran production build (bundle sizes below), i18n parity script (✓ 779 keys × en/hi/or), compared landing hard-coded data vs `backend/src/data/seed-data.js`, and inspected repo screenshots (note: screenshots are stale — see F-S1).

Severity: 🔴 Critical (breaks task / misleads / blocks release) · 🟠 Major (hurts most users) · 🟡 Minor (polish/consistency)

---

## 1. Landing page flaws (`/`)

### 1A. Truthfulness & trust 🔴
| # | Flaw | Evidence |
|---|------|----------|
| L1 🔴 | **Fake headline stats presented as real:** `12,400+ Farmers`, `48,700+ Tokens`, `₹52 Cr+ Paid` are hard-coded strings, animated with counters as if live. No "demo/illustrative" label near them. | `LandingPage.jsx:36-41 STATS` |
| L2 🔴 | **"6 Procurement centres / 6 pilot locations" is wrong vs backend:** seed has **14 centres** across multiple districts. Landing only lists 6 Khordha ones. | `STATS stat3=6` vs `seed-data.js` 14× `centre-*` |
| L3 🔴 | **Every centre card says "Open now" — even paused ones.** Tangi is `PAUSED` in backend; landing shows green Open badge for all 6. No live status, hours, queue, distance or map. | `LandingPage.jsx:336` vs `seed-data.js:119 PAUSED` |
| L4 🟠 | **Centre capacities wrong/swapped:** Landing Tangi 4,000q / Pipili 3,500q vs backend Tangi 3,500q / Pipili 4,500q. | `CENTRES` vs `seed-data.js` |
| L5 🟠 | **MSP table is a duplicated hard-coded copy** of backend crops (will silently drift when MSP changes), year hard-coded `2026`, titled *"Today's MSP"* though static demo values. Disclaimer exists but in small note only. | `MSP_ROWS:9-16`, `:306` |
| L6 🟠 | **Fake "live" hero mockups:** floating `ANC-112` token + `₹12,075 Payment tracked` + *"Pilot network live"* caption look like real data to a farmer/judge. Only tiny "Sample live token" text hints otherwise. | `:194`, `:187-202` |
| L7 🔴 | **Government-impersonation risk:** tricolour bar + *"Government of Odisha · Food Supplies & Consumer Welfare Department (demo portal)"* + *"PUBLIC SERVICE PORTAL"* — but no prominent banner saying **"Hackathon prototype — not an official government service"** (that warning only exists in README, not on the page a farmer sees). Form says "demo" once in 11px utility strip. | `govStrip`, footer `SIH 2026` only |
| L8 🟠 | **Two different helplines:** Landing/footer/IdCard use **155266**; APK Welcome help card dials **155261** (`tel:155261`, "Toll-free: 155261"). One is wrong — a farmer in distress dials a dead/wrong number. | `LandingPage:150,409,439,455` vs `Welcome.jsx:314` |
| L9 🟡 | Promises without proof: *"payment within 24–48 hrs"*, *"₹0 forever"*, *"Live updates on app and SMS"* — SMS is `sim` mode, no real SMS/push behind it. Landing never says sign-in/SMS are mocked. | ticker2, downloadNote |

### 1B. Conversion & task UX 🟠
| # | Flaw |
|---|------|
| L10 🔴 | **"Track a token" CTA lies:** hero secondary CTA `heroTrackCta` links to `/login`, not to any public tracking. A farmer with just a token number + phone cannot track without full account login. No public centre search, queue view, or mandi-price preview either — everything useful is login-walled (`/market-prices`, `/centres` are `ProtectedRoute`). Landing is a brochure, not a tool. |
| L11 🟠 | **CTA soup:** Header Register+Login, hero Register+Track, feature-lead "Start with a token", assist "Get help", app-band 2 options, footer Get-in-touch — 6+ competing primaries, all funnel to `/register` or `/login`. No single clear farmer journey; officer/authority visitors get no entry path or explanation. |
| L12 🟠 | **Dead/fake footer links:** Footer Support "SMS Alerts" and "In-app Help Assistant" both link to `#features`; "Get in touch" is just `tel:`; no FAQ, grievance, email, address (address keys `orgAddr1/2` exist in i18n but are never rendered), privacy/terms pages missing entirely. |
| L13 🟠 | **APK download check is broken by design:** On every page load it does cross-origin `fetch(HEAD)` to `github.com/.../releases/latest/download/*.apk`. GitHub 302-redirects to S3 without CORS headers, so in browsers this typically fails → state `unknown/pending` → button forever says *"View Releases page"* instead of *"Download APK"* (verified APK actually exists via curl 302). Also `releases/latest` is fragile: publishing any `v*` release silently changes what "latest" points to vs the `latest-apk` tag workflow. No file size, version, Android-min-version, install/sideload steps, or checksum shown. |
| L14 🟡 | Announcement bar is static 2 messages squeezed on one line (ticker3/ticker4 defined but never shown); on mobile screenshots it truncates mid-sentence (*"addy procurement ongoing…"*). No rotation, pause, or dismiss. |
| L15 🟡 | Feature cards show hover arrow ↗ affordance but are not clickable — false affordance. Centre cards likewise look tappable, do nothing. |
| L16 🟡 | No FAQ, testimonials, "who is eligible / documents needed", scheme/season dates, or video/voice help — critical for low-literacy first-time farmers. Language toggle is only a tiny control in top utility strip; Odia (primary pilot language) is third, and landing crop/centre names have **no Odia fields at all** (`MSP_ROWS`/`CENTRES` only `en/hi`), so Odia users see English crop/centre names. |

### 1C. Visual, responsive & accessibility
| # | Flaw |
|---|------|
| L17 🟠 | **Mobile header/hero breakage (screenshots/landing-mobile.png):** brand mark renders as blank white circle, nav stacks right-aligned over green, hero secondary button renders as empty white pill (invisible text), ticker cut off. Even if partly fixed since, there is **zero automated visual/e2e test for landing** to catch regressions (only auth.spec exists). |
| L18 🟠 | Hero image: single 158KB JPG, no `srcset`/WebP/AVIF, no width/height (CLS risk), no preload; alt text describes token scene generically. Floating token/payment cards overlap image text on narrow screens. |
| L19 🟡 | Floating helpline pill `position:fixed` covers footer links/content while scrolling on mobile; combined with scroll-progress bar + sticky header + announcement = 4 stacked chrome layers eating first-screen height. |
| L20 🟡 | Rate "table" is `<div role=table/row/cell>` without headers/scope — screen readers can't associate crop↔price. Should be real `<table>` or list. Small grey text (`#6b7a70` ink-faint family, 11–12.5px) on cream/green likely fails WCAG AA contrast outdoors. Gold `#fbbf24` text on green for eyebrow/stat numbers is borderline. Focus-visible exists, but menu toggle doesn't trap/return focus or close on Escape/outside-click. |
| L21 🟡 | Page is very long with repeated green bands; "How it works" 4 steps are text-only (no icons/screenshots), app-download band repeats header CTA. No sticky mobile bottom CTA for Register after hero scrolls away (only helpline pill). |

### 1D. Performance, SEO, PWA, security
| # | Flaw |
|---|------|
| L22 🔴 | **742KB single JS bundle (227KB gzip) + 250KB CSS for a landing page.** No code-splitting (`React.lazy` nowhere): a visitor on 2G downloads farmer+officer+authority dashboards + entire mobile APK UI + GSAP+ScrollTrigger + charts before hero is interactive. Vite warns >500KB chunk. Fonts: Inter (3 weights) + Inter Tight variable + Plus Jakarta variable + IBM Plex Mono (2) + Noto Devanagari (2) + Noto Oriya (2) including Cyrillic/Greek/Vietnamese subsets (`dist` = 3.1MB). |
| L23 🟠 | GSAP layer (`useHomeAnimations`, 307 lines): blur+clip-path hero, parallax, pointer tilt, infinite floating glows/cards — jank + battery drain on ₹8,000 phones (the stated target device). Needs 3.2s "safety net" timeout to force-reveal content if tweens fail = content can stay invisible. Reduced-motion handled, but animation is the opposite of "designed for low connectivity, small screens". |
| L24 🟠 | **SEO/share incomplete:** no `og:image`, no Twitter card, no canonical, no `robots.txt`/`sitemap.xml`, title/description EN+HI only (no Odia in title), no structured data. WhatsApp share (how farmers actually share links) will show blank preview. |
| L25 🟠 | **PWA manifest shortcut broken:** `"Mandi prices" → /prices` — route doesn't exist (it's `/market-prices` and login-guarded), so long-press shortcut lands on login/404. `start_url=/?source=pwa` opens marketing landing, not farmer home. `short_name: Annadata` truncates brand. |
| L26 🟡 | No security headers anywhere (CSP, X-Frame-Options, etc. — `_headers` only sets SW cache + manifest type). External GitHub links `target=_blank rel=noreferrer` ok, but APK sideload from GitHub with no hash/signature guidance trains farmers to install random APKs. |

---

## 2. Android APK UI flaws (`src/mobile/`, `?app=1`)

### 2A. Identity & first-run 🔴
| # | Flaw |
|---|------|
| A1 🔴 | **Three identities at once:** package/site = *Annadata Connect*, screenshots/docs/keys = *Annadata Saathi / Saathi* (`saathi.*` i18n, `SAATHI_APP.md`), tagline = *Harvest Companion*. Splash wordmark, loader (`saathi.name`), IdCard header (`saathi.name · app.name`) mix them. Farmer can't tell if APK and website are same product. Docs also claim fonts *Baloo 2 + Mukta* — code actually bundles Inter Tight/Inter; docs claim "bottom sheets, not window.confirm" — code still uses `window.alert` (see A9). |
| A2 🔴 | **Welcome buries login below the fold:** giant folk-art hero (sun/farmer/field) + language pills + gov chip occupy >50% of first screen (01-welcome.png); farmer must scroll to reach mobile-number field. Then overwhelming choice: 3 roles × 3 methods (SMS/Email/Password) + Google + Demo accounts + help card. No "I'm a farmer, just continue with mobile" fast path, no voice/assisted onboarding. |
| A3 🔴 | **Mock/demo auth ships in the APK:** on-screen OTP codes, fake Google picker, 9 hard-coded demo accounts with passwords in `Welcome.jsx` (`Farmer@123` etc.). Fine for hackathon judges, catastrophic if any real farmer installs it — and landing offers this APK publicly as "ready to use". "Forgot password" is dead text (a `<p>`, not a link/flow). |
| A4 🔴 | **Server-address chicken-and-egg:** sideloaded APK must point at backend, but Mobile Welcome has **no** ServerSettings control (web `LoginPage` has it, but APK never renders WebApp). Only place is a tiny `…` chip in Account — reachable only *after* successful login, which needs the server. If `VITE_API_BASE_URL` (Render) is down/changed, APK is a brick with generic network error. Workflow release notes even say "set server on login screen" — impossible in app UI. |
| A5 🟠 | **Double splash delay:** native splash PNGs + in-app `SplashScreen` 1.9s + 0.52s fade on every cold start (sessionStorage dies when app killed). Farmer in mandi queue waits ~2.5s of branding before token. Splash colours mismatch (`#fbfaf5` WebView bg vs `#0f3d22` splash) → flash. |

### 2B. Navigation & layout breaks 🔴
| # | Flaw |
|---|------|
| A6 🔴 | **Assistant "Help" FAB covers controls:** fixed bottom-right (z-60) overlaps quantity `+` stepper in New Request (05-new-request.png: `+` hidden behind Help), ticket centre name on Home (03-home.png), and action buttons elsewhere. It renders on every farmer screen including forms. |
| A7 🔴 | **Tab-bar / content overlap:** officer screenshot (15-officer-home.png) shows tab bar rendered mid-page over "At the counter" cards. Shell relies on `padding-bottom: tab-h+26px` only; FAB + tab bar + sheets stacking is fragile. Centre gold `+` (56px) has no text label; its aria-label always says farmer "createRequest" even for officer (assisted entry). Tab bar `aria-label` = "Dashboard" (wrong landmark name). Authority has 4 tabs vs farmer/officer 5 → uneven spacing. |
| A8 🟠 | **Hidden features:** farmer tabs = Dashboard / Records / + / Mandi Prices / More. SmartSell, Centres, ID Card, Token, Status only discoverable via Home quick-action tiles — if farmer lands elsewhere they vanish. Bell links to `/farmer#inbox` but nothing scrolls to `#inbox` (BrowserRouter ignores hash; no effect) — bell tap appears broken when already on Home. No scroll-to-top on route change (new page opens mid-scroll). Hardware back: closes app from roots even if Sheet/Assistant open (should close sheet first); AppBar back uses fragile `history.state.idx` hack. `/unauthorized` renders 404 page. Browser preview banner (*"open with ?app=0…"*) leaks dev jargon to anyone opening `?app=1` link. |
| A9 🟠 | **Native dialogs break the design system:** `window.alert` in OfficerHome×3, OfficerQueue, OfficerRequests×2 (+ `window.confirm/alert` all over web portal). No toasts, no undo for destructive Call/Complete/Reject/Pay. Errors elsewhere use `window.location.reload()` as retry (Prices, SmartSell, NewRequest crops) — loses form/wizard state. NewRequest wizard state (crop/qty/centre) is memory-only: back button, app kill, or reload loses everything. |
| A10 🟡 | Sheets (`Sheet` in ui.jsx): no focus trap, no initial focus, no return-focus, backdrop is clickable `<div>` without aria-hidden handling; TalkBack users can tab behind sheet. `MOption` is `<div role=radio>` without `radiogroup`/arrow-key support. Stepper aria-labels are literally `"−"`, `"+"`, `"quantity"` (English, untranslated). |

### 2C. Visual, readability & device fit
| # | Flaw |
|---|------|
| A11 🟠 | **Phone-column on every device:** `.m-page/.m-welcome/.m-tabbar{max-width:560px}` — tablets/foldables/landscape (officers with tablets at centres!) get a narrow centred column with wasted sides; data-dense Officer/Authority screens become endless scroll (OfficerHome: stats+storage+counter+payments+queue+alerts+SMS outbox on one page). No landscape ID-card/queue board mode. PWA manifest locks portrait. |
| A12 🟠 | **Sunlight readability claimed, not delivered:** body hints/labels/timestamps at 11–13px in `#6b7a70/#52635a` on cream/white; ticket grid labels 11px uppercase faint. No dark/high-contrast mode (`color-scheme: light` forced), no large-text setting. Touch targets: `.m-btn.sm` 40px, chips 40px, bell/back 42px — below 48dp Material guidance for work-worn hands/gloves. |
| A13 🟡 | 261 inline `style={{}}` in mobile JSX → inconsistent spacing/type (16.5px, 17.5px, 13.5px magic numbers), same card looks different per page. Folk-art (smiling sun as Help icon) is friendly but ambiguous — sun ≠ help/chat for first-time users; art style also clashes with website's formal gov look, reinforcing "are these the same product?" (A1). Home duplicates actions: Sell-Now gold card + 6 quick tiles (New Request appears 3× counting tab `+`). Greeting shows first name only via `split(' ')[0]` — wrong for many Odia name orders. |

### 2D. Performance, offline & data
| # | Flaw |
|---|------|
| A14 🔴 | **APK ships the whole website:** single bundle includes WebApp pages + Landing GSAP animations + portal CSS (all 10 stylesheets imported in `main.jsx` regardless of mode) though APK only renders MobileApp. Bigger APK, slower cold start on low-end phones, larger attack surface. |
| A15 🟠 | **Polling storm, no realtime:** Home 10s, Token 8s, Status 10s, History 15s, Centres 30s, Queue 10s + NotificationBell separately polls notifications every 20s (Home already fetches them → duplicate). Battery/data heavy on rural 2G/3G; no "last updated" timestamp, no pull-to-refresh (only small Refresh chips), stale queue looks live when background poll silently fails (`usePoll` keeps old data with no stale indicator). 35s API timeout = spinner for half a minute on cold Render backend. |
| A16 🔴 | **Offline is a banner, not a feature:** service worker disabled in native; no offline cache guarantee for "show my token at gate without network" (the core mandi moment), new-request draft not queued, ID-card QR refetched each open. "Works without internet via SMS" (landing claim) has no in-app SMS fallback explanation/status. |
| A17 🟡 | Full-screen branded loader (`MLoader`) on every initial page load instead of skeletons — perceived slowness, layout pop. Lists (History, Requests, Prices) render all rows, no virtualization/pagination/search/filter beyond chips. |

### 2E. Android platform & release readiness 🔴
| # | Flaw |
|---|------|
| A18 🔴 | **Only a debug APK exists:** workflow runs `assembleDebug`, `minifyEnabled false`, no signingConfig/keystore, no AAB, `versionCode 1 / versionName 1.0` forever (updates can't be distinguished; Account hard-codes `v1.0`). Not Play-Store publishable; debug builds are larger/slower and debuggable. |
| A19 🔴 | **No push notifications:** no FCM/plugin/`POST_NOTIFICATIONS` — "your turn is called" (core promise) only works if farmer keeps app open polling. No local notifications, share-token (WhatsApp), haptics, biometric lock, deep-links/App Links (SMS link can't open token screen), home-screen widgets/shortcuts. Only Capacitor plugins: App (back button). |
| A20 🟠 | `android:allowBackup="true"` (auth token in localStorage backed up/restorable), no network-security-config/certificate pinning guidance, JWT stored in `localStorage` (`ks-auth`) readable via WebView/storage extraction on rooted/shared phones. No root/Play Protect guidance for sideload. |
| A21 🟡 | Splash uses legacy per-density PNGs + `Theme.SplashScreen` compat, inconsistent with Android 12+ splash API (icon/bg will letterbox differently per OEM). Status-bar style `default` vs green headers. Target/compile SDK 36 good, but no edge-to-edge opt-in handling beyond safe-area padding partial. Adaptive icon exists; no monochrome/themed icon, no Play listing feature graphic/screenshots (repo screenshots show old Saathi UI + preview banner!). |

---

## 3. Shared / code-health flaws

| # | Flaw |
|---|------|
| S1 🟠 | **Screenshots are stale & misleading:** `screenshots/` landing shows pre-redesign page (emoji icons, missing centre names in landing-bottom.png — centre titles invisible/blank), `screenshots/saathi/` shows "Annadata Saathi" branding + preview banner in every shot. README links NB: Judges/users see a different product than code. No screenshot automation. |
| S2 🟠 | **CSS archaeology:** 10 global stylesheets (304KB) — `global + home-polish + portal-theme + polish-v3 + polish-v4 + brand + mobile + mobile-gov + web-apk + auth` with overlapping selectors and cascade-order dependence (`main.jsx` import order is load-bearing). Any landing tweak risks breaking portal/APK. (`.m-root` scoping helps, landing `home-*` vs portal re-skin still tangled.) |
| S3 🟡 | **Test gaps:** e2e = 13 auth tests only. Zero tests for landing rendering/links/APK-check, mobile navigation/wizard/officer actions, offline, or visual regression at 360px. i18n parity ✓ is the bright spot. `npm audit`: frontend 9 vulns (6 moderate, 3 high). |
| S4 🟡 | Two parallel implementations of same screens (web `pages/farmer/*` vs `mobile/pages/*`, ~19 mobile pages) double every UI fix and already diverged (confirm dialogs, helpline, server settings). No shared design-system package beyond copy. |

## 4. What's already good (keep)
Skip-link + reduced-motion respect, i18n parity en/hi/or with `document.lang` switching, safe-area padding, 52px primary buttons, ticket-card concept, `usePoll` hidden-tab guard, mock clearly labelled *inside* auth screens, PWA SW stale-while-revalidate for web, hardware-back handling attempt.

## 5. Decisions needed before fixing (asked in chat)
1. Fix scope & order 2. Fake-vs-live landing data 3. One brand/name + design direction 4. Demo/mock auth in shipped APK 5. APK release target (debug sideload vs signed/Play) 6. Animation wow vs low-end performance. Plus open Qs: correct helpline (155266 vs 155261)? public token-tracking allowed? tablet support for officers? push notifications in scope?


## 6. Critical-round resolution (19 Oct 2026, owner choices: remove stats · one formal brand · keep demo for judges · sideload APK · keep GSAP wow + split bundles)
**Fixed:** L1 stats removed (proof bar = 4 journey steps) · L2/L3/L4 centre count/Open-now/capacities + Odia names + status note · L5 MSP Odia labels + indicative title · L6 hero floats labelled Sample (demo) · L7 prototype banner (landing) + demo banner (APK Welcome) · L8 helpline unified **155261** everywhere · L10 CTA relabelled "Sign in to track token" · L13 direct `latest-apk` download + 3-step install guide + releases link · L22/A14 code-split (main 742KB→146KB; Landing/GSAP own chunk; per-route chunks) · L24 og:image/Twitter card · L25 manifest `/market-prices` + start_url `/` · A1 formal tagline/trust/farmer-tip, chat FAB icon, Home sun/farmer art removed, IdCard single name · A2 compact Welcome hero · A4 pre-login Server address sheet in APK Welcome · A5 splash 1.9s→0.9s · A6 FAB hidden on form/token screens + shell clearance · A7 tab aria-labels role-correct + scroll-to-top/#inbox · A16 offline snapshots (Home/Token/ID Card, labelled) · A18 versionCode 2 / v1.1 + workflow install notes · A20 `allowBackup=false`.
**Verified:** `vite build` ✓ · i18n parity 789×3 ✓ · backend tests 48/48 ✓ · dev servers 200 ✓. Playwright e2e + APK build could not run in sandbox (browser CDN/Java unavailable) — run `npm run test:e2e` + `npm run android:apk` locally/CI.
**Deferred majors (next round):** CSS still one 246KB sheet & font subsets · window.alert/confirm (A9) · tablet/landscape layout (A11) · sunlight contrast/text sizes (A12) · polling de-dupe (A15) · stale screenshots recapture (S1) · public token tracking & live landing data (needs public APIs) · push notifications / signed Play build (owner chose sideload).

## 7. Logo unification (follow-up round)

User flagged that the green-square wheat icon in headers was not the real app logo. Real logo = `frontend/public/favicon.svg` (README header) ≡ `components/BrandLogo.jsx` ≡ PWA icons ≡ Android launcher PNGs/splash. Replaced every other mark with `BrandLogo`: landing header + footer (cream disc on dark footer), web login brand + story emblem, portal shell (was `ArtLogo` seal), mobile loader (was `ArtLogo` + leftover `saathi.name` key), mobile + web ID-card headers. Android adaptive-icon background changed `#0F3D22` → `#FBFAF5` so the real (light-bg) logo reads on the launcher. Still stale, next round: `screenshots/saathi/00-app-icon.png` (old gold-wheat seal), unused `drawable-v24/ic_launcher_foreground.xml` wheat vector.

## 8. Final round — every deferred item closed or honestly bounded (19 Oct 2026)

**Closed in code:**
- **Public token tracking (L10):** `POST /api/public/track` (token number + registered mobile, generic 404, rate-limited) + `#track` section on landing with journey/queue/payment. Hero CTA now really tracks.
- **Live landing data (L3/L5):** `GET /api/public/centres` (real status incl. PAUSED + today's queue) and existing public crops feed the MSP table + centre cards; bundled mirror remains as fallback. `presentCentre`/`presentRequest` now expose `nameOr` (app Odia centre/crop names were silently falling back to English).
- **Native dialogs (A9):** all 14 `window.alert` + 5 `window.confirm` replaced by `components/Toast.jsx` (toasts + promise-based confirm, focus-managed). `window.location.reload` retries replaced with in-place refetch (server-change & crash reloads kept intentionally). NewRequest wizard draft persists across reload/app-kill.
- **Polling (A15):** in-flight GET de-duplication in the API client; `usePoll` exposes `updatedAt`/`stale`; Token shows the offline/stale banner and gains Share (Web Share API → clipboard fallback).
- **CSS & fonts (L22/S2):** stylesheets split by surface (landing/login/portal/mobile chunks, cascade order preserved) — initial CSS 246KB → ~73KB + 21KB landing; Latin/Oriya font subsets only (dist 3.1MB → 2.6MB).
- **Sunlight & touch (A12):** darker ink tokens, 12px minimum card labels, 48dp small buttons/stepper, 44dp chips.
- **Tablet/landscape (A11):** ≥720px layouts (920px page/tabbar, wider sheets/ticket grid), PWA orientation `any`.
- **Landing minors:** real `<table>` MSP (L20), rotating 4-message announcement fixing truncation (L14), mobile sticky Register/Call bar replacing the floating pill (L19/L21), menu Escape + focus return (L20), hero image dimensions (L18), FAQ/eligibility/documents section (L16), fewer register-funnel CTAs (L11), non-clickable cards no longer show link arrows (L15), robots.txt + sitemap.xml + canonical/og:url (L24), security headers in Express + `_headers` (L26).
- **A11y (A10):** Sheet moves/restores focus; stepper labels localized (`common.increase/decrease`); radio cards support arrow keys.
- **Skeletons (A17):** Home/History/Prices initial loads use `MSkeleton` instead of the full-screen brand loader.
- **Android (A18/A21/§7):** optional release signing via git-ignored `keystore.properties` (+ example file, minify/shrink when present), versionCode 3 / v1.2, monochrome themed icon, dead `drawable-v24` wheat vector deleted, adaptive-icon cream background (from §7).
- **Tests (S3):** backend public-API tests (now 51/51), `frontend/test/e2e/landing.spec.js` (logo, honesty, table, tracking, mobile CTA). i18n parity 832 keys × en/hi/or.
- **Screenshots (S1):** `00-app-icon.png` replaced with the real icon; `npm --prefix frontend run screenshots` recapture script + `screenshots/README.md` status note.
- `npm audit fix` (non-breaking) applied to frontend + backend.

**Bounded honestly (cannot be finished in code alone):**
- FCM push (A19) needs the owner's Firebase project + `google-services.json`; signed Play build needs the owner's keystore (scaffold ready, see `frontend/android/keystore.properties.example`).
- Screenshot recapture needs a local browser run of the new script (sandbox has no browser/Java).
- Remaining `npm audit` items require breaking major upgrades; 261 inline styles (A13) and dual web/mobile implementations (S4) are architectural refactors left for a dedicated cleanup.

**Verified:** `vite build` ✓ · backend tests 51/51 ✓ · i18n parity 832×3 ✓ · dev servers + new public endpoints live-checked ✓.

