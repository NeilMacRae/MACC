/**
 * T015 — Unit tests for MACCModellingPage (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until MACCModellingPage is implemented (T017).
 * Contract: contracts/tab-component.md, contracts/routing.md
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MACCModellingPage } from '../../../src/pages/MACCModellingPage';

// ── Mock heavy tab-panel children so tests focus on page-level behaviour ──────
vi.mock('../../../src/components/macc/InitiativesTab', () => ({
  InitiativesTab: () => <div data-testid="initiatives-panel">Initiatives content</div>,
}));
vi.mock('../../../src/components/macc/ScenariosTab', () => ({
  ScenariosTab: () => <div data-testid="scenarios-panel">Scenarios content</div>,
}));
vi.mock('../../../src/components/macc/TargetsTab', () => ({
  TargetsTab: () => <div data-testid="targets-panel">Targets content</div>,
}));

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPage(initialPath: string) {
  const qc = makeQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/macc" element={<MACCModellingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MACCModellingPage', () => {
  // ── Default / missing tab param ──────────────────────────────────────────

  it('renders the Initiatives panel when ?tab= is missing', () => {
    renderPage('/macc');
    expect(screen.getByTestId('initiatives-panel')).toBeInTheDocument();
  });

  it('renders all three panels in the DOM (for state preservation)', () => {
    renderPage('/macc');
    expect(screen.getByTestId('initiatives-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scenarios-panel')).toBeInTheDocument();
    expect(screen.getByTestId('targets-panel')).toBeInTheDocument();
  });

  it('makes the initiatives panel visible and hides others when tab is missing', () => {
    renderPage('/macc');
    // The visible panel should be initiatives
    expect(screen.getByTestId('initiatives-panel').closest('[role="tabpanel"]'))
      .not.toHaveStyle({ display: 'none' });
  });

  // ── Valid ?tab= params ───────────────────────────────────────────────────

  it('shows the Scenarios panel when ?tab=scenarios', () => {
    renderPage('/macc?tab=scenarios');
    const panel = screen.getByTestId('scenarios-panel').closest('[role="tabpanel"]');
    expect(panel).not.toHaveStyle({ display: 'none' });
  });

  it('shows the Targets panel when ?tab=targets', () => {
    renderPage('/macc?tab=targets');
    const panel = screen.getByTestId('targets-panel').closest('[role="tabpanel"]');
    expect(panel).not.toHaveStyle({ display: 'none' });
  });

  it('shows the Initiatives panel when ?tab=initiatives', () => {
    renderPage('/macc?tab=initiatives');
    const panel = screen.getByTestId('initiatives-panel').closest('[role="tabpanel"]');
    expect(panel).not.toHaveStyle({ display: 'none' });
  });

  // ── Invalid ?tab= param ──────────────────────────────────────────────────

  it('falls back to the Initiatives panel for an unrecognized ?tab= value', () => {
    renderPage('/macc?tab=unknown');
    const panel = screen.getByTestId('initiatives-panel').closest('[role="tabpanel"]');
    expect(panel).not.toHaveStyle({ display: 'none' });
  });

  // ── Tab bar presence ─────────────────────────────────────────────────────

  it('renders a tablist', () => {
    renderPage('/macc');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders the three tab buttons', () => {
    renderPage('/macc');
    expect(screen.getByRole('tab', { name: /initiatives/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /targets/i })).toBeInTheDocument();
  });

  it('marks the active tab as aria-selected="true"', () => {
    renderPage('/macc?tab=scenarios');
    expect(screen.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  // ── Panel IDs match tab aria-controls ────────────────────────────────────

  it('each panel has an id matching the corresponding tab aria-controls', () => {
    renderPage('/macc');
    const tabs = screen.getAllByRole('tab');
    tabs.forEach((tab) => {
      const controlledPanelId = tab.getAttribute('aria-controls');
      if (controlledPanelId) {
        expect(document.getElementById(controlledPanelId)).toBeInTheDocument();
      }
    });
  });
});
