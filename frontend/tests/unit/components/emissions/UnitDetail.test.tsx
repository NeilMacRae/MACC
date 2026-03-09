/**
 * T058 — Unit tests for Prism-rebuilt UnitDetail (UnitBreakdown) component
 *        (TDD: RED phase)
 *
 * These tests MUST FAIL until UnitDetail section containers have
 * data-prism="card" (T063).
 *
 * Verifies:
 *  - Renders unit name, total, city/country (no regression)
 *  - Scope breakdown section has data-prism="card"
 *  - Child units section has data-prism="card" when children present
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnitDetail } from '../../../../src/components/emissions/UnitDetail';

vi.mock('../../../../src/hooks/useEmissions', () => ({
  useUnitDetail: vi.fn(),
}));

import { useUnitDetail } from '../../../../src/hooks/useEmissions';

const mockUnitData = {
  id: 'unit-1',
  company_unit_id: 1,
  company_unit_name: 'London HQ',
  company_unit_type: 'site' as const,
  facility_type: null,
  city: 'London',
  country: 'UK',
  country_code: 'GB',
  market_factor_type: 'Location' as const,
  total_co2e_tonnes: 3500,
  by_scope: {
    scope_1: { co2e_tonnes: 1500, percentage: 43 },
    scope_2: { co2e_tonnes: 1000, percentage: 29 },
    scope_3: { co2e_tonnes: 1000, percentage: 28 },
  },
  by_question_group: [],
  top_sources: [],
  child_units: [],
  sources: [],
};

const mockUnitWithChildren = {
  ...mockUnitData,
  company_unit_type: 'division' as const,
  child_units: [
    {
      id: 'child-1',
      company_unit_name: 'London Site A',
      company_unit_type: 'site' as const,
      total_co2e_tonnes: 1800,
    },
  ],
};

function renderUnit(overrides = {}) {
  return render(
    <UnitDetail
      unitId="unit-1"
      mft="Location"
      onNavigate={vi.fn()}
      {...overrides}
    />,
  );
}

describe('UnitDetail (Prism-rebuilt, T063)', () => {
  beforeEach(() => {
    vi.mocked(useUnitDetail).mockReturnValue({
      data: mockUnitData,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Regression: core data renders ────────────────────────────────────────

  it('renders the unit name', () => {
    renderUnit();
    expect(screen.getByText('London HQ')).toBeInTheDocument();
  });

  it('renders total tCO₂e', () => {
    renderUnit();
    expect(screen.getByText(/3,500/)).toBeInTheDocument();
  });

  it('renders city and country', () => {
    renderUnit();
    // "London, UK" is rendered from city + country fields
    expect(screen.getByText(/London.*UK|UK.*London/)).toBeInTheDocument();
  });

  it('shows loading spinner while loading', () => {
    vi.mocked(useUnitDetail).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    renderUnit();
    expect(screen.getByText(/loading unit/i)).toBeInTheDocument();
  });

  it('shows error message on failure', () => {
    vi.mocked(useUnitDetail).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('not found'),
    } as any);
    renderUnit();
    expect(screen.getByText(/failed to load unit/i)).toBeInTheDocument();
  });

  // ── Prism card containers (FAIL until T063 implemented) ───────────────────

  it('scope breakdown section has data-prism="card"', () => {
    const { container } = renderUnit();
    const cards = container.querySelectorAll('[data-prism="card"]');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('child units section has data-prism="card" when children exist', () => {
    vi.mocked(useUnitDetail).mockReturnValue({
      data: mockUnitWithChildren,
      isLoading: false,
      error: null,
    } as any);
    const { container } = renderUnit();
    const cards = container.querySelectorAll('[data-prism="card"]');
    // scope breakdown card + child units card
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
