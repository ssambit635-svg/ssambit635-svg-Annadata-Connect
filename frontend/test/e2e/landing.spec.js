import { test, expect } from '@playwright/test';

// Landing regression net: brand, honesty labels, public tracking, table
// semantics and the mobile CTA — the things that silently broke before.
// Requires the Vite dev server (config webServer) and, for the tracking
// round-trip, the backend on :5000 (`npm run dev:backend`).

test.describe('landing page', () => {
  test('shows the real app logo, prototype banner and no invented stats', async ({ page }) => {
    await page.goto('/');
    // Real brand mark (BrandLogo SVG), not the old generic wheat icon box.
    await expect(page.locator('.home-header .home-brand-mark svg.brand-logo')).toBeVisible();
    await expect(page.locator('.home-footer .home-brand-mark svg.brand-logo')).toHaveCount(1);
    // Honesty: prototype banner present, fake pilot stats gone.
    await expect(page.locator('.home-prototype-banner')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('12,400');
    await expect(page.locator('body')).not.toContainText('Harvest Companion');
    // Correct unified helpline.
    await expect(page.locator('a[href="tel:155261"]').first()).toBeVisible();
    await expect(page.locator('a[href="tel:155266"]')).toHaveCount(0);
  });

  test('MSP rates are a real table', async ({ page }) => {
    await page.goto('/');
    const rows = page.locator('table.home-rate-table tbody tr');
    await expect(rows).toHaveCount(6);
    await expect(page.locator('table.home-rate-table th[scope="row"]').first()).toBeVisible();
  });

  test('public token tracking answers not-found for a fake token', async ({ page, request }) => {
    const health = await request.get('/api/health').catch(() => null);
    test.skip(!health?.ok(), 'backend not running on :5000');
    await page.goto('/#track');
    await page.fill('#track-token', 'ANC-0000');
    await page.fill('#track-phone', '9000000000');
    await page.click('.home-track-form button[type="submit"]');
    await expect(page.locator('.home-track-alert[role="alert"]')).toBeVisible();
  });

  test('mobile: sticky CTA replaces the floating helpline pill', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('.home-mobile-cta')).toBeVisible();
    await expect(page.locator('.home-floating-help')).toBeHidden();
  });
});
