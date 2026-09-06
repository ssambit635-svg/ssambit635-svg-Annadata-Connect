# The $0 stack — ship Annadata Connect for free

| Layer | Free service | Why |
| --- | --- | --- |
| **APK build** | GitHub Actions (`.github/workflows-pending/android-apk.yml` → enable once with `npm run enable:workflows`) — `ubuntu-24.04` has JDK + Android SDK 36 preinstalled | Unlimited minutes on a public repo, 2 000 min/mo on private; one build ≈ 5–10 min |
| **APK download** | Automatic rolling **GitHub Release** (`latest-apk`) updated on every `main` build | Stable public URL, no login: `…/releases/latest/download/annadata-connect-latest.apk` — the same URL the landing-page **Download APK (free)** button uses |
| **Install** | Sideload the APK (or install the PWA) | $0 forever. Play Store ($25 + 12 testers × 14 days) is explicitly *out of scope* |
| **Backend** | Render free web service (`render.yaml`) | No card. Sleeps after 15 min, 750 instance-hrs/month |
| **Data** | JSON store re-seeded on boot (`SEED_ON_BOOT=true`) | Data resets on each restart — accepted for the MVP. (Turso/libSQL is the free upgrade path later.) |
| **Frontend (optional)** | Netlify / Cloudflare Pages (`netlify.toml`, `frontend/public/_redirects`) | Static, never sleeps. Not required — Render serves the UI too |
| **Keep-awake** | cron-job.org / UptimeRobot → `GET /api/health` every 10 min (plus `.github/workflows/keep-awake.yml`) | Kills cold starts during a demo |
| **PWA** | `manifest.webmanifest` + `sw.js` | Installable from Chrome even without the APK; last data survives offline |

---

## 1. Backend on Render (5 min)

1. Push this repo to GitHub.
2. Render → **New +** → **Blueprint** → pick the repo. `render.yaml` provisions the
   free Docker web service (region: Singapore, health check `/api/health`).
3. Wait for the first deploy, then note the URL, e.g. `https://annadata-connect.onrender.com`.
   Open it — the full web app (UI + API) runs there.

> Free tier = no persistent disk. Every restart re-seeds the demo data. Fine for the MVP.

## 2. Keep it awake (2 min)

* **cron-job.org** (free): create a job → URL `https://<app>.onrender.com/api/health`, every **10 minutes**.
* or **UptimeRobot** (free): HTTP monitor, 5-minute interval.
* Bonus: set the GitHub repo variable `API_BASE_URL` and the `keep-awake.yml`
  workflow pings it every 10 min too.

The UI also shows a *"Waking up the server…"* banner whenever a request takes > 4 s,
so a cold start never looks like a crash.

## 3. Build the APK on GitHub Actions ($0)

0. **One-time (owner, ~2 min):** the workflow files live in `.github/workflows-pending/`
   because the Arena integration cannot write to `.github/workflows/`. Enable them from
   your own machine once:
   `npm run enable:workflows && git commit -am "Enable workflows" && git push`
1. GitHub → repo **Settings → Secrets and variables → Actions → Variables** →
   `New repository variable`: **`API_BASE_URL`** = `https://<app>.onrender.com`.
2. Push to `main` (or **Actions → Android APK → Run workflow**).
3. ~6 min later the APK is **already downloadable for free** from the rolling release:
   `https://github.com/<you>/<repo>/releases/latest/download/annadata-connect-latest.apk`
   — that stable link is what the landing page's **Download APK (free)** button opens,
   and it always points at the newest build (no login, no 30-day expiry). Every run also
   keeps the `annadata-connect-debug-apk` **artifact** (Actions → run → Artifacts), and
   pushing a tag like `v1.0.0` creates a permanent numbered release.

Sideload: copy the `.apk` to the phone → tap it → allow *Install unknown apps* → open
**Annadata Connect**. The app is a Capacitor WebView of the same React frontend,
talking to your Render backend over HTTPS.

Need to point an already-installed APK at a different backend? On the login screen tap
**⚙ Server address**, paste the URL, Save. (Stored locally; no rebuild.)

### Build locally instead (optional)

```bash
cd frontend
VITE_API_BASE_URL=https://<app>.onrender.com npm run android:apk
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Requires JDK 17+ and the Android SDK (`ANDROID_HOME`). `npm run android:open` opens Android Studio.

## 4. (Optional) Frontend on Netlify / Cloudflare Pages

Not required — Render already serves the UI — but a static host never sleeps, so the
landing page is instant even when the API is cold.

* **Netlify**: import repo → it reads `netlify.toml`. Add env `VITE_API_BASE_URL=https://<app>.onrender.com`.
* **Cloudflare Pages**: root dir `frontend`, build `npm run build`, output `dist`,
  env `VITE_API_BASE_URL=https://<app>.onrender.com`. `_redirects` handles SPA routing.

Then set `CORS_ORIGIN` on Render to your Pages URL (comma-separated list) — or leave
it empty to allow any origin for the MVP.

## 5. PWA (installable without the APK)

Open the site in Chrome on Android → ⋮ → **Install app**. The service worker
caches the shell and the last API responses, so the dashboard still renders offline.
Inside the APK the service worker is disabled (Capacitor bundles the assets itself).

## Languages

The UI ships in **English · हिंदी · ଓଡ଼ିଆ**. The toggle is in the landing top bar,
the portal header, and the account menu; the choice is remembered on the device and
also stored as `preferredLanguage` on new farmer accounts. All API reference data
(crops, villages, centres, buyers, mandi labels) carries `nameEn / nameHi / nameOr`.
