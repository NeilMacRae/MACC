// ─── Sidebar navigation ───────────────────────────────────────────────────────
// Prism-migrated (Phase 6 / US4):
//   - PrismHeaderMenuItem (pwc-header-menu-item) used for every nav item —
//     provides Prism hover states, icon slot, and accessible markup out of the box
//   - White sidebar background follows the Prism surface token
//   - Active state applied to the host element; the item's transparent inner
//     background renders the host colour, yielding the Prism selected-surface look
//   - No PrismSideNav component exists in the package; <aside> retained per research.md

import { useNavigate, useLocation } from 'react-router-dom';
import { PrismHeaderMenuItem } from '../../prism';

interface NavItem {
  to: string;
  label: string;
  /** Prism icon name forwarded to pwc-header-menu-item's `icon` attribute. */
  icon: string;
}

const navItems: NavItem[] = [
  { to: '/emissions', label: 'Emissions',      icon: 'meter' },
  { to: '/macc',      label: 'MACC Modelling', icon: 'chart--column-floating' },
  { to: '/context',   label: 'Context',        icon: 'earth' },
  { to: '/settings',  label: 'Settings',       icon: 'wrench' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside
      className="flex h-screen w-60 flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--alias-color-surface-default-default, #fff)',
        borderRight: '1px solid var(--alias-color-divider-default, #b1bac5)',
      }}
    >
      {/* Brand label */}
      <div
        className="flex h-14 flex-shrink-0 items-center px-4"
        style={{ borderBottom: '1px solid var(--alias-color-divider-default, #b1bac5)' }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--alias-color-text-default, #16191d)' }}
        >
          MACC Modelling
        </span>
      </div>

      {/* Navigation — each item is a pwc-header-menu-item web component */}
      <nav
        className="flex flex-1 flex-col overflow-y-auto py-2"
        aria-label="Main navigation"
      >
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.to);
          return (
            <PrismHeaderMenuItem
              key={item.to}
              label={item.label}
              icon={item.icon}
              onClick={() => navigate(item.to)}
              // Active state: set background on the host element; the inner
              // button/anchor has transparent background so the host colour shows.
              style={{
                display: 'block',
                ...(isActive && {
                  backgroundColor:
                    'var(--alias-color-surface-selected-default, #e5e7ff)',
                }),
              }}
              aria-current={isActive ? 'page' : undefined}
            />
          );
        })}
      </nav>
    </aside>
  );
}

