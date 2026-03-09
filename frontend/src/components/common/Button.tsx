// ─── Button ───────────────────────────────────────────────────────────────────
// Prism-migrated: wraps @ecoonline/prism-web-components-react PrismButton.
//
// Variant mapping:
//   primary  → primary=true
//   secondary → secondary=true
//   ghost    → secondary=true (secondary styling without border emphasis)
//   danger   → critical=true  (+ secondary base)
//
// Size mapping: sm→small  md→medium  lg→large

import React from 'react';
import { PrismButton } from '../../prism';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  /** HTML name attribute forwarded to PrismButton for form submissions */
  name?: string;
  /** HTML value attribute forwarded to PrismButton for form submissions */
  value?: string;
}

const PRISM_SIZE: Record<ButtonSize, 'small' | 'medium' | 'large'> = {
  sm: 'small',
  md: 'medium',
  lg: 'large',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  leftIcon,
  rightIcon,
  children,
  onClick,
  type = 'button',
  name,
  value,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary' || variant === 'ghost';
  const isCritical = variant === 'danger';

  return (
    <PrismButton
      primary={isPrimary}
      secondary={isSecondary}
      critical={isCritical}
      size={PRISM_SIZE[size]}
      loading={loading}
      disabled={disabled || loading}
      type={type}
      name={name}
      value={value}
      onClick={onClick as unknown as (e: Event) => void}
      className={className}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </PrismButton>
  );
}
