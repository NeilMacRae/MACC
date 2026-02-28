// ─── DataTable ────────────────────────────────────────────────────────────────
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
    <div className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ${
                    col.width ?? ''
                  } ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
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
          <tbody className="divide-y divide-gray-100">
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
                    onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.width ?? ''}`}>
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
