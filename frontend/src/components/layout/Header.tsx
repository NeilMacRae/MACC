// ─── Page section header ──────────────────────────────────────────────────────
// Per-page title bar rendered at the top of each page's content area.
// PrismHeader (pwc-header) is the app-wide branded top bar in PageLayout;
// this component is the semantic page-title heading below it.

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="px-6 pt-6 pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--alias-color-text-default, #16191d)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-0.5 text-sm"
              style={{ color: 'var(--alias-color-text-reduced, #566576)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
