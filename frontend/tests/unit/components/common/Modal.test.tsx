/**
 * T026 — Unit tests for Prism-migrated Modal component (TDD: written BEFORE implementation)
 *
 * These tests MUST FAIL until Modal is migrated to PrismDialog (T030).
 * Tests verify the component renders the Prism dialog web component wrapper.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Modal } from '../../../../src/components/common/Modal';

function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  return render(
    <Modal open={true} onClose={vi.fn()} title="Test Modal" {...props}>
      <p>Modal body content</p>
    </Modal>,
  );
}

describe('Modal (Prism-migrated)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Prism integration check ───────────────────────────────────────────────

  it('renders a PrismDialog (data-testid="prism-dialog") when open', () => {
    const { container } = renderModal({ open: true });
    expect(container.querySelector('pwc-dialog')).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    const { container } = renderModal({ open: false });
    expect(container.querySelector('pwc-dialog')).not.toBeInTheDocument();
  });

  // ── Title ─────────────────────────────────────────────────────────────────

  it('passes the title as the dialog label', () => {
    const { container } = renderModal({ title: 'Edit Initiative' });
    const dialog = container.querySelector('pwc-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('label', 'Edit Initiative');
  });

  it('displays the title text', () => {
    // The Prism dialog renders its header in shadow DOM.
    // We only assert the label attribute is set.
    const { container } = renderModal({ title: 'Create Scenario' });
    const dialog = container.querySelector('pwc-dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('label', 'Create Scenario');
  });

  // ── Children ──────────────────────────────────────────────────────────────

  it('renders children inside the dialog', () => {
    renderModal();
    expect(screen.getByText('Modal body content')).toBeInTheDocument();
  });

  it('renders custom footer content', () => {
    renderModal({
      footer: <button>Save</button>,
    });
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  // ── Close behaviour ───────────────────────────────────────────────────────

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const dialog = container.querySelector('pwc-dialog');
    expect(dialog).toBeInTheDocument();
    dialog?.dispatchEvent(new CustomEvent('p-request-close', { bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the backdrop overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = renderModal({ onClose });
    const dialog = container.querySelector('pwc-dialog');
    expect(dialog).toBeInTheDocument();
    dialog?.dispatchEvent(new CustomEvent('p-request-close', { bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
