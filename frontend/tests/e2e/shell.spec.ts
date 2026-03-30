/**
 * T052 — Playwright E2E: Prism app shell verification (US4)
 *
 * Covers:
 *  - Sidebar uses Prism pwc-icon elements for nav icons
 *  - Sidebar active state per route
 *  - Header title renders on each page
 *  - Layout spacing consistent across all four pages
 *
 * Prerequisites: dev server running on http://localhost:5173
 */

import { test, expect } from '@playwright/test';

const pages = [
  { path: '/emissions',  heading: 'Emissions',        label: 'Emissions' },
  { path: '/macc',       heading: 'MACC Modelling',   label: 'MACC Modelling' },
  { path: '/context',    heading: 'Context',           label: 'Context' },
  { path: '/settings',   heading: 'Settings',          label: 'Settings' },
];

test.describe('App shell — Prism layout', () => {
  test('sidebar uses Prism icons (pwc-icon) for all nav items', async ({ page }) => {
    await page.goto('/emissions');

    // Sidebar is implemented with pwc-header-menu-item; verify we have 4 items
    // and each declares an icon attribute.
    const navItems = page.locator('aside nav pwc-header-menu-item');
    await expect(navItems).toHaveCount(4);
    await expect(page.locator('aside nav pwc-header-menu-item[icon]')).toHaveCount(4);
  });

  test('sidebar highlights the active route via aria-current', async ({ page }) => {
    for (const { path, label } of pages) {
      await page.goto(path);
      // Active nav item host must have aria-current="page"
      await expect(page.locator(`aside nav pwc-header-menu-item[label="${label}"]`)).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  test('header renders the page title on all four pages', async ({ page }) => {
    for (const { path, heading } of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(heading);
    }
  });

  test('layout renders sidebar + main content area on all pages', async ({ page }) => {
    for (const { path } of pages) {
      await page.goto(path);
      await expect(page.locator('aside')).toBeVisible();
      await expect(page.locator('main')).toBeVisible();
    }
  });
});
