import { test, expect } from '@playwright/test';

// Browser contract tests mock external responses ONLY here; no production demo OTP.
async function mockApi(page, settings = {}) {
  const calls = [];
  let user = { id: 'farmer-test', name: 'Test Farmer', role: 'farmer', phone: '9876543210', phoneVerified: true, ...settings.user };
  let challenge = 0;
  const session = () => ({ user, token: 'browser-test-session' });
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    calls.push({ path, body });
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    if (path === '/api/auth/options') return json({ google: { enabled: false, clientId: null }, sms: { enabled: true }, email: { enabled: true }, password: { enabled: true }, demoEnabled: false, ...settings.options });
    if (path === '/api/auth/google/challenge') return json({ nonce: `test-nonce-${++challenge}`, challengeId: `google-${challenge}`, expiresInSeconds: 300 });
    if (path === '/api/auth/google') { user = { ...user, role: body.role }; return json(session()); }
    if (path.endsWith('/otp/request') || path.endsWith('/contact/request')) {
      if (settings.sendFailure) return json({ error: { code: 'AUTH_DELIVERY_FAILED', message: 'Provider unavailable' } }, 502);
      return json({ challengeId: `challenge-${++challenge}`, channel: body.channel, destination: body.channel === 'sms' ? '+91 ••••••3210' : 'f•••@example.com', expiresInSeconds: 300, retryAfterSeconds: 60 });
    }
    if (path.endsWith('/otp/verify') || path.endsWith('/contact/verify')) {
      if (body.code !== '001234') return json({ error: { code: 'AUTH_OTP_INVALID', message: 'Incorrect code.', details: { attemptsRemaining: 4 } } }, 401);
      if (path.endsWith('/contact/verify')) { user = { ...user, email: 'farm@example.com', emailVerified: true }; return json({ user }); }
      if (settings.newFarmer) return json({ registrationRequired: true, registrationToken: 'profile-proof', profile: { email: 'farm@example.com', name: '' }, expiresInSeconds: 600 });
      user = { ...user, role: body.role };
      return json(session());
    }
    if (path === '/api/auth/register') { user = { ...user, name: body.name, email: 'farm@example.com', role: 'farmer', emailVerified: true }; return json(session(), 201); }
    if (path === '/api/auth/login') {
      if (body.password !== 'SecurePassword123') return json({ error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Incorrect credentials' } }, 401);
      user = { ...user, role: body.role };
      return json(session());
    }
    if (path === '/api/auth/me') return json({ user });
    if (path === '/api/reference/villages') return json({ villages: [{ id: 'v-baranga', nameEn: 'Baranga', nameHi: 'बारंगा' }] });
    if (path === '/api/farmers/me') return json({ profile: user, activeRequest: null, activeQueue: null });
    if (path === '/api/notifications') return json({ notifications: [], unreadCount: 0 });
    if (path === '/api/authority/overview') return json({ district: 'Khordha', totals: { farmersToday: 0, waiting: 0, completed: 0, procuredQuintals: 0, openCentres: 0, totalCentres: 0 }, centres: [] });
    return json({ error: { code: 'TEST_UNMOCKED', message: 'Test API resource not provided.' } }, 404);
  });
  return calls;
}

const pageErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

test('every role has Google, SMS, email and password options, with no fake chooser', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  for (const role of ['Farmer', 'Officer', 'Authority']) {
    await page.getByRole('button', { name: role, exact: true }).click();
    await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SMS OTP', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Email OTP', exact: true }).click();
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'SMS OTP', exact: true }).click();
    await expect(page.getByLabel('Mobile number', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('district.admin.anc@gmail.com')).toHaveCount(0);
});

test('missing provider configuration disables real sign-in without claiming delivery', async ({ page }) => {
  const calls = await mockApi(page, { options: { sms: { enabled: false }, email: { enabled: false } } });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Send SMS code' })).toBeDisabled();
  await expect(page.getByText(/administrator needs to connect the SMS provider/)).toBeVisible();
  await page.getByRole('button', { name: 'Email OTP' }).click();
  await expect(page.getByRole('button', { name: 'Send email code' })).toBeDisabled();
  expect(calls.some((call) => call.path.endsWith('/otp/request'))).toBe(false);
  await expect(page.getByText('Explore demo accounts')).toHaveCount(0);
});

test('authority SMS requires request then verification, preserves leading zeros, and navigates correctly', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByLabel('Mobile number', { exact: true }).fill('+91 98765 43210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your phone' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('ks-auth'))).toBeNull();
  await page.getByLabel('6-digit verification code').fill('999999');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('alert')).toContainText('Incorrect code');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('6-digit verification code').fill('001234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page).toHaveURL(/\/authority$/);
  await expect(page.getByRole('heading', { name: 'District Overview', exact: true })).toBeVisible();
  expect(calls.find((call) => call.path.endsWith('/otp/request')).body).toEqual({ destination: '9876543210', channel: 'sms', role: 'authority' });
  expect(calls.filter((call) => call.path.endsWith('/otp/verify')).at(-1).body.code).toBe('001234');
});

