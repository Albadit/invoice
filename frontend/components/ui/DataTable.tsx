'use client';

import { type ReactNode, useCallback, useState, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from '@heroui/table';
import type { SortDescriptor, Selection } from '@heroui/table';
import { Button } from '@heroui/button';
import { X, ArrowUpDown } from 'lucide-react';
import type { ActionItem } from './ActionDropdown';

// ─── Types ──────────────────────────────────────────────────────

export interface DataTableColumn<T> {
  /** Unique key matching the data field or a custom identifier */
  key: string;
  /** Column header label */
  label: ReactNode;
  /** Enable sorting on this column */
  allowsSorting?: boolean;
  /** Extra className applied to the <TableColumn> */
  className?: string;
  /**
   * Custom cell renderer. Receives the row item and returns a ReactNode.
   * When omitted the component renders `String(item[key])`.
   */
  render?: (item: T) => ReactNode;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  color?: ActionItem['color'];
  className?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  onClick: (selectedKeys: Set<string>) => void;
}

export interface DataTableProps<T> {
  /** Accessible label for the table */
  ariaLabel: string;
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  data: T[];
  /** Unique key extractor per row — a field name string or a function. Defaults to 'id'. */
  rowKey?: string | ((item: T) => string);
  /** Whether data is currently loading (applies opacity) */
  loading?: boolean;
  /** Content shown when there are no rows */
  emptyContent?: ReactNode;
  /** Content shown while loading */
  loadingContent?: ReactNode;
  /** Whether the TableBody is in a loading state (shows loadingContent) */
  isLoading?: boolean;

  // ── Selection ────────────────────────────────────────────────
  /** Enable row selection. Defaults to 'none'. */
  selectionMode?: 'none' | 'single' | 'multiple';
  /** Controlled selected keys. */
  selectedKeys?: Selection;
  /** Called when selection changes. */
  onSelectionChange?: (keys: Selection) => void;
  /** Bulk actions shown in the floating bar when rows are selected. */
  bulkActions?: BulkAction[];
  /** Label for selected count, e.g. "{{count}} selected". Use {{count}} placeholder. */
  selectedLabel?: string;
  /** Row keys that cannot be selected when selectionMode is enabled. */
  disabledKeys?: Iterable<string>;

  // ── Sorting ──────────────────────────────────────────────────
  /**
   * Multi-sort descriptors array. When provided externally the component is "controlled".
   * When omitted the component manages its own multi-sort state internally and sorts data client-side.
   */
  sortDescriptors?: SortDescriptor[];
  /** Called when the user clicks a sortable column header (controlled mode). */
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** Optional set of visible sort column keys (hides badge for hidden cols like created_at) */
  visibleSortColumns?: Set<string>;
  /** Whether the sort is currently in its default/initial state */
  isDefaultSort?: boolean;
  /** Called when the user clicks the "reset sort" button */
  onSortReset?: () => void;
  /** Default sort descriptors when using internal sort */
  defaultSortDescriptors?: SortDescriptor[];

  /** Extra classNames forwarded to the HeroUI Table */
  classNames?: Record<string, string>;
}

// ─── Component ──────────────────────────────────────────────────

export function DataTable<T extends object>({
  ariaLabel,
  columns,
  data,
  rowKey,
  loading = false,
  emptyContent = 'No data',
  loadingContent,
  isLoading = false,
  selectionMode = 'none',
  selectedKeys: externalSelectedKeys,
  onSelectionChange: externalOnSelectionChange,
  bulkActions,
  selectedLabel = '{{count}} selected',
  disabledKeys,
  sortDescriptors: externalSortDescriptors,
  onSortChange: externalOnSortChange,
  visibleSortColumns,
  isDefaultSort: externalIsDefaultSort,
  onSortReset: externalOnSortReset,
  defaultSortDescriptors = [],
  classNames: extraClassNames,
}: DataTableProps<T>) {
  const getKey = typeof rowKey === 'function'
    ? rowKey
    : (item: T) => String((item as Record<string, unknown>)[rowKey ?? 'id']);

  // ── Internal multi-sort state (uncontrolled mode) ──
  const [internalSortDescriptors, setInternalSortDescriptors] = useState<SortDescriptor[]>(defaultSortDescriptors);
  const isControlled = !!externalOnSortChange;

  const sortDescriptors = isControlled ? (externalSortDescriptors ?? []) : internalSortDescriptors;

  const isDefaultSort = isControlled
    ? (externalIsDefaultSort ?? true)
    : (
        internalSortDescriptors.length === defaultSortDescriptors.length &&
        internalSortDescriptors.every((s, i) => s.column === defaultSortDescriptors[i]?.column && s.direction === defaultSortDescriptors[i]?.direction)
      );

  function handleMultiSortChange(descriptor: SortDescriptor) {
    if (isControlled) {
      externalOnSortChange!(descriptor);
      return;
    }
    setInternalSortDescriptors(prev => {
      const existing = prev.findIndex(s => s.column === descriptor.column);
      if (existing >= 0) {
        if (prev[existing].direction === 'ascending') {
          return prev.map((s, i) => i === existing ? { ...s, direction: 'descending' as const } : s);
        }
        return prev.filter((_, i) => i !== existing);
      }
      return [...prev, { column: descriptor.column, direction: 'ascending' as const }];
    });
  }

  function handleSortReset() {
    if (isControlled && externalOnSortReset) {
      externalOnSortReset();
    } else {
      setInternalSortDescriptors(defaultSortDescriptors);
    }
  }

  // ── Internal selection state (uncontrolled mode) ──
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<Selection>(new Set<string>());
  const isSelectionControlled = !!externalOnSelectionChange;
  const selectedKeysValue = isSelectionControlled ? (externalSelectedKeys ?? new Set<string>()) : internalSelectedKeys;

  const handleSelectionChange = useCallback((keys: Selection) => {
    if (isSelectionControlled) {
      externalOnSelectionChange!(keys);
    } else {
      setInternalSelectedKeys(keys);
    }
  }, [isSelectionControlled, externalOnSelectionChange]);

  const clearSelection = useCallback(() => {
    handleSelectionChange(new Set<string>());
  }, [handleSelectionChange]);

  // Client-side multi-sort
  const sortedData = useMemo(() => {
    if (isControlled || !sortDescriptors.length) return data;
    return [...data].sort((a, b) => {
      for (const s of sortDescriptors) {
        const col = String(s.column);
        const dir = s.direction === 'ascending' ? 1 : -1;
        const aVal = (a as Record<string, unknown>)[col];
        const bVal = (b as Record<string, unknown>)[col];
        if (aVal == null && bVal == null) continue;
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        let cmp: number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal));
        }
        if (cmp !== 0) return cmp * dir;
      }
      return 0;
    });
  }, [data, isControlled, sortDescriptors]);

  // ── Selection derived values ──
  const selectedCount = selectedKeysValue === 'all'
    ? sortedData.length
    : (selectedKeysValue as Set<string>).size;

  const resolvedSelectedKeys = useMemo((): Set<string> => {
    if (selectedKeysValue === 'all') {
      return new Set(sortedData.map(getKey));
    }
    return selectedKeysValue as Set<string>;
  }, [selectedKeysValue, sortedData, getKey]);

  // Resolve which sortDescriptor to pass to HeroUI's Table (it only supports single)
  const resolvedSortDescriptor = (() => {
    if (!sortDescriptors.length) return undefined;
    const primary = sortDescriptors[0];
    if (visibleSortColumns && primary.column) {
      return visibleSortColumns.has(primary.column as string) ? primary : undefined;
    }
    return primary;
  })();

  const getSortBadge = useCallback(
    (columnKey: string) => {
      if (!sortDescriptors.length) return null;
      const index = sortDescriptors.findIndex((s) => s.column === columnKey);
      if (index < 0) return null;
      const arrow = sortDescriptors[index].direction === 'ascending' ? '↑' : '↓';
      return (
        <span className="inline-flex items-center text-[10px] text-primary font-bold ml-0.5">
          {sortDescriptors.length > 1 ? `${index + 1}` : ''}
          {arrow}
        </span>
      );
    },
    [sortDescriptors],
  );

  const defaultClassNames: Record<string, string> = {
    table: loading ? 'opacity-60 transition-opacity' : 'opacity-100 transition-opacity',
    sortIcon: 'hidden',
    th: 'whitespace-nowrap',
    td: 'whitespace-nowrap',
  };

  const mergedClassNames = { ...defaultClassNames, ...extraClassNames };

  const showBulkBar = selectionMode !== 'none' && selectedCount > 0 && bulkActions?.length;

  const bulkActionBar = showBulkBar ? (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
      <span className="text-sm font-medium text-primary">
        {selectedLabel.replace('{{count}}', String(selectedCount))}
      </span>
      <div className="flex items-center gap-2">
        {bulkActions!.map((action) => (
          <Button
            key={action.key}
            size="sm"
            variant="flat"
            color={action.color ?? 'default'}
            className={action.className}
            startContent={action.icon}
            isDisabled={action.isDisabled}
            isLoading={action.isLoading}
            onPress={() => action.onClick(resolvedSelectedKeys)}
          >
            {action.label}
          </Button>
        ))}
      </div>
      <Button
        size="sm"
        variant="light"
        isIconOnly
        className="ml-auto"
        onPress={clearSelection}
      >
        <X className="size-4" />
      </Button>
    </div>
  ) : null;

  return (
    <Table
      aria-label={ariaLabel}
      classNames={mergedClassNames}
      sortDescriptor={resolvedSortDescriptor}
      onSortChange={handleMultiSortChange}
      selectionMode={selectionMode}
      selectedKeys={selectionMode !== 'none' ? selectedKeysValue : undefined}
      onSelectionChange={selectionMode !== 'none' ? handleSelectionChange : undefined}
      disabledKeys={selectionMode !== 'none' ? disabledKeys : undefined}
      topContent={bulkActionBar}
      topContentPlacement="outside"
    >
      <TableHeader>
        {columns.map((col, idx) => {
          const isLast = idx === columns.length - 1;
          const showResetButton = isLast && !isDefaultSort;

          return (
            <TableColumn
              key={col.key}
              className={col.className ?? 'font-semibold'}
              allowsSorting={col.allowsSorting}
            >
              {showResetButton ? (
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.allowsSorting && (getSortBadge(col.key) ?? <ArrowUpDown className="size-3 text-default-300" />)}
                  <button
                    className="p-0.5 rounded-full hover:bg-default-200 transition-colors"
                    onClick={handleSortReset}
                    aria-label="Reset sort"
                  >
                    <X className="size-3.5 text-default-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.allowsSorting && (getSortBadge(col.key) ?? <ArrowUpDown className="size-3 text-default-300" />)}
                </div>
              )}
            </TableColumn>
          );
        })}
      </TableHeader>
      <TableBody
        isLoading={isLoading}
        loadingContent={loadingContent}
        emptyContent={emptyContent}
      >
        {sortedData.map((item) => (
          <TableRow key={getKey(item)}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.render
                  ? col.render(item)
                  : String((item as Record<string, unknown>)[col.key] ?? '—')}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
