/**
 * T058 — Unit tests for Prism-rebuilt TrendChart component (TDD: RED phase)
 *
 * These tests MUST FAIL until TrendChart root container has data-prism="card"
 * (T062). D3 rendering internals are unchanged.
 *
 * Verifies:
 *  - Renders chart title and SVG (no regression)
 *  - Root container has data-prism="card"
 *  - Shows empty state when no trends available
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrendChart } from '../../../../src/components/emissions/TrendChart';

vi.mock('../../../../src/hooks/useEmissions', () => ({
  useTrends: vi.fn(),
}));

import { useTrends } from '../../../../src/hooks/useEmissions';

const mockTrendData = {
  unit_id: null,
  company_unit_name: 'Acme Corp',
  market_factor_type: 'Location' as const,
  trends: [
    { year: 2022, co2e_tonnes: 14000 },
    { year: 2023, co2e_tonnes: 13000 },
    { year: 2024, co2e_tonnes: 12345 },
  ],
};

describe('TrendChart (Prism-rebuilt, T062)', () => {
  beforeEach(() => {
    vi.mocked(useTrends).mockReturnValue({
      data: mockTrendData,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Regression: renders correctly ────────────────────────────────────────

  it('renders the company unit name', () => {
    render(<TrendChart mft="Location" />);
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('renders an SVG trend chart', () => {
    const { container } = render(<TrendChart mft="Location" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('SVG has aria-label for accessibility', () => {
    const { container } = render(<TrendChart mft="Location" />);
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-label',
      'Emissions trend chart',
    );
  });

  it('shows empty state when no trend data', () => {
    vi.mocked(useTrends).mockReturnValue({
      data: { ...mockTrendData, trends: [] },
      isLoading: false,
      error: null,
    } as any);
    render(<TrendChart mft="Location" />);
    expect(screen.getByText(/no trend data/i)).toBeInTheDocument();
  });

  it('shows loading spinner while loading', () => {
    vi.mocked(useTrends).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<TrendChart mft="Location" />);
    expect(screen.getByText(/loading trends/i)).toBeInTheDocument();
  });

  // ── Prism card container (FAIL until T062 implemented) ───────────────────

  it('root container has data-prism="card"', () => {
    const { container } = render(<TrendChart mft="Location" />);
    expect(container.querySelector('[data-prism="card"]')).toBeInTheDocument();
  });

  it('data-prism="card" wrapper contains the SVG', () => {
    const { container } = render(<TrendChart mft="Location" />);
    const card = container.querySelector('[data-prism="card"]');
    expect(card).not.toBeNull();
    expect(card!.querySelector('svg')).toBeInTheDocument();
  });
});
