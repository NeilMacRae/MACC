/**
 * T025 — Unit tests for Prism-migrated Button component (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until Button is migrated to PrismButton (T029).
 * Tests verify the component renders the Prism web component wrapper.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button } from '../../../../src/components/common/Button';

function getPrismButton(container: HTMLElement) {
  const el = container.querySelector('pwc-button');
  expect(el).not.toBeNull();
  return el as HTMLElement;
}

describe('Button (Prism-migrated)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Prism integration check ───────────────────────────────────────────────

  it('renders a PrismButton (data-testid="prism-button") element', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(getPrismButton(container)).toBeInTheDocument();
  });

  it('renders children text inside the button', () => {
    render(<Button>Save changes</Button>);
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  // ── Variants ─────────────────────────────────────────────────────────────

  it('sets data-primary="true" for primary variant', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    expect(getPrismButton(container)).toHaveAttribute('primary', 'true');
  });

  it('sets data-secondary="true" for secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expect(getPrismButton(container)).toHaveAttribute('secondary', 'true');
  });

  it('sets data-critical="true" for danger variant', () => {
    const { container } = render(<Button variant="danger">Danger</Button>);
    expect(getPrismButton(container)).toHaveAttribute('critical', 'true');
  });

  it('sets neither primary nor critical for ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const btn = getPrismButton(container);
    // False boolean props must be absent — a present attribute (even "false") is
    // truthy in Lit's type:Boolean converter, which would break rendering.
    expect(btn).not.toHaveAttribute('primary');
    expect(btn).not.toHaveAttribute('critical');
    expect(btn).toHaveAttribute('secondary', 'true');
  });

  it('defaults to primary variant when no variant specified', () => {
    const { container } = render(<Button>Default</Button>);
    expect(getPrismButton(container)).toHaveAttribute('primary', 'true');
  });

  // ── Sizes ─────────────────────────────────────────────────────────────────

  it('sets data-size="small" for sm size', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    expect(getPrismButton(container)).toHaveAttribute('size', 'small');
  });

  it('sets data-size="medium" for md size', () => {
    const { container } = render(<Button size="md">Medium</Button>);
    expect(getPrismButton(container)).toHaveAttribute('size', 'medium');
  });

  it('sets data-size="large" for lg size', () => {
    const { container } = render(<Button size="lg">Large</Button>);
    expect(getPrismButton(container)).toHaveAttribute('size', 'large');
  });

  it('defaults to medium size when no size specified', () => {
    const { container } = render(<Button>Default size</Button>);
    expect(getPrismButton(container)).toHaveAttribute('size', 'medium');
  });

  // ── Disabled state ────────────────────────────────────────────────────────

  it('sets disabled when disabled prop is true', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(getPrismButton(container)).toHaveAttribute('disabled', 'true');
  });

  it('does not disable button when disabled is false', () => {
    const { container } = render(<Button disabled={false}>Active</Button>);
    // Absent attribute (not "false" string) so Lit correctly reads disabled=false.
    expect(getPrismButton(container)).not.toHaveAttribute('disabled');
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('sets data-loading="true" when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(getPrismButton(container)).toHaveAttribute('loading', 'true');
  });

  it('disables the button when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    expect(getPrismButton(container)).toHaveAttribute('disabled', 'true');
  });

  // ── Click handler ─────────────────────────────────────────────────────────

  it('calls onClick when the button is clicked', () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Click</Button>);
    const btn = getPrismButton(container);
    // PrismButton now listens for native 'click' (composed:true from shadow DOM)
    // rather than the 'p-click' Prism custom event.
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('passes onClick handler through to PrismButton', () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Click me</Button>);
    const btn = getPrismButton(container);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
