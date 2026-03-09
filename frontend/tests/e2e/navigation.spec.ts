/**
 * T044 — Playwright E2E: simplified sidebar navigation + legacy redirects (US3)
 *
 * Contract: specs/003-prism-frontend-redesign/contracts/routing.md
 *
 * Prerequisites: dev server running on http://localhost:5173
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation — sidebar + redirects', () => {
  test('sidebar shows exactly 4 items with correct labels', async ({ page }) => {
    await page.goto('/emissions');

    const navItems = page.locator('aside nav pwc-header-menu-item');
    await expect(navItems).toHaveCount(4);

    await expect(page.locator('aside nav pwc-header-menu-item[label="Emissions"]')).toHaveCount(1);
    await expect(page.locator('aside nav pwc-header-menu-item[label="MACC Modelling"]')).toHaveCount(1);
    await expect(page.locator('aside nav pwc-header-menu-item[label="Context"]')).toHaveCount(1);
    await expect(page.locator('aside nav pwc-header-menu-item[label="Settings"]')).toHaveCount(1);

    await expect(page.locator('aside nav pwc-header-menu-item[label="Scenarios"]')).toHaveCount(0);
  });

  test('active sidebar item matches current route', async ({ page }) => {
    await page.goto('/context');

    await expect(page.locator('aside nav pwc-header-menu-item[label="Context"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page.locator('aside nav pwc-header-menu-item[label="Emissions"]')).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    await page.goto('/macc?tab=scenarios');
    await expect(page.locator('aside nav pwc-header-menu-item[label="MACC Modelling"]')).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('/scenarios redirects to /macc?tab=scenarios', async ({ page }) => {
    await page.goto('/scenarios');
    await page.waitForSelector('[role="tablist"]');
    await expect(page).toHaveURL(/\/macc\?tab=scenarios/);
  });

  test('ContextPage shows no targets section', async ({ page }) => {
    await page.goto('/context');

    await expect(page.getByRole('heading', { name: /emission reduction targets/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /add target/i })).toHaveCount(0);
  });
});
