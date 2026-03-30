/**
 * T065 — Unit tests for Prism-migrated ContextForm (US6)
 */

import { render, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContextForm } from '../../../../src/components/context/ContextForm';

function setPrismInputValue(el: HTMLElement, value: string) {
  (el as any).value = value;
  fireEvent(el, new CustomEvent('p-input', { bubbles: true, composed: true }));
}

function setPrismSelectValue(el: HTMLElement, value: string) {
  (el as any).value = value;
  fireEvent(el, new CustomEvent('p-change', { bubbles: true, composed: true }));
}

describe('ContextForm (Prism-migrated)', () => {
  it('renders Prism inputs/select/textarea', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ContextForm initial={null} onSave={onSave} isSaving={false} />,
    );

    expect(container.querySelector('pwc-input[label="Industry sector"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-select[label="Sustainability maturity"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-input[label="Employee count"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-input[label="Net-zero target year"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-input[label="Annual revenue (£)"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-input[label="Sustainability budget constraint (£)"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-input[label="Operating geographies"]')).toBeInTheDocument();
    expect(container.querySelector('pwc-textarea[label="Notes"]')).toBeInTheDocument();

    expect(container.querySelector('pwc-button')).toBeInTheDocument();
  });

  it('shows a Prism alert validation error on invalid submission', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ContextForm initial={null} onSave={onSave} isSaving={false} />,
    );

    const employee = container.querySelector(
      'pwc-input[label="Employee count"]',
    ) as HTMLElement;
    expect(employee).not.toBeNull();

    setPrismInputValue(employee, '-2');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      const alert = container.querySelector('pwc-alert');
      expect(alert).not.toBeNull();
      expect(alert).toHaveTextContent('Employee count must be a positive integer');
    });

    await waitFor(() => expect(onSave).not.toHaveBeenCalled());
  });

  it('calls onSave with parsed data on valid submission', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ContextForm initial={null} onSave={onSave} isSaving={false} />,
    );

    setPrismInputValue(
      container.querySelector('pwc-input[label="Industry sector"]') as HTMLElement,
      'Manufacturing',
    );
    setPrismInputValue(
      container.querySelector('pwc-input[label="Employee count"]') as HTMLElement,
      '2500',
    );
    setPrismSelectValue(
      container.querySelector('pwc-select[label="Sustainability maturity"]') as HTMLElement,
      'intermediate',
    );
    setPrismInputValue(
      container.querySelector('pwc-input[label="Net-zero target year"]') as HTMLElement,
      '2030',
    );

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        industry_sector: 'Manufacturing',
        employee_count: 2500,
        sustainability_maturity: 'intermediate',
        target_year: 2030,
      });
    });
  });
});
