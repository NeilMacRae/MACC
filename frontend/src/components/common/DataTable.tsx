// ─── DataTable ────────────────────────────────────────────────────────────────
// Prism-aligned: no PrismTable exists in the library; table is custom-built
// using Prism design tokens and structure.
// data-prism="table" marks the container as Prism-aligned.

import { useState } from 'react';
import { LoadingSpinner } from '../layout/LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface ColumnDef<T> {
  key: string;
  header: string;
  /** Render cell content. Receives the row item. */
  render: (item: T) => React.ReactNode;
  /** Width class (e.g. "w-32"). */
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
}

type SortDir = 'asc' | 'desc';

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No data',
  emptyDescription,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div
      data-prism="table"
      className="w-full overflow-hidden rounded-lg border border-[var(--core-color-monochrome-200,#e5e7eb)] bg-[var(--core-color-monochrome-0,#fff)]"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--core-color-monochrome-200,#e5e7eb)] bg-[var(--core-color-monochrome-50,#f9fafb)]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  role="columnheader"
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--core-color-monochrome-600,#6b7280)] ${
                    col.width ?? ''
                  } ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--core-color-monochrome-900,#111827)]' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg
                        data-testid="sort-indicator"
                        data-sort={sortDir}
                        className="h-3 w-3"
                        viewBox="0 0 12 12"
                        fill="currentColor"
                      >
                        {sortDir === 'asc' ? (
                          <path d="M6 2l4 6H2l4-6z" />
                        ) : (
                          <path d="M6 10L2 4h8l-4 6z" />
                        )}
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--core-color-monochrome-100,#f3f4f6)]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12">
                  <LoadingSpinner label="Loading data…" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={rowKey(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-[var(--core-color-blue-50,#eff6ff)]'
                      : 'hover:bg-[var(--core-color-monochrome-50,#f9fafb)]'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[var(--core-color-monochrome-900,#111827)]">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
