/**
 * T013 — Playwright E2E: MACC Modelling tab navigation (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until MACCModellingPage is implemented (T017).
 * Contract: contracts/tab-component.md, contracts/routing.md
 *
 * Prerequisites: dev server running on http://localhost:5173
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Navigate to MACC Modelling and wait for the tab list to be visible. */
async function gotoMacc(page: import('@playwright/test').Page, tab?: string) {
  const url = tab ? `/macc?tab=${tab}` : '/macc';
  await page.goto(url);
  await page.waitForSelector('[role="tablist"]');
}

// ---------------------------------------------------------------------------
// Tab rendering
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — tab rendering', () => {
  test('renders exactly three tabs', async ({ page }) => {
    await gotoMacc(page);
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);
  });

  test('tab labels are Initiatives, Scenarios and Targets', async ({ page }) => {
    await gotoMacc(page);
    await expect(page.getByRole('tab', { name: /initiatives/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /scenarios/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /targets/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// URL ?tab= sync
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — URL ?tab= sync', () => {
  test('navigating to /macc normalises URL to ?tab=initiatives', async ({ page }) => {
    await gotoMacc(page);
    await expect(page).toHaveURL(/[?&]tab=initiatives/);
  });

  test('clicking Scenarios tab updates URL to ?tab=scenarios', async ({ page }) => {
    await gotoMacc(page);
    await page.getByRole('tab', { name: /scenarios/i }).click();
    await expect(page).toHaveURL(/[?&]tab=scenarios/);
  });

  test('clicking Targets tab updates URL to ?tab=targets', async ({ page }) => {
    await gotoMacc(page);
    await page.getByRole('tab', { name: /targets/i }).click();
    await expect(page).toHaveURL(/[?&]tab=targets/);
  });

  test('clicking Initiatives tab updates URL to ?tab=initiatives', async ({ page }) => {
    await gotoMacc(page, 'scenarios');
    await page.getByRole('tab', { name: /initiatives/i }).click();
    await expect(page).toHaveURL(/[?&]tab=initiatives/);
  });

  test('invalid ?tab= value is normalised to ?tab=initiatives', async ({ page }) => {
    await page.goto('/macc?tab=invalid');
    await page.waitForSelector('[role="tablist"]');
    await expect(page).toHaveURL(/[?&]tab=initiatives/);
  });
});

// ---------------------------------------------------------------------------
// Tab active state
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — active tab aria state', () => {
  test('Initiatives tab is aria-selected when ?tab=initiatives', async ({ page }) => {
    await gotoMacc(page, 'initiatives');
    await expect(page.getByRole('tab', { name: /initiatives/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('Scenarios tab is aria-selected when ?tab=scenarios', async ({ page }) => {
    await gotoMacc(page, 'scenarios');
    await expect(page.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('Targets tab is aria-selected when ?tab=targets', async ({ page }) => {
    await gotoMacc(page, 'targets');
    await expect(page.getByRole('tab', { name: /targets/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

// ---------------------------------------------------------------------------
// Page refresh
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — page refresh', () => {
  test('refreshing on ?tab=scenarios stays on Scenarios', async ({ page }) => {
    await gotoMacc(page, 'scenarios');
    await page.reload();
    await page.waitForSelector('[role="tablist"]');
    await expect(page).toHaveURL(/[?&]tab=scenarios/);
    await expect(page.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('refreshing on ?tab=targets stays on Targets', async ({ page }) => {
    await gotoMacc(page, 'targets');
    await page.reload();
    await page.waitForSelector('[role="tablist"]');
    await expect(page).toHaveURL(/[?&]tab=targets/);
    await expect(page.getByRole('tab', { name: /targets/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

// ---------------------------------------------------------------------------
// Panel visibility (display: none vs display: block)
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — panel visibility', () => {
  test('Initiatives panel is visible when tab=initiatives', async ({ page }) => {
    await gotoMacc(page, 'initiatives');
    const panel = page.locator('#panel-initiatives');
    await expect(panel).toBeVisible();
  });

  test('Scenarios panel is hidden when tab=initiatives', async ({ page }) => {
    await gotoMacc(page, 'initiatives');
    const panel = page.locator('#panel-scenarios');
    // display: none means not visible but present in DOM
    await expect(panel).not.toBeVisible();
  });

  test('Scenarios panel becomes visible after clicking Scenarios tab', async ({ page }) => {
    await gotoMacc(page, 'initiatives');
    await page.getByRole('tab', { name: /scenarios/i }).click();
    await expect(page.locator('#panel-scenarios')).toBeVisible();
    await expect(page.locator('#panel-initiatives')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Cross-tab workflow (create initiative → switch to Scenarios → switch to Targets)
// ---------------------------------------------------------------------------

test.describe('MACC Modelling — cross-tab workflow', () => {
  test('full tab workflow completes without leaving the page', async ({ page }) => {
    await gotoMacc(page);

    // Step 1 — Initiatives tab is default
    await expect(page).toHaveURL(/[?&]tab=initiatives/);
    await expect(page.getByRole('tab', { name: /initiatives/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#panel-initiatives')).toBeVisible();

    // Step 2 — Switch to Scenarios
    await page.getByRole('tab', { name: /scenarios/i }).click();
    await expect(page).toHaveURL(/[?&]tab=scenarios/);
    await expect(page.locator('#panel-scenarios')).toBeVisible();
    await expect(page.locator('#panel-initiatives')).not.toBeVisible();

    // Step 3 — Switch to Targets
    await page.getByRole('tab', { name: /targets/i }).click();
    await expect(page).toHaveURL(/[?&]tab=targets/);
    await expect(page.locator('#panel-targets')).toBeVisible();
    await expect(page.locator('#panel-scenarios')).not.toBeVisible();

    // Step 4 — Navigate back to Initiatives
    await page.getByRole('tab', { name: /initiatives/i }).click();
    await expect(page).toHaveURL(/[?&]tab=initiatives/);
    await expect(page.locator('#panel-initiatives')).toBeVisible();
  });
});
