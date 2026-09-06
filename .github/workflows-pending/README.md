# Enable the GitHub Actions workflows (one command)

These workflows were committed here because the Arena GitHub integration is not
allowed to create files under `.github/workflows/`. Move them once from your own
machine (or the GitHub web editor) and they start running:

```bash
git mv .github/workflows-pending/*.yml .github/workflows/
git commit -m "Enable Android APK + CI workflows" && git push
```

Then set the repo variable **`API_BASE_URL`** (Settings → Secrets and variables →
Actions → Variables) to your Render URL and run **Actions → Android APK**.
