// ─── UnitDetail ───────────────────────────────────────────────────────────────
import type { MarketFactorType } from '../../types/emissions';
import { useUnitDetail } from '../../hooks/useEmissions';
import { ScopeBarChart } from './ScopeBarChart';
import { LoadingSpinner } from '../layout/LoadingSpinner';
import { Badge } from '../common/Badge';

interface UnitDetailProps {
  unitId: string;
  year?: number;
  mft: MarketFactorType;
  onNavigate: (unitId: string) => void;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function UnitDetail({ unitId, year, mft, onNavigate }: UnitDetailProps) {
  const { data, isLoading, error } = useUnitDetail(unitId, year, mft);

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner label="Loading unit…" /></div>;
  if (error || !data) return <div className="p-6 text-red-600 text-sm">Failed to load unit details.</div>;

  return (
    <div className="space-y-5 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">{data.company_unit_name}</h2>
            <Badge variant={data.company_unit_type === 'site' ? 'success' : 'default'}>
              {data.company_unit_type}
            </Badge>
          </div>
          {(data.city ?? data.country) && (
            <p className="text-sm text-gray-500">
              {[data.city, data.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{fmt(data.total_co2e_tonnes)}</p>
          <p className="text-xs text-gray-500">tCO₂e · {data.market_factor_type}</p>
        </div>
      </div>

      {/* Scope breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Scope Breakdown</h3>
        <ScopeBarChart by_scope={data.by_scope} />
      </div>

      {/* Child units (for divisions) */}
      {data.child_units.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Child Units</h3>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {data.child_units.map((cu) => (
                <tr
                  key={cu.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => onNavigate(cu.id)}
                >
                  <td className="px-5 py-3 font-medium text-blue-700">{cu.company_unit_name}</td>
                  <td className="px-5 py-3">
                    <Badge variant={cu.company_unit_type === 'site' ? 'success' : 'default'}>
                      {cu.company_unit_type}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">
                    {fmt(cu.total_co2e_tonnes)} t
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Emission sources (for sites) */}
      {data.sources.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Emission Sources</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 text-left">Activity</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-left">Scopes</th>
                  <th className="px-5 py-3 text-left">Unit</th>
                  <th className="px-5 py-3 text-right">tCO₂e</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.sources.map((src) => (
                  <tr key={src.id} className="hover:bg-gray-50">
                    <td className="max-w-xs truncate px-5 py-3 text-gray-800">{src.activity}</td>
                    <td className="px-5 py-3 text-gray-500">{src.question_group}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        {src.scopes.map((s) => (
                          <Badge
                            key={s}
                            variant={s === 1 ? 'info' : s === 2 ? 'purple' : 'default'}
                          >
                            S{s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{src.answer_unit}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-800">
                      {fmt(src.co2e_tonnes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By question group */}
      {data.by_question_group.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">By Activity Category</h3>
          <div className="space-y-2">
            {data.by_question_group.map((qg) => (
              <div key={qg.question_group} className="flex items-center gap-3">
                <span className="w-40 truncate text-xs text-gray-700">{qg.question_group}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-400"
                    style={{ width: `${qg.percentage}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs text-gray-500">
                  {fmt(qg.co2e_tonnes)} t
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
