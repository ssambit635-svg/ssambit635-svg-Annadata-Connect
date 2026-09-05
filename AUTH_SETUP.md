# Real sign-in setup

The login page offers **Google, SMS OTP, email OTP, and password** to farmers, officers,
and authorities. Google displays **Google's own account-selection UI**, not a local list
of pretend accounts. SMS and email codes must be verified before a session is issued.

**Provider accounts are not bundled.** With no credentials configured, the relevant
method says that administrator setup is needed. No code is simulated, printed to the
console, returned by the API, or included in the officer SMS outbox. Password access
continues to work for accounts with a password.

## 1. Google — your real Google accounts

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), configure
   the OAuth consent screen / Google Auth Platform branding and audience. While in
   testing, add the Google accounts that will test the app as test users.
2. Create an **OAuth 2.0 client ID → Web application**.
3. Add every exact frontend origin under **Authorized JavaScript origins**:
   - Local Vite: `http://localhost:5173` (and `http://127.0.0.1:5173` if used).
   - Local single-port build: `http://localhost:5000`.
   - Production: `https://your-actual-domain.example`.
   - Arena preview: copy the actual `https://<port>-<sandbox-id>.e2b.app` origin from
     the preview URL. Register it explicitly; wildcard origins do not work.
4. Set **only the backend** `GOOGLE_CLIENT_ID=<your-public-web-client-id>` and restart.
   The frontend reads it at runtime; no frontend rebuild or Google client secret is needed.
5. Open the app at the authorized origin, choose a role, and use the official Google
   button. Allow Google's cookies/pop-ups. If an embedded preview restricts pop-ups,
   open the preview in its own browser tab. The app cannot read/list your Google
   accounts itself; Google controls the account chooser.

The server verifies Google's signature, issuer, exact audience, expiry, verified email,
and a short-lived one-use nonce. Email text alone never counts as a Google credential.
A verified new farmer completes their name and village; new staff are **not** self-created.
For non-Gmail consumer Google accounts without a Workspace `hd` claim, use email OTP
instead to establish current email ownership. Google may have verified that third-party
address in the past but is not authoritative for it now. Such a Google email alone
cannot claim a provisioned staff account.

## 2. SMS OTP — Twilio Verify

