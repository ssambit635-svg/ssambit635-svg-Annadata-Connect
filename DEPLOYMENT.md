# Annadata Connect — Production Deployment Guide

The app is designed as a **single service**: Express serves the built React app **and** the API on
one port, so deployments need no CORS juggling and no separate frontend host.

Three supported paths — pick one:

| Option | Effort | Cost | Best for |
|---|---|---|---|
| **A. Managed PaaS (Render/Railway)** — Docker blueprint | Lowest | Free–$7/mo | Go live in ~15 min |
| **B. VPS (Ubuntu + PM2 + Nginx)** — full control | Medium | ~₹400–800/mo | Production within government/institutional infra |
| **C. Docker on any host** (self-run) | Medium | varies | When you already have containers/VMs |

---

## Step 0 — Get the code on your machine

1. Download `kis ansathi.zip` from the workspace root (created for this purpose), unzip it.
2. Verify locally:

```bash
cd annadata-connect
npm run setup          # installs backend + frontend deps
npm run build          # builds frontend into frontend/dist
npm start              # serves everything on http://localhost:5000
```

3. For an isolated demo, enable `ALLOW_DEMO_LOGIN=true` and use the matching role + Password method
   (farmer `9999999001 / Farmer@123`). For real sign-ins, follow [AUTH_SETUP.md](AUTH_SETUP.md).

## Step 1 — Put it on GitHub (recommended)

```bash
cd annadata-connect
git init
git add .
git commit -m "Annadata Connect MVP"
git remote add origin https://github.com/<you>/kis ansathi.git
git push -u origin main
```

`.gitignore` already excludes secrets, `node_modules`, and the runtime database.

---

## Option A — Render.com (fastest, uses `render.yaml` already in the repo)

1. Push the repo to GitHub (Step 1).
2. On Render: **New + → Blueprint → select your repo**. Render reads `render.yaml` and builds the
   `Dockerfile` itself — nothing else to configure.
3. When deploy finishes, open the `https://annadata-connect-xxxx.onrender.com` URL → login page loads.
4. Health check is `/api/health` (already configured).

> ⚠️ Render's **free** plan has an ephemeral filesystem: the JSON database resets on every deploy
> and the service sleeps when idle. For anything real, use a paid plan and uncomment the `disk:`
> block in `render.yaml` (persistent data), or better — do the Postgres step (§ Hardening).

**Railway.app** is equivalent: **New Project → Deploy from GitHub → Dockerfile detected** → done.

---

## Option B — VPS (Ubuntu 22.04/24.04, e.g. any cloud VM)

```bash
# 1. On the server
# Install Node.js 22 LTS (or newer) and npm from your trusted Node distribution first.
node --version   # must be 22+ for the Google authentication SDK
sudo apt update && sudo apt install -y nginx
sudo npm install -g pm2

# 2. Pull the code
git clone https://github.com/<you>/kis ansathi.git
cd annadata-connect
npm run setup && npm run build

# 3. Configure production env
cat > backend/.env <<EOF
PORT=5000
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
SEED_ON_BOOT=true
ALLOW_DEMO_LOGIN=false
TRUST_PROXY=1
CORS_ORIGIN=
EOF

# 4. Run under a process manager with auto-restart
pm2 start backend/src/index.js --name annadata-connect
pm2 save && pm2 startup     # follow the printed command once

# 5. Put Nginx in front (also gives you TLS)
sudo tee /etc/nginx/sites-available/annadata-connect <<'EOF'
server {
    listen 80;
    server_name your-domain.gov.in;          # or server IP for now
    client_max_body_size 1m;
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/annadata-connect /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. Free HTTPS (needs your DNS A-record pointing to the server first)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.gov.in
```

Open `https://your-domain.gov.in`. Deploying an update later is:

```bash
cd annadata-connect && git pull && npm run build && pm2 restart annadata-connect
```

---

## Option C — Docker anywhere

```bash
cd annadata-connect
docker build -t annadata-connect .
docker run -d --name annadata-connect \
  -p 80:5000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -e SEED_ON_BOOT=true \
  -v annadata-connect-data:/app/backend/data \     # persist the database
  annadata-connect
# open http://localhost  (or the host's address)
```

Behind a reverse proxy/step 5 above, terminate TLS there as usual.

---

## Hardening checklist (before real users)

1. **Database** — the JSON store (`backend/data/db.json`) is single-writer demo-grade. For real
   production, migrate `backend/src/db/store.js` to PostgreSQL (routes/services unchanged). If
   staying on JSON short-term: mount a persistent volume and schedule backups (nightly cron copy).
2. **Secrets and identity** — set a unique random `JWT_SECRET` of at least 32 characters and
   keep `ALLOW_DEMO_LOGIN=false`. Configure Google/Twilio Verify/SMTP and provision approved
   staff using [AUTH_SETUP.md](AUTH_SETUP.md). Walk-in farmers claim access by SMS verification,
   not a shared default password. Provider settings are backend runtime secrets.
3. **CORS** — leave empty (same-origin, single service). Only set `CORS_ORIGIN=https://your-domain`
   if you ever host the frontend separately; then rebuild the frontend with
   `VITE_API_BASE_URL=https://api.your-domain` (Vite env vars are **build-time**).
4. **Data** — replace demo centres/crops/villages/MSP in `backend/src/data/seed-data.js` with your
   district's real data, then `npm run seed` once. Set `SEED_ON_BOOT=false` afterwards if you don't
   want missing-file auto-seeds.
5. **HTTPS** — mandatory; cookies aren't used, but the JWT travels in an `Authorization` header on
   every request.
6. **Monitoring** — health probe `/api/health`; `pm2 monit` or uptime alerts (UptimeRobot et al.).
7. **Rate limiting** — auth endpoints already enforce IP and contact limits. Configure the
   exact trusted proxy chain (`TRUST_PROXY`), and use a shared atomic verification/rate-limit
   store before running multiple replicas. Pending codes are intentionally lost on restart.

## Verify the deployment

```bash
curl https://your-domain/api/health
curl https://your-domain/api/auth/options
```

Check that provider availability matches your setup (availability reflects configuration,
not provider health). With actual approved accounts, test Google account selection, SMS
and email code delivery, rejected/expired codes, and correct-role dashboard navigation.
Never enable sample passwords on a deployment holding real user data. Google authorized
origins must exactly match the browser URL, including a remote preview origin.

Finally, create a farmer request and complete it as an approved officer. Confirm the
farmer sees status updates. Authentication provider activation is not a substitute for
testing the procurement workflow and production storage/security requirements.
