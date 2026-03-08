'use client';

import { type ReactNode, useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { GripVertical, Lock, X, ArrowUpDown } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface SortDescriptor {
  column: string;
  direction: 'ascending' | 'descending';
}

export interface DnDTableColumn<T> {
  /** Unique key matching the data field or a custom identifier */
  key: string;
  /** Column header label */
  label: ReactNode;
  /** Enable sorting on this column */
  allowsSorting?: boolean;
  /** Extra className applied to the <th> */
  className?: string;
  /**
   * Custom cell renderer. Receives the row item and returns a ReactNode.
   * When omitted the component renders `String(item[key])`.
   */
  render?: (item: T) => ReactNode;
}

export interface DnDTableProps<T> {
  /** Column definitions */
  columns: DnDTableColumn<T>[];
  /** Row data */
  data: T[];
  /** Unique key extractor per row — a field name string or a function. Defaults to 'id'. */
  rowKey?: string | ((item: T) => string);
  /** Whether data is currently loading (applies opacity) */
  loading?: boolean;
  /** Content shown when there are no rows */
  emptyContent?: ReactNode;
  /** Called when a drag-and-drop reorder completes */
  onDragEnd?: (event: DragEndEvent) => void;
  /** Whether a row can be dragged. Receives the row item, returns boolean. Defaults to true. */
  canDrag?: (item: T) => boolean;
  /** Icon shown when a row cannot be dragged. Defaults to Lock icon. */
  lockedIcon?: ReactNode;

  // ── Sorting ──────────────────────────────────────────────────
  /**
   * Multi-sort descriptors array. When provided with onSortChange the component is "controlled".
   * When omitted the component manages its own multi-sort state internally and sorts data client-side.
   */
  sortDescriptors?: SortDescriptor[];
  /** Called when the user clicks a sortable column header (controlled mode). */
  onSortChange?: (descriptor: SortDescriptor) => void;
  /** Whether the sort is currently in its default/initial state (controlled mode). */
  isDefaultSort?: boolean;
  /** Called when the user clicks the "reset sort" button. */
  onSortReset?: () => void;
  /** Default sort descriptors when using internal sort. */
  defaultSortDescriptors?: SortDescriptor[];
}

// ─── Sortable Row ───────────────────────────────────────────────

function SortableRow<T extends object>({
  item,
  itemId,
  canDrag,
  lockedIcon,
  children,
}: {
  item: T;
  itemId: string;
  canDrag: boolean;
  lockedIcon: ReactNode;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: isDragging ? ('relative' as const) : undefined,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-divider last:border-0">
      <td className="py-3 px-3 w-10">
        {canDrag ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-default-400 hover:text-default-600 touch-none"
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          lockedIcon
        )}
      </td>
      {children}
    </tr>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function DnDTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyContent = 'No data',
  onDragEnd,
  canDrag = () => true,
  lockedIcon = <Lock className="size-4 text-default-300" />,
  sortDescriptors: externalSortDescriptors,
  onSortChange: externalOnSortChange,
  isDefaultSort: externalIsDefaultSort,
  onSortReset: externalOnSortReset,
  defaultSortDescriptors = [],
}: DnDTableProps<T>) {
  const getKey = typeof rowKey === 'function'
    ? rowKey
    : (item: T) => String((item as Record<string, unknown>)[rowKey ?? 'id']);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Multi-sort state ──
  const [internalSortDescriptors, setInternalSortDescriptors] = useState<SortDescriptor[]>(defaultSortDescriptors);
  const isControlled = !!externalOnSortChange;

  const sortDescriptors = isControlled ? (externalSortDescriptors ?? []) : internalSortDescriptors;

  const isDefaultSort = isControlled
    ? (externalIsDefaultSort ?? true)
    : (
        internalSortDescriptors.length === defaultSortDescriptors.length &&
        internalSortDescriptors.every((s, i) => s.column === defaultSortDescriptors[i]?.column && s.direction === defaultSortDescriptors[i]?.direction)
      );

  function handleColumnSort(columnKey: string) {
    if (isControlled) {
      const existing = sortDescriptors.find(s => s.column === columnKey);
      externalOnSortChange!({
        column: columnKey,
        direction: existing?.direction === 'ascending' ? 'descending' : 'ascending',
      });
      return;
    }
    setInternalSortDescriptors(prev => {
      const existing = prev.findIndex(s => s.column === columnKey);
      if (existing >= 0) {
        if (prev[existing].direction === 'ascending') {
          return prev.map((s, i) => i === existing ? { ...s, direction: 'descending' as const } : s);
        }
        return prev.filter((_, i) => i !== existing);
      }
      return [...prev, { column: columnKey, direction: 'ascending' as const }];
    });
  }

  function handleSortReset() {
    if (isControlled && externalOnSortReset) {
      externalOnSortReset();
    } else {
      setInternalSortDescriptors(defaultSortDescriptors);
    }
  }

  // Client-side multi-sort
  const sortedData = useMemo(() => {
    if (isControlled || !sortDescriptors.length) return data;
    return [...data].sort((a, b) => {
      for (const s of sortDescriptors) {
        const col = s.column;
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

  const colSpan = columns.length + 1; // +1 for drag handle column

  return (
    <div className="w-full overflow-x-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd ?? (() => {})}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <table
          className={`w-full text-sm ${loading ? 'opacity-60' : 'opacity-100'} transition-opacity`}
        >
          <thead>
            <tr className="border-b border-divider">
              <th className="py-3 px-3 w-10" />
              {columns.map((col, idx) => {
                const isLast = idx === columns.length - 1;
                const showResetButton = isLast && !isDefaultSort;
                const baseClass = col.className ?? 'text-left text-xs font-semibold text-default-500 py-3 px-3 whitespace-nowrap';

                return (
                  <th key={col.key} className={baseClass}>
                    {col.allowsSorting ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-default-700 transition-colors"
                        onClick={() => handleColumnSort(col.key)}
                      >
                        {col.label}
                        {getSortBadge(col.key) ?? <ArrowUpDown className="size-3 text-default-300" />}
                      </button>
                    ) : showResetButton ? (
                      <div className="flex items-center gap-1">
                        {col.label}
                        <button
                          className="p-0.5 rounded-full hover:bg-default-200 transition-colors"
                          onClick={handleSortReset}
                          aria-label="Reset sort"
                        >
                          <X className="size-3.5 text-default-400" />
                        </button>
                      </div>
                    ) : (
                      col.label
                    )}
                    {col.allowsSorting && showResetButton ? (
                      <button
                        className="ml-1 p-0.5 rounded-full hover:bg-default-200 transition-colors"
                        onClick={handleSortReset}
                        aria-label="Reset sort"
                      >
                        <X className="size-3.5 text-default-400" />
                      </button>
                    ) : null}
                  </th>
                );
              })}
            </tr>
          </thead>
          <SortableContext
            items={sortedData.map((item) => getKey(item))}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-8 text-default-400">
                    {emptyContent}
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => {
                  const id = getKey(item);
                  return (
                    <SortableRow
                      key={id}
                      item={item}
                      itemId={id}
                      canDrag={canDrag(item)}
                      lockedIcon={lockedIcon}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className="py-3 px-3 whitespace-nowrap">
                          {col.render
                            ? col.render(item)
                            : String((item as Record<string, unknown>)[col.key] ?? '—')}
                        </td>
                      ))}
                    </SortableRow>
                  );
                })
              )}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}
