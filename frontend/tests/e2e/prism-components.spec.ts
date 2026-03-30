/**
 * T028 — Playwright E2E: Prism component UI consistency (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until Prism components are migrated (T029–T041).
 * Verifies Prism buttons, modals, and tables are used on all key pages.
 *
 * Prerequisites: dev server running on http://localhost:5173
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goto(page: import('@playwright/test').Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Prism button adoption
// ---------------------------------------------------------------------------

test.describe('Prism components — Button adoption', () => {
  test('Initiatives tab has no raw <button class="btn..."> elements', async ({ page }) => {
    await goto(page, '/macc?tab=initiatives');
    // After Prism migration, no raw Tailwind button classes should remain
    const rawButtons = await page.locator('button[class*="bg-blue-"], button[class*="bg-red-"], button[class*="bg-white"]').count();
    expect(rawButtons).toBe(0);
  });

  test('Emissions page has no raw Tailwind button elements', async ({ page }) => {
    await goto(page, '/emissions');
    const rawButtons = await page.locator('button[class*="bg-blue-"], button[class*="bg-red-"]').count();
    expect(rawButtons).toBe(0);
  });

  test('Context page has no raw Tailwind button elements', async ({ page }) => {
    await goto(page, '/context');
    const rawButtons = await page.locator('button[class*="bg-blue-"], button[class*="bg-red-"]').count();
    expect(rawButtons).toBe(0);
  });

  test('Initiatives tab uses pwc-button elements', async ({ page }) => {
    await goto(page, '/macc?tab=initiatives');
    // Prism buttons should exist
    const prismButtons = await page.locator('pwc-button').count();
    expect(prismButtons).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Prism modal adoption
// ---------------------------------------------------------------------------

test.describe('Prism components — Modal adoption', () => {
  test('opening Create Initiative modal uses pwc-dialog', async ({ page }) => {
    await goto(page, '/macc?tab=initiatives');
    // Find and click a create button
    const createBtn = page.locator('pwc-button', { hasText: /create|add/i }).first();
    await createBtn.click();
    // A pwc-dialog should appear
    await expect(page.locator('pwc-dialog[open]')).toBeVisible({ timeout: 3000 });
  });

  test('opening Create Scenario modal uses pwc-dialog', async ({ page }) => {
    await goto(page, '/macc?tab=scenarios');
    const createBtn = page.locator('pwc-button', { hasText: /create|new/i }).first();
    await createBtn.click();
    await expect(page.locator('pwc-dialog[open]')).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// Prism table adoption
// ---------------------------------------------------------------------------

test.describe('Prism components — DataTable Prism-aligned', () => {
  test('Initiatives tab table has data-prism="table" container', async ({ page }) => {
    await goto(page, '/macc?tab=initiatives');
    await expect(page.locator('[data-prism="table"]')).toBeVisible();
  });

  test('Emissions page table has data-prism="table" container', async ({ page }) => {
    await goto(page, '/emissions');
    await expect(page.locator('[data-prism="table"]').first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Prism badge adoption
// ---------------------------------------------------------------------------

test.describe('Prism components — Badge adoption', () => {
  test('Emissions page uses pwc-badge or pwc-tag for quality indicators', async ({ page }) => {
    await goto(page, '/emissions');
    const prismBadges = await page.locator('pwc-badge, pwc-tag').count();
    expect(prismBadges).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Targets tab (Prism components)
// ---------------------------------------------------------------------------

test.describe('Prism components — Targets tab', () => {
  test('Targets tab uses pwc-button for actions', async ({ page }) => {
    await goto(page, '/macc?tab=targets');
    const prismButtons = await page.locator('pwc-button').count();
    expect(prismButtons).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// No inline Tailwind button/modal patterns
// ---------------------------------------------------------------------------

test.describe('Zero inline Tailwind button patterns', () => {
  const pages = [
    { name: 'MACC Modelling', path: '/macc?tab=initiatives' },
    { name: 'Scenarios', path: '/macc?tab=scenarios' },
    { name: 'Targets', path: '/macc?tab=targets' },
    { name: 'Emissions', path: '/emissions' },
    { name: 'Context', path: '/context' },
  ];

  for (const { name, path } of pages) {
    test(`${name} page — no raw button with Tailwind bg classes`, async ({ page }) => {
      await goto(page, path);
      // Inline Tailwind bg classes on raw <button> indicate non-Prism buttons
      const rawButtons = await page
        .locator('button:not([part])[class*="bg-blue-600"], button:not([part])[class*="bg-red-600"]')
        .count();
      expect(rawButtons).toBe(0);
    });
  }
});
