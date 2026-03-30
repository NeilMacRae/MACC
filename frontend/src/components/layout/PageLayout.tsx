// ─── PageLayout ────────────────────────────────────────────────────────────────
// Prism-migrated (Phase 6 / US4):
//   - PrismHeader (pwc-header) is the app-wide branded top bar — EcoOnline logo
//     on the left, navigation slot on the right — placed here so it spans the
//     full viewport width above the sidebar+content area.
//   - Sidebar is the left-side section nav below the top bar.
//   - No PrismLayout component exists in the library; custom flex structure per research.md.
import { Sidebar } from './Sidebar';
import { PrismHeader } from '../../prism';

interface PageLayoutProps {
  children: React.ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--alias-color-background-default, #f6f7f8)' }}
    >
      {/* App-wide branded top bar — EcoOnline logo + navigation menus */}
      <PrismHeader
        logoUrl="/"
        style={{ borderBottom: '1px solid var(--alias-color-divider-default, #b1bac5)' }}
      />

      {/* Sidebar + main content below the top bar */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
