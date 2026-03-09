/**
 * T066 — Playwright E2E: Context page Prism form (US6)
 *
 * This test stubs the /context API so it can run without a backend.
 */

import { test, expect } from '@playwright/test';

test.describe('Context — Prism form', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/context', async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        // Simulate “context not set yet”
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Context not found' }),
        });
        return;
      }

      if (method === 'PUT') {
        const body = route.request().postDataJSON?.() ?? {};
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'ctx-1', ...body }),
        });
        return;
      }

      await route.fallback();
    });
  });

  /**
   * Structural check: verifies that the Context page renders all expected Prism
   * form components.  Validation-error behaviour is a React state concern and is
   * fully covered at unit level (ContextForm.test.tsx T065).  Attempting to
   * trigger it via Playwright requires simulating Lit/Web Component internal
   * events which is inherently brittle across browsers — wrong layer for E2E.
   */
  test('renders Prism form components', async ({ page }) => {
    await page.goto('/context');

    // All Prism input components must be present
    await expect(page.locator('pwc-input[label="Industry sector"]')).toBeVisible();
    await expect(page.locator('pwc-input[label="Employee count"]')).toBeVisible();
    await expect(page.locator('pwc-input[label="Net-zero target year"]')).toBeVisible();
    await expect(page.locator('pwc-input[label="Annual revenue (£)"]')).toBeVisible();
    await expect(page.locator('pwc-input[label="Sustainability budget constraint (£)"]')).toBeVisible();
    await expect(page.locator('pwc-input[label="Operating geographies"]')).toBeVisible();
    await expect(page.locator('pwc-select[label="Sustainability maturity"]')).toBeVisible();
    await expect(page.locator('pwc-textarea[label="Notes"]')).toBeVisible();

    // Submit button is a Prism button
    await expect(page.locator('pwc-button', { hasText: 'Save context' })).toBeVisible();
  });

  test('submits successfully with valid data', async ({ page }) => {
    await page.goto('/context');

    await page.locator('pwc-input[label="Industry sector"]').evaluate((el) => {
      (el as any).value = 'Manufacturing';
      el.dispatchEvent(new CustomEvent('p-input', { bubbles: true, composed: true }));
    });

    await page.locator('pwc-input[label="Employee count"]').evaluate((el) => {
      (el as any).value = '2500';
      el.dispatchEvent(new CustomEvent('p-input', { bubbles: true, composed: true }));
    });

    await page.locator('pwc-select[label="Sustainability maturity"]').evaluate((el) => {
      (el as any).value = 'intermediate';
      el.dispatchEvent(new CustomEvent('p-change', { bubbles: true, composed: true }));
    });

    await page.locator('pwc-button', { hasText: 'Save context' }).click();

    await expect(page.locator('pwc-alert')).toContainText('Context saved successfully');
  });
});
