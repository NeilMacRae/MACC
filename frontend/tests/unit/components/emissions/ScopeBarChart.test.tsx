/**
 * T058 — Unit tests for Prism-wrapped ScopeBarChart component (TDD: RED phase)
 *
 * These tests MUST FAIL until ScopeBarChart is wrapped in a Prism chart
 * container (T061). D3 rendering internals are unchanged.
 *
 * Verifies:
 *  - SVG renders with correct aria-label (no regression)
 *  - SVG is wrapped in a data-prism="chart" container element
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ScopeBarChart } from '../../../../src/components/emissions/ScopeBarChart';
import type { ByScopeBreakdown } from '../../../../src/types/emissions';

const mockByScope: ByScopeBreakdown = {
  scope_1: { co2e_tonnes: 5000, percentage: 40 },
  scope_2: { co2e_tonnes: 3000, percentage: 24 },
  scope_3: { co2e_tonnes: 4345, percentage: 36 },
};

describe('ScopeBarChart (Prism-wrapped, T061)', () => {
  // ── Regression: SVG renders correctly ────────────────────────────────────

  it('renders an SVG element', () => {
    const { container } = render(<ScopeBarChart by_scope={mockByScope} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('SVG has aria-label for accessibility', () => {
    const { container } = render(<ScopeBarChart by_scope={mockByScope} />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-label',
      'Scope emissions breakdown',
    );
  });

  // ── Prism chart wrapper (FAIL until T061 implemented) ────────────────────

  it('renders within a data-prism="chart" container', () => {
    const { container } = render(<ScopeBarChart by_scope={mockByScope} />);
    expect(container.querySelector('[data-prism="chart"]')).toBeInTheDocument();
  });

  it('data-prism="chart" wrapper contains the SVG', () => {
    const { container } = render(<ScopeBarChart by_scope={mockByScope} />);
    const chartWrapper = container.querySelector('[data-prism="chart"]');
    expect(chartWrapper).not.toBeNull();
    expect(chartWrapper!.querySelector('svg')).toBeInTheDocument();
  });
});
