// ─── EmptyState ───────────────────────────────────────────────────────────────
// Prism-aligned: no PrismEmptyState exists; compose with PrismIcon when icon
// is provided. Uses Prism design tokens for spacing and colours.

import { PrismIcon } from '../../prism';

interface EmptyStateProps {
  /** Prism icon name (e.g. "folder-open") or a React element for a custom icon */
  icon?: string | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const iconElement =
    typeof icon === 'string' ? (
      <PrismIcon icon={icon} size="2em" />
    ) : (
      icon
    );

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      {iconElement && (
        <div className="text-[var(--core-color-monochrome-300,#d1d5db)]">
          {iconElement}
        </div>
      )}
      <div>
        <h3 className="text-sm font-medium text-[var(--core-color-monochrome-900,#111827)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--core-color-monochrome-500,#6b7280)]">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
