/**
 * T053 — Unit tests: Prism PageLayout component (US4)
 *
 * Verifies PageLayout renders the sidebar and the main content area.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { PageLayout } from '../../../../src/components/layout/PageLayout';

function renderLayout(children: React.ReactNode = <p>Page content</p>) {
  return render(
    <MemoryRouter initialEntries={['/emissions']}>
      <PageLayout>{children}</PageLayout>
    </MemoryRouter>,
  );
}

describe('PageLayout', () => {
  it('renders an <aside> sidebar', () => {
    const { container } = renderLayout();
    expect(container.querySelector('aside')).toBeInTheDocument();
  });

  it('renders a <main> content area', () => {
    renderLayout(<p>Hello world</p>);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('renders children inside the main content area', () => {
    renderLayout(<p>Page content</p>);
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('uses Prism background token on the root container', () => {
    const { container } = renderLayout();
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).toBeInTheDocument();
    const style = root?.getAttribute('style') ?? '';
    expect(style).toMatch(/var\(--/);
  });
});
