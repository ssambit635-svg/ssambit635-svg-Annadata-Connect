// Recapture the repo screenshots from the CURRENT UI.
// The checked-in screenshots predate the Annadata Connect rebrand; run this
// locally (needs a real browser download, which CI/sandboxes may block):
//
//   npm run dev:backend          # terminal 1
//   npm run dev:frontend         # terminal 2
//   npm --prefix frontend run screenshots
//
// Output goes to ../../screenshots/. Authenticated screens are captured by
// test/e2e flows separately; this script covers the public surfaces and the
// app's first screen, which are what the README/PPT show first.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173';
const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../screenshots');
fs.mkdirSync(path.join(outDir, 'saathi'), { recursive: true });

const browser = await chromium.launch();
async function shot(name, url, { width = 1365, height = 980, fullPage = false, waitFor } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`${base}${url}`, { waitUntil: 'networkidle' });
  if (waitFor) await page.locator(waitFor).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, name), fullPage });
  console.log('captured', name);
  await page.close();
}

await shot('landing-top.png', '/', { waitFor: '.home-hero' });
await shot('landing-msp.png', '/#msp', { waitFor: 'table.home-rate-table' });
await shot('landing-centres.png', '/#centres', { waitFor: '.home-centre-card' });
await shot('landing-track.png', '/#track', { waitFor: '.home-track-form' });
await shot('landing-mobile.png', '/', { width: 390, height: 844, fullPage: true, waitFor: '.home-hero' });
await shot('login.png', '/login', { waitFor: '.signin-brand' });
await shot('saathi/01-welcome.png', '/?app=1', { width: 390, height: 844, waitFor: '.m-welcome, .m-root' });

await browser.close();
console.log('Done. Review the PNGs before committing — delete any that still show stale states.');
