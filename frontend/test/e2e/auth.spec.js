import { test, expect } from '@playwright/test';

// Browser contract tests for the mocked sign-in: the fake Google picker and the
// on-screen OTP codes. Nothing here talks to Google, Twilio or an SMTP server.
const ACCOUNTS = [
  { sub: 'mock-google-farmer-bijay', role: 'farmer', name: 'Bijay Pradhan', email: 'bijay.pradhan.anc@gmail.com', detail: 'ANC-F-0001 · Baranga' },
  { sub: 'mock-google-farmer-kuni', role: 'farmer', name: 'Kuni Sahoo', email: 'kuni.sahoo.anc@gmail.com', detail: 'ANC-F-0002 · Harirajpur' },
  { sub: 'mock-google-officer-rashmi', role: 'officer', name: 'Rashmi Das', email: 'rashmi.das.anc@gmail.com', detail: 'Bhubaneswar Central centre' },
  { sub: 'mock-google-authority-suresh', role: 'authority', name: 'Suresh Patnaik', email: 'district.admin.anc@gmail.com', detail: 'District Administration · Khordha' },
];
const MOCK_CODE = '001234';

async function mockApi(page, settings = {}) {
  const calls = [];
  let user = { id: 'farmer-test', name: 'Test Farmer', role: 'farmer', phone: '9876543210', phoneVerified: true, ...settings.user };
  let challenge = 0;
  const session = () => ({ user, token: 'browser-test-session' });
  const accounts = settings.accounts ?? ACCOUNTS;
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    calls.push({ path, body });
    const json = (data, status = 200) => route.fulfill({ status, json: data });
    if (path === '/api/auth/options') {
      return json({
        mock: true,
        google: { enabled: true, mock: true, accounts },
        sms: { enabled: true, mock: true },
        email: { enabled: true, mock: true },
        password: { enabled: true },
        demoEnabled: false,
        ...settings.options,
      });
    }
    if (path === '/api/auth/google') {
      const account = accounts.find((entry) => entry.email === body.email && entry.role === body.role);
      if (!account) return json({ error: { code: 'AUTH_GOOGLE_INVALID', message: 'Unknown mock Google account.' } }, 401);
      user = { ...user, role: account.role, name: account.name, email: account.email, emailVerified: true };
      return json(session());
    }
    if (path.endsWith('/otp/request') || path.endsWith('/contact/request')) {
      if (settings.sendFailure) return json({ error: { code: 'AUTH_RATE_LIMITED', message: 'Too many verification requests.' } }, 429);
      return json({
        challengeId: `challenge-${++challenge}`, channel: body.channel, mockCode: MOCK_CODE,
        destination: body.channel === 'sms' ? '+91 ••••••3210' : 'f•••@example.com',
        expiresInSeconds: 300, retryAfterSeconds: 60,
      });
    }
    if (path.endsWith('/otp/verify') || path.endsWith('/contact/verify')) {
      if (body.code !== MOCK_CODE) return json({ error: { code: 'AUTH_OTP_INVALID', message: 'Incorrect code.', details: { attemptsRemaining: 4 } } }, 401);
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

test('every role has mock Google, SMS, email and password options', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  for (const role of ['Farmer', 'Officer', 'Authority']) {
    await page.getByRole('button', { name: role, exact: true }).click();
    await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Fake Google sign-in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SMS OTP', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Email OTP', exact: true }).click();
    await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Password', exact: true }).click();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'SMS OTP', exact: true }).click();
    await expect(page.getByLabel('Mobile number', { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('dialog')).toHaveCount(0); // the picker opens only on click
});

test('the fake Google picker lists only the sample accounts for the chosen role', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByRole('button', { name: /Sign in with Google/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Choose an account' })).toBeVisible();
  await expect(dialog.getByText('district.admin.anc@gmail.com')).toBeVisible();
  await expect(dialog.getByText('bijay.pradhan.anc@gmail.com')).toHaveCount(0);
  await expect(dialog.getByText('MOCK DATA')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Farmer', exact: true }).click(); // role-scoped list
  await page.getByRole('button', { name: /Sign in with Google/ }).click();
  await expect(page.getByRole('dialog').getByText('bijay.pradhan.anc@gmail.com')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('kuni.sahoo.anc@gmail.com')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('district.admin.anc@gmail.com')).toHaveCount(0);
});

test('picking a mock Google account signs in with { role, email } and never loads Google', async ({ page }) => {
  const googleRequests = [];
  page.on('request', (request) => { if (request.url().includes('accounts.google.com')) googleRequests.push(request.url()); });
  const calls = await mockApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByRole('button', { name: /Sign in with Google/ }).click();
  await page.getByRole('dialog').getByText('district.admin.anc@gmail.com').click();
  await expect(page).toHaveURL(/\/authority$/);
  await expect(page.getByRole('heading', { name: 'District Overview', exact: true })).toBeVisible();
  const call = calls.find((entry) => entry.path === '/api/auth/google');
  expect(call.body).toEqual({ role: 'authority', email: 'district.admin.anc@gmail.com' });
  expect(calls.some((entry) => entry.path === '/api/auth/google/challenge')).toBe(false);
  expect(googleRequests).toEqual([]);
});

test('the fake Google switch disables the picker and the choice survives a reload', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/login');
  await expect(page.getByRole('switch', { name: 'Fake Google sign-in' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: 'Fake Google sign-in' }).click();
  await expect(page.getByRole('switch', { name: 'Fake Google sign-in' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeDisabled();
  await expect(page.getByText(/Fake Google sign-in is switched off/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeDisabled();
  await page.getByRole('switch', { name: 'Fake Google sign-in' }).click();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeEnabled();
  await page.getByRole('button', { name: /Sign in with Google/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(calls.some((entry) => entry.path === '/api/auth/google')).toBe(false);
});

test('a rejected mock Google account surfaces an error and keeps the user on the login page', async ({ page }) => {
  await mockApi(page, { accounts: [{ sub: 'only', role: 'farmer', name: 'Only Farmer', email: 'only.farmer.anc@gmail.com' }] });
  await page.goto('/login');
  await page.getByRole('button', { name: /Sign in with Google/ }).click();
  await page.getByRole('dialog').getByText('only.farmer.anc@gmail.com').click();
  await expect(page.getByRole('alert')).toContainText('mock Google account is not available');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('ks-auth'))).toBeNull();
});

test('a role with no sample accounts explains itself instead of failing silently', async ({ page }) => {
  await mockApi(page, { accounts: ACCOUNTS.filter((account) => account.role === 'farmer') });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await expect(page.getByText('No sample Google accounts for this role yet.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign in with Google/ })).toBeDisabled();
});

test('mock SMS shows the generated code on screen, Fill copies it, and it signs in', async ({ page }) => {
  const calls = await mockApi(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Authority', exact: true }).click();
  await page.getByLabel('Mobile number', { exact: true }).fill('+91 98765 43210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByRole('heading', { name: 'Check the mock SMS' })).toBeVisible();
  await expect(page.getByText('Mock SMS · your code')).toBeVisible();
  await expect(page.locator('.mock-code-value')).toHaveText(MOCK_CODE);
  await expect(page.getByText(/No real message was sent/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('ks-auth'))).toBeNull();
  await page.getByLabel('6-digit verification code').fill('999999');
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page.getByRole('alert')).toContainText('Incorrect code');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  await expect(page.getByLabel('6-digit verification code')).toHaveValue(MOCK_CODE);
  await page.getByRole('button', { name: 'Verify & continue' }).click();
  await expect(page).toHaveURL(/\/authority$/);
  expect(calls.find((call) => call.path.endsWith('/otp/request')).body).toEqual({ destination: '9876543210', channel: 'sms', role: 'authority' });
  expect(calls.filter((call) => call.path.endsWith('/otp/verify')).at(-1).body.code).toBe(MOCK_CODE);
});

test('a throttled mock send does not show code entry or store a session', async ({ page }) => {
  await mockApi(page, { sendFailure: true });
  await page.goto('/login');
  await page.getByLabel('Mobile number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Send SMS code' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many attempts');
  await expect(page.getByLabel('6-digit verification code')).toHaveCount(0);
  await expect(page.locator('.mock-code-card')).toHaveCount(0);
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

test('new farmer email registration verifies first and completes the profile contract', async ({ page }) => {
  const calls = await mockApi(page, { newFarmer: true });
  await page.goto('/register');
  await expect(page.getByRole('button', { name: 'Authority', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Email OTP' }).click();
  await page.getByLabel('Email address', { exact: true }).fill('farm@example.com');
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.getByRole('heading', { name: 'Check the mock inbox' })).toBeVisible();
  await expect(page.locator('.mock-code-value')).toHaveText(MOCK_CODE);
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
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
  await page.getByLabel('Mobile number or email', { exact: true }).fill('district.admin.anc@gmail.com');
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

test('existing farmer can add a contact with the mock code, without a duplicate profile', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ks-auth', JSON.stringify({ token: 'browser-test-session', user: { id: 'farmer-test', name: 'Test Farmer', role: 'farmer', phone: '9876543210', phoneVerified: true } })));
  const calls = await mockApi(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Add & verify', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill('farm@example.com');
  await page.getByRole('button', { name: 'Send email code' }).click();
  await expect(page.getByText('Mock email · your code')).toBeVisible();
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
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
  await expect(page.getByRole('switch', { name: 'नक़ली Google साइन-इन' })).toBeVisible();
  await page.getByRole('button', { name: /Google से साइन इन करें/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'खाता चुनें' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'ईमेल OTP', exact: true }).click();
  await expect(page.getByLabel('ईमेल पता', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
});
