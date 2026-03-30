// ─── EmissionsPage ────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { EmissionsOverview } from '../components/emissions/EmissionsOverview';
import { HierarchyBrowser } from '../components/emissions/HierarchyBrowser';
import { UnitDetail } from '../components/emissions/UnitDetail';
import { TrendChart } from '../components/emissions/TrendChart';
import { LoadingSpinner } from '../components/layout/LoadingSpinner';
import { useHierarchy } from '../hooks/useEmissions';
import type { MarketFactorType } from '../types/emissions';

type Tab = 'overview' | 'hierarchy' | 'trends';

export function EmissionsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [mft, setMft] = useState<MarketFactorType>('Location');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const { data: hierarchyData, isLoading: hierarchyLoading } = useHierarchy(year, mft);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'trends', label: 'Trends' },
  ];

  return (
    <>
      <Header
        title="Emissions Profile"
        subtitle="Explore your organisation's emissions across all scopes and the hierarchy"
      />

      {/* Tab bar */}
      <div className="px-6 mt-4">
        <div role="tablist" aria-label="Emissions sections" className="flex border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`emissions-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`emissions-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div id="emissions-panel-overview" role="tabpanel" aria-labelledby="emissions-tab-overview">
          <EmissionsOverview
            year={year}
            mft={mft}
            onYearChange={setYear}
            onMftChange={setMft}
          />
        </div>
      )}

      {tab === 'hierarchy' && (
        <div id="emissions-panel-hierarchy" role="tabpanel" aria-labelledby="emissions-tab-hierarchy" className="p-6">
          {hierarchyLoading ? (
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" label="Loading hierarchy…" />
            </div>
          ) : hierarchyData ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              {/* Tree */}
              <div className="xl:col-span-3">
                <HierarchyBrowser
                  root={hierarchyData.root}
                  onSelectUnit={setSelectedUnitId}
                  selectedId={selectedUnitId}
                />
              </div>
              {/* Detail panel */}
              <div className="xl:col-span-2">
                {selectedUnitId ? (
                  <div className="rounded-lg border border-gray-200 bg-white overflow-y-auto max-h-[70vh]">
                    <UnitDetail
                      unitId={selectedUnitId}
                      year={year}
                      mft={mft}
                      onNavigate={setSelectedUnitId}
                    />
                  </div>
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-600">
                    Select a unit to see details
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">Failed to load hierarchy.</p>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div id="emissions-panel-trends" role="tabpanel" aria-labelledby="emissions-tab-trends" className="p-6 space-y-6">
          {/* Org-wide trends */}
          <TrendChart mft={mft} />
          {/* Unit-specific if selected */}
          {selectedUnitId && (
            <TrendChart unitId={selectedUnitId} mft={mft} />
          )}
          {!selectedUnitId && (
            <p className="text-sm text-gray-600">
              Select a unit in the Hierarchy tab to see unit-level trends.
            </p>
          )}
        </div>
      )}
    </>
  );
}
