/**
 * T027 — Unit tests for Prism-migrated DataTable component (TDD: written BEFORE implementation)
 *
 * DataTable has no direct Prism equivalent — it is rebuilt as a custom
 * Prism-aligned table component. Tests verify the behavioral contract and
 * structural requirements of the migrated component.
 *
 * Some tests already pass with the current implementation (behavioral contract).
 * Tests checking Prism-specific structure (e.g. data-prism attribute) will FAIL
 * until T031 migration is complete.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DataTable } from '../../../../src/components/common/DataTable';
import type { ColumnDef } from '../../../../src/components/common/DataTable';

// ── Fixture data ─────────────────────────────────────────────────────────────

interface Row {
  id: string;
  name: string;
  value: number;
}

const columns: ColumnDef<Row>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (item) => item.name,
    sortable: true,
  },
  {
    key: 'value',
    header: 'Value',
    render: (item) => String(item.value),
  },
];

const rows: Row[] = [
  { id: '1', name: 'Alpha', value: 100 },
  { id: '2', name: 'Beta', value: 200 },
  { id: '3', name: 'Gamma', value: 50 },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(item) => item.id}
      {...props}
    />,
  );
}

describe('DataTable (Prism-aligned)', () => {
  // ── Prism integration marker ─────────────────────────────────────────────
  // The migrated DataTable must include a data-prism attribute to confirm
  // it uses Prism design tokens and is Prism-aligned.
  it('has data-prism="table" attribute on the root container', () => {
    const { container } = renderTable();
    expect(container.querySelector('[data-prism="table"]')).toBeInTheDocument();
  });

  // ── Column rendering ──────────────────────────────────────────────────────

  it('renders column headers', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
  });

  it('renders the correct number of header cells', () => {
    renderTable();
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(2);
  });

  // ── Row rendering ──────────────────────────────────────────────────────────

  it('renders all data rows', () => {
    renderTable();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders the correct number of rows', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    // 1 header row + 3 data rows
    expect(rows).toHaveLength(4);
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it('renders the empty state when data array is empty', () => {
    renderTable({ data: [], emptyTitle: 'No results found' });
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders the empty description when provided', () => {
    renderTable({
      data: [],
      emptyTitle: 'No items',
      emptyDescription: 'Add an item to get started',
    });
    expect(screen.getByText('Add an item to get started')).toBeInTheDocument();
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it('renders a sort indicator on sortable columns', () => {
    renderTable();
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    // After clicking a sortable header, a sort indicator should be visible.
    // The indicator must be present for sortable columns once sorted.
    const indicator = nameHeader.closest('th')?.querySelector('[data-testid="sort-indicator"]');
    expect(indicator).toBeInTheDocument();
  });

  it('toggles sort direction on repeated clicks of a sortable column', () => {
    renderTable();
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    const ascIndicator = nameHeader.closest('th')?.querySelector('[data-sort="asc"]');
    expect(ascIndicator).toBeInTheDocument();

    fireEvent.click(nameHeader);
    const descIndicator = nameHeader.closest('th')?.querySelector('[data-sort="desc"]');
    expect(descIndicator).toBeInTheDocument();
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it('renders a loading indicator when loading prop is true', () => {
    renderTable({ loading: true });
    // Loading state should suppress data rows
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  // ── Row click ─────────────────────────────────────────────────────────────

  it('calls onRowClick with the correct row when a row is clicked', () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    fireEvent.click(screen.getByText('Alpha'));
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