1. Create a [Twilio](https://www.twilio.com/verify) account, then a **Verify Service**.
   Set the code length to **6 digits** and enable the SMS channel.
2. Allow the destination country (India) in Verify geographic permissions and configure
   fraud protections/spending alerts. Fund/upgrade your account as required. Trial
   accounts may only send to verified destinations; carrier, country, sender/DLT rules
   and Twilio account restrictions still apply. Real SMS is a paid provider service.
3. In the backend environment, set:

   ```dotenv
   AUTH_SMS_PROVIDER=twilio-verify
   SMS_TWILIO_SID=<account-SID>
   SMS_TWILIO_AUTH_TOKEN=<server-side-auth-token>
   TWILIO_VERIFY_SERVICE_SID=<verify-service-SID>
   ```

4. Restart, choose **Authority → SMS OTP** (also available for the other roles), enter
   your approved Indian mobile number, and request a code. Only a successful verification
   signs you in. New farmer numbers are directed to verified profile registration.

OTP requests use Twilio **Verify**, not the existing procurement notification sender.
`SMS_PROVIDER=sim` does **not** simulate authentication. `SMS_TWILIO_FROM` is only for
procurement messages, not Verify. Twilio may reuse a code within its verification
window; the app replaces the challenge ID on resend and accepts a challenge for at
most **5 minutes**. A provider accepting a request is not a guarantee of carrier delivery.

## 3. Email OTP — authenticated SMTP

Configure your own transactional email provider and verify its sending domain/address.
Use provider-specific SMTP credentials; some mailbox providers require an app password.
Set SPF/DKIM/DMARC with the provider to improve delivery.

```dotenv
AUTH_EMAIL_PROVIDER=smtp
SMTP_HOST=<provider-SMTP-host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<SMTP-user>
SMTP_PASSWORD=<SMTP-secret>
SMTP_FROM=Annadata Connect <verified-sender@your-domain.example>
```

Port 587 requires STARTTLS; port 465 uses `SMTP_SECURE=true`. TLS validation is never
disabled. Restart the backend, choose **Email OTP**, and check your inbox/spam folder.
The app generates cryptographically random six-digit codes and stores only a
challenge-bound keyed hash in memory for five minutes. Email delivery is awaited,
not fire-and-forget; a provider failure does not show a successful-send state.

**Existing farmers:** sign in with your current method, open your account menu →
**Sign-in & contact details** → **Add & verify** next to email. Verify the email code.
You can then use that email OTP (or matching Gmail/Workspace Google account) to sign in to
**the same farmer profile**. Email/Google-only farmers can similarly link a mobile.
There is no automatic account merge or unauthenticated contact linking.

## 4. Approve officer / authority identities

Real identity verification does not establish government employment or grant privileges.
A trusted operator must provision staff contacts and scope. With the **backend stopped**
(the JSON store does not support simultaneous CLI and server writes), run:

```bash
npm --prefix backend run auth:provision -- \
  --role authority --name "Approved District Administrator" \
  --email "approved.person@example.org" --phone "9876543210" --district "Khordha"

npm --prefix backend run auth:provision -- \
  --role officer --name "Approved Procurement Officer" \
  --email "approved.officer@example.org" --phone "9876543211" \
  --district "Khordha" --centre-id "centre-bbsr-central"
```

Replace the example contacts with the actual staff member's approved details. At least
one of phone/email is required. Use the user's exact Google email if Google sign-in is
desired. No default centre or authority role is assigned by a public endpoint.
Use `--user-id <id>` to explicitly re-provision an old non-demo staff account after
checking their authority; this replaces their contacts and removes prior Google/password
credentials. Restart the backend after provisioning. Rotate `JWT_SECRET` when revoking
or re-provisioning access if existing sessions must be invalidated immediately.

## 5. Deploy safely

- Put all provider credentials in **backend/.env or your host's secret settings**;
  never chat, frontend `VITE_*` variables, source control, or screenshots.
- Set `NODE_ENV=production`, `ALLOW_DEMO_LOGIN=false`, a unique random `JWT_SECRET`
  (at least 32 characters), HTTPS, and restricted `CORS_ORIGIN` for split hosting.
- Google and provider settings are runtime backend settings. Restart after changes.
- `GET /api/auth/options` reports configuration presence, **not provider health**.
  Bad credentials, trial restrictions, sender approval, or delivery outages can still
  make a configured provider fail; the UI reports those failures.
- Configure `TRUST_PROXY` to the **exact trusted hop count** behind your reverse proxy,
  and prevent direct access to the backend. Default `0` ignores forwarded IPs. Never
  blindly trust user-supplied `X-Forwarded-For` headers.
- Codes expire after five minutes, have five attempts per challenge, a 60-second
  resend cooldown, at most five sends and fifteen checks per contact per hour,
  and additional IP-based rate limits. Changing a role does not reset contact limits.
- A new send replaces the old challenge. OTPs, Google nonces, and profile tickets are
  single-use. Profile tickets expire in ten minutes and cannot call protected APIs.
- Existing sessions from the old unverified phone/Google-demo flow are invalidated.
  Legacy self-created staff accounts require re-provisioning. Legacy shared `Kisan@123`
  walk-in passwords are removed; walk-in farmers must verify their mobile to claim access.
- Seed accounts are **sample data only**; real providers never sign into them. Their
  password logins are disabled by default in production. `ALLOW_DEMO_LOGIN=true` is
  only for an isolated demonstration with no real user data or live provider accounts.
- The current JSON database, in-memory verification state and in-memory rate limits
  are for **one backend process**. A restart invalidates pending challenges. Before
  multi-instance/large-scale deployment, use transactional persistent user storage
  and a shared atomic TTL/rate-limit store such as Redis. Use persistent disk for
  the JSON database even for a single-node pilot. Session JWTs still use the app's
  existing browser storage; HTTP-only session cookies, revocation and broader
  production security review remain recommended hardening work.

## Checks

```bash
npm --prefix backend test
npm --prefix frontend run build
# Browser tests (uses mocked external delivery, never sends billable SMS):
cd frontend && npx playwright install chromium && npm run test:e2e
```

Automated tests check request/verify/profile flows, real cryptographic Google token
validation with local test keys, nonce replay, expiry, throttling, provider failures,
contact linking, legacy bypass removal and staff authorization. They do not claim
live-provider delivery. After configuring your providers, smoke-test all three roles
with approved real accounts and an actual phone/inbox, including a wrong/expired code.
