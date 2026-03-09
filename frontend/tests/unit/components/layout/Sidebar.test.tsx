/**
 * T045 — Unit tests for updated Sidebar navigation (US3)
 * T053 — Additional Prism icon tests (US4)
 *
 * Contract: specs/003-prism-frontend-redesign/contracts/routing.md
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { Sidebar } from '../../../../src/components/layout/Sidebar';

function renderSidebar(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar (US3 simplified)', () => {
  it('renders exactly 4 navigation links with expected labels', () => {
    const { container } = renderSidebar('/emissions');

    const items = container.querySelectorAll('aside nav pwc-header-menu-item');
    expect(items).toHaveLength(4);

    const labels = Array.from(items).map((el) => el.getAttribute('label'));
    expect(labels).toEqual(['Emissions', 'MACC Modelling', 'Context', 'Settings']);
    expect(labels).not.toContain('Scenarios');
  });

  it('marks the current route as active via aria-current="page"', () => {
    const { container } = renderSidebar('/context');

    const items = Array.from(
      container.querySelectorAll('aside nav pwc-header-menu-item'),
    ) as HTMLElement[];

    const byLabel = (label: string) =>
      items.find((el) => el.getAttribute('label') === label);

    expect(byLabel('Context')).toHaveAttribute('aria-current', 'page');
    expect(byLabel('Emissions')).not.toHaveAttribute('aria-current', 'page');
    expect(byLabel('MACC Modelling')).not.toHaveAttribute('aria-current', 'page');
  });

  // T053 (US4): Prism icon adoption — sidebar must use pwc-icon, not inline SVGs
  it('uses Prism pwc-icon elements for all navigation icons', () => {
    const { container } = renderSidebar('/emissions');

    // Icons are rendered inside the web component's shadow DOM, so we assert
    // the host components are configured with an icon attribute.
    const items = Array.from(
      container.querySelectorAll('aside nav pwc-header-menu-item'),
    ) as HTMLElement[];

    const iconNames = items.map((el) => el.getAttribute('icon'));
    expect(iconNames).toEqual([
      'meter',
      'chart--column-floating',
      'earth',
      'wrench',
    ]);
  });

  it('sidebar uses Prism CSS variable for background colour', () => {
    const { container } = renderSidebar('/emissions');
    const aside = container.querySelector('aside') as HTMLElement | null;
    expect(aside).toBeInTheDocument();
    const style = aside?.getAttribute('style') ?? '';
    expect(style).toMatch(/var\(--alias-color-surface-default-default/);
  });
});
