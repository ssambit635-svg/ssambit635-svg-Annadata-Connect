# Security notes

## Project status

Annadata Connect is a **public hackathon/demo prototype**, not an operational procurement or government service. Its authentication is intentionally mocked: the Google account picker is simulated, OTP codes are shown to the user, and seeded accounts/data are demo fixtures. Anyone who can reach the demo can use the advertised demo accounts and make changes to the demo dataset. Do not enter real farmer, staff, identity, payment, phone, or email data, and do not rely on this app for real transactions or access control.

The seeded email addresses use the reserved `example.com` domain. The patterned phone numbers and names are test fixtures, not contacts. Demo passwords shown in project documentation are public by design and must never be reused for real accounts.

## Secrets and public repository

- The repository's `.gitignore` is meant to be committed. It tells Git which **untracked local files** (such as `.env`, local database data, signing keys and credentials) to leave out; it does not contain credentials and does not hide files that were already committed.
- `.env.example` files are templates, not secrets. Put real deployment values in the hosting provider's secret/environment-variable store. Never put secrets in `VITE_*` variables: Vite embeds those in public browser bundles.
- Do not commit real API keys, passwords, signing keys, tokens, private data, `.env` files, local databases or production APK signing material. If a real secret is ever committed, revoke/rotate it immediately; deleting the file in a later commit is not enough because Git history remains public.
- `JWT_SECRET` must be unique and at least 32 characters in production. Do not reuse the documented development/demo value.

## Checks performed

The locally available Git history and current tracked source were checked for common private-key, AWS, GitHub, Google, Stripe, Slack and JWT token patterns. No matching credentials were found in 753 blob versions across 52 commits. This is a pattern-based check, **not proof** that no secret or personal data exists; GitHub's secret scanning and a dedicated secret scanner should remain enabled.

Backend and frontend dependency audits report zero known vulnerabilities after the dependency updates in this branch. The repo-wide ESLint check, all 52 backend tests, frontend production build, Android Capacitor sync, and translation parity check pass. The browser E2E suite was not runnable in the sandbox because its Playwright Chromium binary was absent.

## Reporting

For a real security issue, avoid posting exploit details publicly. Use the repository's GitHub **Security → Advisories → Report a vulnerability** flow if private vulnerability reporting is enabled; otherwise contact the maintainers privately before creating a public issue.