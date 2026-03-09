// ─── LoadingSpinner ───────────────────────────────────────────────────────────
// Prism-migrated: wraps @ecoonline/prism-web-components-react PrismSpinner.

import { PrismSpinner } from '../../prism';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" role="status" aria-label={label}>
      <PrismSpinner />
      {label && <span className="text-sm text-[var(--core-color-monochrome-500,#6b7280)]">{label}</span>}
    </div>
  );
}