test('SMS provider failure does not show code-entry or store a session', async ({ page }) => {
  await mockApi(page, { sendFailure: true });
  await page.goto('/login');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByRole('alert')).toContainText('could not process your request');
  await expect(page.getByLabel('6-digit verification code')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('ks-auth'))).toBeNull();
});

test('OTP resend and expiry timers prevent stale-code submission', async ({ page }) => {
  await page.clock.install();
  const calls = await mockApi(page);
  await page.goto('/login');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByLabel('6-digit verification code')).toBeVisible();
  await page.clock.fastForward(61000);
  await page.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  expect(calls.filter((call) => call.path.endsWith('/otp/request'))).toHaveLength(2);
  await page.clock.fastForward(301000);
  await expect(page.getByText(/This verification is no longer valid/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify & continue' })).toBeDisabled();
  await page.getByRole('button', { name: 'Change number' }).click();
  await expect(page.getByLabel('Mobile number', { exact: true })).toBeVisible();
});

test('new farmer email registration verifies first and completes a real profile contract', async ({ page }) => {
  const calls = await mockApi(page, { newFarmer: true });
  await page.goto('/register');
  await expect(page.getByRole('button', { name: 'Authority', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Email OTP' }).click();
  await page.getByLabel('Email address', { exact: true }).fill('farm@example.com');
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await page.getByLabel('6-digit verification code').fill('001234');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Make yourself at home' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ks-auth'))).toBeNull();
  await page.getByLabel('Full name', { exact: true }).fill('Meera Farmer');
  await page.getByLabel('Your village', { exact: true }).selectOption('v-baranga');
  await page.getByLabel('Set a password (optional)', { exact: true }).fill('SecurePassword123');
  await page.getByRole('button', { name: 'Create account & continue' }).click();
  await expect(page).toHaveURL(/\/farmer$/);
  await expect(page.getByRole('heading', { name: 'Namaste, Meera Farmer' })).toBeVisible();
  expect(calls.find((call) => call.path.endsWith('/register')).body.registrationToken).toBe('profile-proof');
});

test('password fallback works for staff, has visibility control, and can switch to OTP', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.getByLabel('Mobile number or email', { exact: true }).fill('authority@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrongPassword');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('selected role');
  await page.getByRole('button', { name: /Forgot password/ }).click();
  await expect(page.getByLabel('Mobile number', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Password', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill('SecurePassword123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/authority$/);
});

test('Google SDK loads once and sends its credential with current role and nonce challenge', async ({ page }) => {
  let sdkRequests = 0;
  await page.route('https://accounts.google.com/gsi/client', (route) => {
    sdkRequests++;
    return route.fulfill({ contentType: 'application/javascript', body: `
      window.google = { accounts: { id: {
        initialize(config) { this.config = config; },
        renderButton(element) {
          const button = document.createElement('button');
          button.textContent = 'Google SDK test button';
          button.type = 'button';
          button.onclick = () => this.config.callback({ credential: 'google-issued-test-credential' });
          element.appendChild(button);
        }
      } } };
    ` });
  });
  const calls = await mockApi(page, { options: { google: { enabled: true, clientId: 'public-google-client' } } });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Google SDK test button' })).toBeVisible();
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByRole('button', { name: 'Google SDK test button' }).click();
  await expect(page).toHaveURL(/\/authority$/);
  const call = calls.find((entry) => entry.path === '/api/auth/google');
  expect(call.body.role).toBe('authority');
  expect(call.body.credential).toBe('google-issued-test-credential');
  expect(call.body.challengeId).toMatch(/^google-/);
  expect(call.body.email).toBeUndefined();
  expect(sdkRequests).toBe(1);
});

test('Google script failure presents a useful retry instead of a fake chooser', async ({ page }) => {
  await page.route('https://accounts.google.com/gsi/client', (route) => route.abort());
  await mockApi(page, { options: { google: { enabled: true, clientId: 'public-google-client' } } });
  await page.goto('/login');
  await expect(page.getByRole('alert')).toContainText('Google could not load');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('existing farmer can add a verified email without creating a duplicate profile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ks-auth', JSON.stringify({ token: 'browser-test-session', user: { id: 'farmer-test', name: 'Test Farmer', role: 'farmer', phone: '9876543210', phoneVerified: true } })));
  const calls = await mockApi(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Add & verify', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill('farm@example.com');
  await page.getByRole('button', { name: 'Send email code' }).click();
  await page.getByLabel('6-digit verification code').fill('001234');
  await page.getByRole('button', { name: 'Verify & link contact' }).click();
  await expect(page.getByRole('status')).toContainText('Contact verified and linked');
  await expect(page.locator('.account-contact-list')).toContainText('farm@example.com');
  expect(calls.some((entry) => entry.path === '/api/auth/register')).toBe(false);
});

test('login remains usable on narrow mobile screens and in Hindi', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/login');
  await page.getByRole('button', { name: 'हिन्दी', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'आपका स्वागत है' })).toBeVisible();
  await page.getByRole('button', { name: 'ईमेल OTP', exact: true }).click();
  await expect(page.getByLabel('ईमेल पता', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});
