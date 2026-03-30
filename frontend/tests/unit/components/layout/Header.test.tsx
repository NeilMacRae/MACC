/**
 * T053 — Unit tests: Prism Header component (US4)
 *
 * Verifies Header renders title, subtitle, and actions correctly,
 * and uses Prism-aligned CSS variable styling.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Header } from '../../../../src/components/layout/Header';

describe('Header', () => {
  it('renders the title as an h1', () => {
    render(<Header title="Emissions" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Emissions' })).toBeInTheDocument();
  });

  it('renders the optional subtitle when provided', () => {
    render(<Header title="Emissions" subtitle="Scope 1, 2 and 3" />);
    expect(screen.getByText('Scope 1, 2 and 3')).toBeInTheDocument();
  });

  it('does not render a subtitle element when not provided', () => {
    render(<Header title="MACC Modelling" />);
    // No paragraph besides the title area
    expect(screen.queryByText(/Scope/)).toBeNull();
  });

  it('renders actions slot content', () => {
    render(<Header title="Context" actions={<button>Save</button>} />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('uses a semantic <header> element with Prism tokens', () => {
    const { container } = render(<Header title="Settings" />);
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();

    // Prism-aligned: inline styles should reference Prism CSS variables.
    // (We don't assert exact values to avoid brittle styling tests.)
    expect(header?.innerHTML ?? '').toMatch(/var\(--alias-color-text-default/);
  });
});
