// ─── HierarchyBrowser ─────────────────────────────────────────────────────────
import { useState } from 'react';
import type { HierarchyNode } from '../../types/emissions';
import { Badge } from '../common/Badge';

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

interface NodeRowProps {
  node: HierarchyNode;
  depth: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

function NodeRow({ node, depth, onSelect, selectedId }: NodeRowProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <>
      <tr
        className={`cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => onSelect(node.id)}
      >
        <td className="py-2 pl-4 pr-3 text-sm">
          <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button
                className="flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                aria-label={expanded ? 'Collapse' : 'Expand'}
              >
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                  {expanded ? (
                    <path d="M6 8L2 4h8l-4 4z" />
                  ) : (
                    <path d="M4 2l4 4-4 4V2z" />
                  )}
                </svg>
              </button>
            ) : (
              <span className="h-5 w-5" />
            )}
            <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
              {node.company_unit_name}
            </span>
          </div>
        </td>
        <td className="px-3 py-2 text-sm">
          <Badge variant={node.company_unit_type === 'site' ? 'success' : 'default'}>
            {node.company_unit_type}
          </Badge>
        </td>
        <td className="px-3 py-2 text-sm text-gray-500">{node.country ?? '—'}</td>
        <td className="px-3 py-2 text-right text-sm font-semibold text-gray-800">
          {fmt(node.total_co2e_tonnes)} t
        </td>
      </tr>
      {expanded &&
        node.children.map((child) => (
          <NodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
    </>
  );
}

interface HierarchyBrowserProps {
  root: HierarchyNode;
  onSelectUnit: (id: string) => void;
  selectedId: string | null;
}

export function HierarchyBrowser({ root, onSelectUnit, selectedId }: HierarchyBrowserProps) {
  return (
    <div data-prism="table" className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                Unit
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 w-24">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 w-32">
                Country
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500 w-32">
                tCO₂e
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <NodeRow node={root} depth={0} onSelect={onSelectUnit} selectedId={selectedId} />
          </tbody>
        </table>
      </div>
      <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-600">
        Click any row to view details
      </p>
    </div>
  );
}
