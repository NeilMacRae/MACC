// ─── EmissionsOverview ────────────────────────────────────────────────────────
import { useState } from 'react';
import { PrismOption, PrismSelect } from '../../prism';
import { Button } from '../common/Button';
import type { MarketFactorType } from '../../types/emissions';
import { useEmissionsOverview } from '../../hooks/useEmissions';
import { ScopeBarChart } from './ScopeBarChart';
import { LoadingSpinner } from '../layout/LoadingSpinner';
import { Badge } from '../common/Badge';
import type { QualityLevel } from '../common/QualityBadge';

interface EmissionsOverviewProps {
  year?: number;
  mft: MarketFactorType;
  onYearChange: (year: number) => void;
  onMftChange: (mft: MarketFactorType) => void;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function EmissionsOverview({ year, mft, onYearChange, onMftChange }: EmissionsOverviewProps) {
  const [qualityFilter, setQualityFilter] = useState<QualityLevel | 'all'>('all');
  const { data, isLoading, error } = useEmissionsOverview(year, mft);

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" label="Loading emissions…" /></div>;
  if (error || !data) return <div className="p-8 text-red-600 text-sm">Failed to load emissions data.</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {fmt(data.total_co2e_tonnes)} <span className="text-base font-normal text-gray-500">tCO₂e</span>
          </p>
          <p className="text-sm text-gray-500">{data.organisation_name} · {data.year}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quality filter */}
          <PrismSelect
            value={qualityFilter}
            onChange={(e) =>
              setQualityFilter((e.target as HTMLSelectElement).value as QualityLevel | 'all')
            }
          >
            <PrismOption value="all">All quality</PrismOption>
            <PrismOption value="Actual">Actual only</PrismOption>
            <PrismOption value="Estimated">Estimated only</PrismOption>
            <PrismOption value="Missing">Missing only</PrismOption>
          </PrismSelect>
          {/* Year selector */}
          <PrismSelect
            value={String(year ?? data.year)}
            onChange={(e) => onYearChange(Number((e.target as HTMLSelectElement).value))}
          >
            {data.available_years.map((y) => (
              <PrismOption key={y} value={String(y)}>
                {y}
              </PrismOption>
            ))}
          </PrismSelect>
          {/* Location / Market toggle */}
          <div className="flex gap-1">
            {(['Location', 'Market'] as const).map((t) => (
              <Button
                key={t}
                variant={mft === t ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onMftChange(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Scope chart + by_question_group */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div data-prism="card" className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Emissions by Scope</h3>
          <ScopeBarChart by_scope={data.by_scope} />
        </div>

        <div data-prism="card" className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">By Activity Category</h3>
          <div className="space-y-2">
            {data.by_question_group.map((qg) => (
              <div key={qg.question_group} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-gray-700">{qg.question_group}</span>
                    <span className="ml-2 text-gray-500">{qg.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${qg.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="w-24 text-right text-xs text-gray-500">
                  {fmt(qg.co2e_tonnes)} t
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top sources table */}
      <div data-prism="table" className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Top Emission Sources</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3 text-left">Activity</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-left">Scope</th>
                <th className="px-5 py-3 text-right">tCO₂e</th>
                <th className="px-5 py-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.top_sources.map((s) => (
                <tr key={s.source_id + s.scope} className="hover:bg-gray-50">
                  <td className="max-w-xs truncate px-5 py-3 text-gray-800">{s.activity}</td>
                  <td className="px-5 py-3 text-gray-500">{s.question_group}</td>
                  <td className="px-5 py-3">
                    <Badge variant={s.scope === 1 ? 'info' : s.scope === 2 ? 'purple' : 'default'}>
                      S{s.scope}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-800">{fmt(s.co2e_tonnes)}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{s.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
