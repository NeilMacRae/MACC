/**
 * InitiativeTable — sortable, filterable list of abatement initiatives.
 *
 * Features
 * --------
 * - Sortable columns: name, cost_per_tonne, co2e_reduction, status, owner
 * - Filter by status and initiative_type
 * - Pagination (client-side links → updates filters passed to useInitiatives)
 * - Row click → opens edit modal
 * - Status badge with colour coding
 * - Confidence badge
 */

import { useState } from "react";
import { PrismOption, PrismSelect } from "../../prism";
import { Button } from "../common/Button";
import { useInitiatives } from "../../hooks/useInitiatives";
import type {
  InitiativeFilters,
  InitiativeListItem,
  InitiativeStatus,
} from "../../types/initiatives";

interface Props {
  onEdit: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const STATUS_COLOURS: Record<InitiativeStatus, string> = {
  idea: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  approved: "bg-indigo-100 text-indigo-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

const CONFIDENCE_COLOURS: Record<string, string> = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-red-600",
};

const ALL_STATUSES = [
  "idea",
  "planned",
  "approved",
  "in_progress",
  "completed",
  "rejected",
];

export function InitiativeTable({ onEdit, onSelect, selectedId }: Props) {
  const [filters, setFilters] = useState<InitiativeFilters>({
    sort_by: "cost_per_tonne",
    sort_order: "asc",
    page: 1,
    page_size: 20,
  });

  const { data, isLoading, isError } = useInitiatives(filters);

  function setSort(col: InitiativeFilters["sort_by"]) {
    setFilters((f) => ({
      ...f,
      sort_by: col,
      sort_order: f.sort_by === col && f.sort_order === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  function SortIndicator({ col }: { col: string }) {
    if (filters.sort_by !== col) return <span className="text-gray-300"> ↕</span>;
    return (
      <span className="text-blue-500">
        {filters.sort_order === "asc" ? " ↑" : " ↓"}
      </span>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading initiatives…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-red-500">
        Failed to load initiatives.
      </div>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;

  return (
    <div data-prism="table" className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <PrismSelect
          value={filters.status ?? ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target as HTMLSelectElement).value || undefined, page: 1 }))
          }
        >
          <PrismOption value="">All statuses</PrismOption>
          {ALL_STATUSES.map((s) => (
            <PrismOption key={s} value={s}>
              {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
            </PrismOption>
          ))}
        </PrismSelect>

        {/* Type filter */}
        <PrismSelect
          value={filters.initiative_type ?? ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              initiative_type: ((e.target as HTMLSelectElement).value as "custom" | "ai_suggested") || undefined,
              page: 1,
            }))
          }
        >
          <PrismOption value="">All types</PrismOption>
          <PrismOption value="custom">Custom</PrismOption>
          <PrismOption value="ai_suggested">AI-suggested</PrismOption>
        </PrismSelect>

        <span className="ml-auto text-xs text-gray-600">
          {total} initiative{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
          No initiatives found. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200" tabIndex={0} role="region" aria-label="Initiatives table">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <Th onClick={() => setSort("name")}>
                  Name <SortIndicator col="name" />
                </Th>
                <Th onClick={() => setSort("cost_per_tonne")}>
                  £/tCO₂e <SortIndicator col="cost_per_tonne" />
                </Th>
                <Th onClick={() => setSort("co2e_reduction")}>
                  Abatement (annual) <SortIndicator col="co2e_reduction" />
                </Th>
                <Th onClick={() => setSort("cost")}>
                  CapEx <SortIndicator col="cost" />
                </Th>
                <Th>Status</Th>
                <Th>Owner</Th>
                <Th>Confidence</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((row) => (
                <InitiativeRow
                  key={row.id}
                  row={row}
                  isSelected={selectedId === row.id}
                  onEdit={onEdit}
                  onSelect={onSelect}
                  statusColours={STATUS_COLOURS}
                  confidenceColours={CONFIDENCE_COLOURS}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) }))
            }
          >
            ← Prev
          </Button>
          <span className="text-xs text-gray-500">
            Page {filters.page ?? 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                page: Math.min(totalPages, (f.page ?? 1) + 1),
              }))
            }
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      scope="col"
      onClick={onClick}
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 ${
        onClick ? "cursor-pointer select-none hover:text-gray-700" : ""
      }`}
    >
      {children}
    </th>
  );
}

interface RowProps {
  row: InitiativeListItem;
  isSelected: boolean;
  onEdit: (id: string) => void;
  onSelect: (id: string) => void;
  statusColours: Record<InitiativeStatus, string>;
  confidenceColours: Record<string, string>;
}

function InitiativeRow({
  row,
  isSelected,
  onEdit,
  onSelect,
  statusColours,
  confidenceColours,
}: RowProps) {
  return (
    <tr
      className={`cursor-pointer transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
      onClick={() => onSelect(row.id)}
      onDoubleClick={() => onEdit(row.id)}
    >
      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-900">
        <span>{row.name}</span>
        {row.initiative_type === "ai_suggested" && (
          <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
            AI
          </span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-gray-700">
        {row.cost_per_tonne < 0 ? (
          <span className="text-emerald-600 font-medium">
            −£{Math.abs(row.cost_per_tonne).toFixed(0)}
          </span>
        ) : (
          <span>£{row.cost_per_tonne.toFixed(0)}</span>
        )}
      </td>
      <td className="px-4 py-3 tabular-nums text-gray-700">
        {row.co2e_reduction_annual_tonnes.toLocaleString("en-GB", {
          maximumFractionDigits: 1,
        })}{" "}
        t
      </td>
      <td className="px-4 py-3 tabular-nums text-gray-700">
        £
        {row.capex_gbp.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColours[row.status]}`}
        >
          {row.status.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-700">
        {row.owner ?? <span className="text-gray-300">—</span>}
      </td>
      <td
        className={`px-4 py-3 capitalize text-xs font-medium ${confidenceColours[row.confidence ?? ""] ?? "text-gray-400"}`}
      >
        {row.confidence ?? "—"}
      </td>
    </tr>
  );
}
