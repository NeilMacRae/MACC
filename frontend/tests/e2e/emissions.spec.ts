/**
 * T059 — Playwright E2E: Emissions page Prism component rebuild (US5)
 *        (TDD: RED phase)
 *
 * These tests MUST FAIL until Emissions components are rebuilt (T060–T064).
 *
 * Covers:
 *  - Overview tab: Prism card containers, Prism chart wrapper, tCO₂e visible
 *  - Trends tab: trend chart rendered in Prism card
 *  - Hierarchy tab: table in Prism table container
 *  - Tab navigation uses proper tablist/tab ARIA roles
 *  - No raw Tailwind bg-* button classes remain on the page
 *
 * Prerequisites: dev server running on http://localhost:5173 with backend on :8000
 */

import { test, expect } from '@playwright/test';

async function gotoEmissions(page: import('@playwright/test').Page) {
  await page.goto('/emissions');
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Tab navigation — ARIA structure (fails until T064 implemented)
// ---------------------------------------------------------------------------

test.describe('Emissions page — tab navigation ARIA (T064)', () => {
  test('tab bar has role="tablist"', async ({ page }) => {
    await gotoEmissions(page);
    const tabList = page.locator('[role="tablist"]');
    await expect(tabList).toBeVisible();
  });

  test('tab bar has exactly three role="tab" buttons', async ({ page }) => {
    await gotoEmissions(page);
    const tabs = page.locator('[role="tablist"] [role="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('Overview tab is aria-selected="true" on load', async ({ page }) => {
    await gotoEmissions(page);
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Trends tab via role="tab"', async ({ page }) => {
    await gotoEmissions(page);
    await page.getByRole('tab', { name: /trends/i }).click();
    const trendsTab = page.getByRole('tab', { name: /trends/i });
    await expect(trendsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Hierarchy tab via role="tab"', async ({ page }) => {
    await gotoEmissions(page);
    await page.getByRole('tab', { name: /hierarchy/i }).click();
    const hierarchyTab = page.getByRole('tab', { name: /hierarchy/i });
    await expect(hierarchyTab).toHaveAttribute('aria-selected', 'true');
  });
});

// ---------------------------------------------------------------------------
// Overview tab — Prism containers (fails until T060/T061 implemented)
// ---------------------------------------------------------------------------

test.describe('Emissions page — Overview tab Prism containers (T060/T061)', () => {
  test('Overview tab has data-prism="card" section containers', async ({ page }) => {
    await gotoEmissions(page);
    // Wait for data to load before checking Prism containers
    const firstCard = page.locator('[data-prism="card"]').first();
    await expect(firstCard).toBeVisible({ timeout: 8000 });
    const count = await page.locator('[data-prism="card"]').count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('scope breakdown chart has data-prism="chart" wrapper', async ({ page }) => {
    await gotoEmissions(page);
    const chartWrapper = page.locator('[data-prism="chart"]').first();
    await expect(chartWrapper).toBeVisible({ timeout: 8000 });
  });

  test('scope breakdown SVG is visible with aria-label', async ({ page }) => {
    await gotoEmissions(page);
    const svg = page.locator('svg[aria-label="Scope emissions breakdown"]');
    await expect(svg).toBeVisible({ timeout: 8000 });
  });

  test('total tCO₂e value is displayed', async ({ page }) => {
    await gotoEmissions(page);
    // Be specific: the page contains both a unit label and a table column header.
    await expect(page.locator('span', { hasText: 'tCO₂e' })).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Trends tab — Prism card (fails until T062 implemented)
// ---------------------------------------------------------------------------

test.describe('Emissions page — Trends tab Prism card (T062)', () => {
  test('Trends tab chart is inside a data-prism="card" container', async ({ page }) => {
    await gotoEmissions(page);
    await page.getByRole('tab', { name: /trends/i }).click();
    const trendCard = page.locator('[data-prism="card"]').first();
    await expect(trendCard).toBeVisible({ timeout: 8000 });
  });

  test('Trends tab renders emissions trend SVG', async ({ page }) => {
    await gotoEmissions(page);
    await page.getByRole('tab', { name: /trends/i }).click();
    const svg = page.locator('svg[aria-label="Emissions trend chart"]');
    await expect(svg).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// Hierarchy tab — Prism table (fails until HierarchyBrowser updated in T064)
// ---------------------------------------------------------------------------

test.describe('Emissions page — Hierarchy tab Prism table (T064)', () => {
  test('Hierarchy tab table wrapper has data-prism="table"', async ({ page }) => {
    await gotoEmissions(page);
    await page.getByRole('tab', { name: /hierarchy/i }).click();
    const tableWrapper = page.locator('[data-prism="table"]').first();
    await expect(tableWrapper).toBeVisible({ timeout: 8000 });
  });
});

// ---------------------------------------------------------------------------
// No raw Tailwind bg-* button classes (regression guard)
// ---------------------------------------------------------------------------

test.describe('Emissions page — no raw Tailwind button classes', () => {
  test('no raw bg-blue- or bg-red- button classes on Emissions page', async ({ page }) => {
    await gotoEmissions(page);
    const rawButtons = page.locator(
      'button[class*="bg-blue-"], button[class*="bg-red-"]',
    );
    await expect(rawButtons).toHaveCount(0);
  });
});
