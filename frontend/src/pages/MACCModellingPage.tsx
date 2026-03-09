/**
 * MACCModellingPage — Tabbed hub for MACC Modelling (FR-001 through FR-015).
 *
 * Three in-page tabs: Initiatives, Scenarios, Targets.
 * Tab state is encoded in the URL query parameter `?tab=`.
 *
 * Contract: specs/003-prism-frontend-redesign/contracts/tab-component.md
 *           specs/003-prism-frontend-redesign/contracts/routing.md
 *
 * Key behaviours:
 *  - Missing/invalid `?tab=` → normalised to `?tab=initiatives` (FR-011)
 *  - Tab panels stay mounted when inactive (hidden via display:none) (FR-012)
 *  - URL updated with `replace: true` on tab switch (no history pollution)
 *  - Browser back/forward and page refresh restore the active tab
 */

import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabBar } from '../components/macc/TabBar';
import { InitiativesTab } from '../components/macc/InitiativesTab';
import { ScenariosTab } from '../components/macc/ScenariosTab';
import { TargetsTab } from '../components/macc/TargetsTab';
import { Header } from '../components/layout/Header';
import type { MACCModellingTab } from '../components/macc/TabBar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_TABS: ReadonlySet<string> = new Set<MACCModellingTab>([
  'initiatives',
  'scenarios',
  'targets',
]);

const TAB_PANELS: Array<{
  id: MACCModellingTab;
  Component: () => React.ReactElement;
}> = [
  { id: 'initiatives', Component: InitiativesTab },
  { id: 'scenarios', Component: ScenariosTab },
  { id: 'targets', Component: TargetsTab },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MACCModellingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const activeTab: MACCModellingTab = VALID_TABS.has(rawTab ?? '')
    ? (rawTab as MACCModellingTab)
    : 'initiatives';

  // FR-011: Actively normalise URL when ?tab= is missing or unrecognised.
  useEffect(() => {
    if (!rawTab || !VALID_TABS.has(rawTab)) {
      setSearchParams({ tab: 'initiatives' }, { replace: true });
    }
  }, [rawTab, setSearchParams]);

  function handleTabChange(tab: MACCModellingTab) {
    setSearchParams({ tab }, { replace: true });
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header
        title="MACC Modelling"
        subtitle="Manage initiatives, build scenarios, and track emission targets in one place"
      />

      {/* Tab bar */}
      <div className="px-6 mt-4">
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      {/* Tab panels — all mounted; inactive panels hidden via display:none */}
      <div className="flex-1">
        {TAB_PANELS.map(({ id, Component }) => (
          <div
            key={id}
            role="tabpanel"
            id={`panel-${id}`}
            aria-labelledby={`tab-${id}`}
            style={{ display: activeTab === id ? 'block' : 'none' }}
          >
            <Component />
          </div>
        ))}
      </div>
    </div>
  );
}
