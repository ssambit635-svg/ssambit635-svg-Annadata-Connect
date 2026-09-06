# Why are the workflows parked here?

GitHub requires the `workflows` permission to create/update files in
`.github/workflows/`. The automated (Arena) GitHub integration that pushes this
repository does **not** have that permission, so it cannot ship these files to
the default branch itself.

**One-time enable (2 minutes, free):** from your own machine, in a checkout of
this repo on `main`:

```bash
npm run enable:workflows        # moves the .yml files into .github/workflows/
git commit -am "Enable GitHub Actions"
git push origin main
```

That's it — from then on everything is automatic:

| Workflow | What it does | Cost |
| --- | --- | --- |
| `android-apk.yml` | Every push to `main` (or manual run) builds the Android APK on GitHub's free runners **and** publishes/updates a rolling release at `…/releases/latest/download/annadata-connect-latest.apk` — the URL behind the "Download APK (free)" button on the landing page. Pushing a `v*` tag creates a permanent numbered release too. | $0 |
| `ci.yml` | Runs backend tests (43), the i18n en/hi/or parity check and the frontend production build on every push/PR. | $0 |
| `keep-awake.yml` | Pings `API_BASE_URL` (repo variable) every 10 minutes so a free Render backend never cold-starts during a demo. | $0 |

After enabling, also set the repo **variable** `API_BASE_URL` =
`https://<your-app>.onrender.com` (Settings → Secrets and variables → Actions →
Variables) so the APK knows which backend to call. Users can still repoint an
installed APK from inside the app (login screen → ⚙ Server address).
