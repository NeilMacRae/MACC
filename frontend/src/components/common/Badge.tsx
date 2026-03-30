// ─── Badge ────────────────────────────────────────────────────────────────────
// Prism-migrated: wraps @ecoonline/prism-web-components-react PrismBadge.
//
// PrismBadge variants: 'primary' | 'success' | 'neutral' | 'warning' | 'danger'
//
// Variant mapping:
//   default  → 'neutral'
//   success  → 'success'
//   warning  → 'warning'
//   danger   → 'danger'
//   info     → 'primary'
//   purple   → 'primary' (no purple in Prism; use primary as closest)

import { PrismBadge } from '../../prism';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const PRISM_VARIANT: Record<BadgeVariant, 'primary' | 'success' | 'neutral' | 'warning' | 'danger'> = {
  default: 'neutral',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'primary',
  purple: 'primary',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <PrismBadge variant={PRISM_VARIANT[variant]} pill className={className}>
      {children}
    </PrismBadge>
  );
}
