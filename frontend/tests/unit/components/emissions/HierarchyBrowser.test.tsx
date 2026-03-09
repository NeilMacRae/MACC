/**
 * T058 — Unit tests for Prism-rebuilt HierarchyBrowser component
 *        (TDD: RED phase)
 *
 * These tests MUST FAIL until HierarchyBrowser outer container has
 * data-prism="table" (rebuilt as part of T064 / EmissionsPage rebuild).
 *
 * Verifies:
 *  - Renders unit names in the tree (no regression)
 *  - Calls onSelectUnit when a row is clicked
 *  - Outer container has data-prism="table"
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HierarchyBrowser } from '../../../../src/components/emissions/HierarchyBrowser';
import type { HierarchyNode } from '../../../../src/types/emissions';

const mockRoot: HierarchyNode = {
  id: 'root-1',
  company_unit_id: 1,
  company_unit_name: 'Acme Corp',
  company_unit_type: 'division',
  facility_type: null,
  country: null,
  country_code: null,
  total_co2e_tonnes: 12345,
  children: [
    {
      id: 'site-1',
      company_unit_id: 2,
      company_unit_name: 'London HQ',
      company_unit_type: 'site',
      facility_type: null,
      country: 'UK',
      country_code: 'GB',
      total_co2e_tonnes: 3500,
      children: [],
    },
  ],
};

function renderBrowser(selectedId: string | null = null) {
  const onSelectUnit = vi.fn();
  const result = render(
    <HierarchyBrowser
      root={mockRoot}
      onSelectUnit={onSelectUnit}
      selectedId={selectedId}
    />,
  );
  return { ...result, onSelectUnit };
}

describe('HierarchyBrowser (Prism-rebuilt, T064)', () => {
  // ── Regression: renders tree correctly ───────────────────────────────────

  it('renders the root unit name', () => {
    renderBrowser();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders child unit names when tree is expanded', () => {
    renderBrowser();
    // Depth-0 root is expanded by default
    expect(screen.getByText('London HQ')).toBeInTheDocument();
  });

  it('calls onSelectUnit with the unit id when a row is clicked', () => {
    const { onSelectUnit } = renderBrowser();
    screen.getByText('Acme Corp').closest('tr')?.click();
    expect(onSelectUnit).toHaveBeenCalledWith('root-1');
  });

  it('highlights the selected row when selectedId matches', () => {
    const { container } = renderBrowser('root-1');
    // The selected row should have bg-blue-50 class
    const selectedRow = container.querySelector('tr.bg-blue-50');
    expect(selectedRow).not.toBeNull();
  });

  // ── Prism table container (FAIL until implemented) ────────────────────────

  it('outer container has data-prism="table"', () => {
    const { container } = renderBrowser();
    expect(container.querySelector('[data-prism="table"]')).toBeInTheDocument();
  });
});
