/**
 * T014 — Unit tests for TabBar component (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until TabBar is implemented (T016).
 * Contract: contracts/tab-component.md
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TabBar } from '../../../../src/components/macc/TabBar';
import type { MACCModellingTab } from '../../../../src/components/macc/TabBar';

describe('TabBar', () => {
  const onTabChange = vi.fn();

  const defaultProps = {
    activeTab: 'initiatives' as MACCModellingTab,
    onTabChange,
  };

  afterEach(() => {
    onTabChange.mockClear();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders a tablist with aria-label', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByRole('tablist')).toHaveAttribute(
      'aria-label',
      'MACC Modelling sections',
    );
  });

  it('renders exactly three tabs', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('renders Initiatives, Scenarios and Targets tabs', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /initiatives/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /targets/i })).toBeInTheDocument();
  });

  // ── Active tab state ───────────────────────────────────────────────────────

  it('marks the active tab with aria-selected="true"', () => {
    render(<TabBar {...defaultProps} activeTab="initiatives" />);
    expect(screen.getByRole('tab', { name: /initiatives/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('marks inactive tabs with aria-selected="false"', () => {
    render(<TabBar {...defaultProps} activeTab="initiatives" />);
    expect(screen.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
    expect(screen.getByRole('tab', { name: /targets/i })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('gives the active tab tabIndex=0 and inactive tabs tabIndex=-1', () => {
    render(<TabBar {...defaultProps} activeTab="scenarios" />);
    expect(screen.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'tabindex',
      '0',
    );
    expect(screen.getByRole('tab', { name: /initiatives/i })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('each tab has the correct aria-controls pointing to its panel', () => {
    render(<TabBar {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /initiatives/i })).toHaveAttribute(
      'aria-controls',
      'panel-initiatives',
    );
    expect(screen.getByRole('tab', { name: /scenarios/i })).toHaveAttribute(
      'aria-controls',
      'panel-scenarios',
    );
    expect(screen.getByRole('tab', { name: /targets/i })).toHaveAttribute(
      'aria-controls',
      'panel-targets',
    );
  });

  // ── Click interaction ──────────────────────────────────────────────────────

  it('calls onTabChange with the correct id when a tab is clicked', () => {
    render(<TabBar {...defaultProps} />);
    fireEvent.click(screen.getByRole('tab', { name: /scenarios/i }));
    expect(onTabChange).toHaveBeenCalledOnce();
    expect(onTabChange).toHaveBeenCalledWith('scenarios');
  });

  it('calls onTabChange when Enter is pressed on a tab', () => {
    render(<TabBar {...defaultProps} />);
    const tab = screen.getByRole('tab', { name: /targets/i });
    fireEvent.keyDown(tab, { key: 'Enter' });
    expect(onTabChange).toHaveBeenCalledWith('targets');
  });

  it('calls onTabChange when Space is pressed on a tab', () => {
    render(<TabBar {...defaultProps} />);
    const tab = screen.getByRole('tab', { name: /targets/i });
    fireEvent.keyDown(tab, { key: ' ' });
    expect(onTabChange).toHaveBeenCalledWith('targets');
  });

  // ── Keyboard navigation ────────────────────────────────────────────────────

  it('ArrowRight on last tab wraps focus to first tab', () => {
    render(<TabBar {...defaultProps} activeTab="targets" />);
    const targetsTab = screen.getByRole('tab', { name: /targets/i });
    fireEvent.keyDown(targetsTab, { key: 'ArrowRight' });
    // onTabChange called with the wrapped-around tab (initiatives)
    expect(onTabChange).toHaveBeenCalledWith('initiatives');
  });

  it('ArrowLeft on first tab wraps focus to last tab', () => {
    render(<TabBar {...defaultProps} activeTab="initiatives" />);
    const initiativesTab = screen.getByRole('tab', { name: /initiatives/i });
    fireEvent.keyDown(initiativesTab, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('targets');
  });

  it('ArrowRight moves focus to next tab', () => {
    render(<TabBar {...defaultProps} activeTab="initiatives" />);
    const initiativesTab = screen.getByRole('tab', { name: /initiatives/i });
    fireEvent.keyDown(initiativesTab, { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledWith('scenarios');
  });

  it('ArrowLeft moves focus to previous tab', () => {
    render(<TabBar {...defaultProps} activeTab="scenarios" />);
    const scenariosTab = screen.getByRole('tab', { name: /scenarios/i });
    fireEvent.keyDown(scenariosTab, { key: 'ArrowLeft' });
    expect(onTabChange).toHaveBeenCalledWith('initiatives');
  });

  it('Home key moves focus to first tab', () => {
    render(<TabBar {...defaultProps} activeTab="targets" />);
    const targetsTab = screen.getByRole('tab', { name: /targets/i });
    fireEvent.keyDown(targetsTab, { key: 'Home' });
    expect(onTabChange).toHaveBeenCalledWith('initiatives');
  });

  it('End key moves focus to last tab', () => {
    render(<TabBar {...defaultProps} activeTab="initiatives" />);
    const initiativesTab = screen.getByRole('tab', { name: /initiatives/i });
    fireEvent.keyDown(initiativesTab, { key: 'End' });
    expect(onTabChange).toHaveBeenCalledWith('targets');
  });
});
