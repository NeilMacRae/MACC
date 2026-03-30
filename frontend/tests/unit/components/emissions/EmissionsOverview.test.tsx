/**
 * T058 — Unit tests for Prism-rebuilt EmissionsOverview component (TDD: RED phase)
 *
 * These tests MUST FAIL until EmissionsOverview section containers are rebuilt
 * with Prism card semantics (T060).
 *
 * Verifies:
 *  - Renders total tCO₂e and org name (no regression)
 *  - Section containers have data-prism="card"
 *  - Prism select (pwc-select) used for year/quality selectors
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EmissionsOverview } from '../../../../src/components/emissions/EmissionsOverview';
import type { EmissionsOverview as EmissionsOverviewData } from '../../../../src/types/emissions';

vi.mock('../../../../src/hooks/useEmissions', () => ({
  useEmissionsOverview: vi.fn(),
}));

import { useEmissionsOverview } from '../../../../src/hooks/useEmissions';

const mockData: EmissionsOverviewData = {
  organisation_id: 'org-1',
  organisation_name: 'Acme Corp',
  year: 2024,
  market_factor_type: 'Location',
  total_co2e_tonnes: 12345,
  by_scope: {
    scope_1: { co2e_tonnes: 5000, percentage: 40 },
    scope_2: { co2e_tonnes: 3000, percentage: 24 },
    scope_3: { co2e_tonnes: 4345, percentage: 36 },
  },
  by_question_group: [
    { question_group: 'Transport', co2e_tonnes: 4000, percentage: 32 },
    { question_group: 'Energy', co2e_tonnes: 8345, percentage: 68 },
  ],
  top_sources: [
    {
      source_id: 'src-1',
      activity: 'Business Travel',
      question: 'Travel distance',
      question_group: 'Transport',
      scope: 3,
      co2e_tonnes: 2000,
      percentage: 16,
    },
  ],
  available_years: [2022, 2023, 2024],
};

function renderOverview() {
  return render(
    <EmissionsOverview
      year={2024}
      mft="Location"
      onYearChange={vi.fn()}
      onMftChange={vi.fn()}
    />,
  );
}

describe('EmissionsOverview (Prism-rebuilt, T060)', () => {
  beforeEach(() => {
    vi.mocked(useEmissionsOverview).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Regression: core data renders ────────────────────────────────────────

  it('renders the total tCO₂e value', () => {
    renderOverview();
    expect(screen.getByText(/12,345/)).toBeInTheDocument();
  });

  it('renders the organisation name', () => {
    renderOverview();
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
  });

  it('renders the organisation name and year together', () => {
    renderOverview();
    // Rendered as "Acme Corp · 2024" in a single paragraph
    expect(screen.getByText(/Acme Corp.*2024/)).toBeInTheDocument();
  });

  it('uses pwc-select (PrismSelect) for the year selector', () => {
    const { container } = renderOverview();
    expect(container.querySelector('pwc-select')).toBeInTheDocument();
  });

  // ── Prism card containers (FAIL until T060 implemented) ───────────────────

  it('scope chart section has data-prism="card"', () => {
    const { container } = renderOverview();
    const cards = container.querySelectorAll('[data-prism="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('activity category section has data-prism="card"', () => {
    const { container } = renderOverview();
    // Expect at least 2 Prism cards: scope chart section + category section
    const cards = container.querySelectorAll('[data-prism="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });

  // ── Loading / error states (regression) ──────────────────────────────────

  it('shows loading spinner while data is loading', () => {
    vi.mocked(useEmissionsOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    renderOverview();
    expect(screen.getByText(/loading emissions/i)).toBeInTheDocument();
  });

  it('shows error message when data fails to load', () => {
    vi.mocked(useEmissionsOverview).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    } as any);
    renderOverview();
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
