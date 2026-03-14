import type { InvoiceStatus } from '@/lib/types';
import type { PdfMargins } from '@/lib/database.types';

// ─── Date Formats ────────────────────────────────────────────────────

/**
 * Date display formats — uses date-fns format tokens.
 * @see https://date-fns.org/docs/format
 *
 * Common patterns:
 *   'MMM dd, yyyy'   → Feb 27, 2026
 *   'dd MMM yyyy'    → 27 Feb 2026
 *   'dd/MM/yyyy'     → 27/02/2026
 *   'MM/dd/yyyy'     → 02/27/2026
 *   'yyyy-MM-dd'     → 2026-02-27
 *   'dd.MM.yyyy'     → 27.02.2026
 *   'MMMM dd, yyyy'  → February 27, 2026
 */
export const dateFormats = {
  /** Tables and general UI */
  table: 'MMM dd, yyyy',
  /** Invoice preview modal */
  preview: 'MMM dd, yyyy',
  /** Downloaded invoice PDF */
  pdf: 'dd-MM-yyyy',
};

// ─── Currency Formatting ─────────────────────────────────────────────

/** Minimal currency shape needed for formatting */
export type CurrencyLike = {
  symbol: string;
  symbol_position?: 'left' | 'right';
  symbol_space?: boolean;
};

/**
 * Format a currency symbol + amount, respecting position and space settings.
 *
 * @example
 * formatWithCurrency(currency, 100.00)
 * // "$100.00"  (left, no space)
 * // "100.00 $" (right, with space)
 */
export function formatWithCurrency(
  currency: CurrencyLike | null | undefined,
  amount: number | string
): string {
  const symbol = (currency?.symbol ?? '$').trim();
  const position = currency?.symbol_position ?? 'left';
  const separator = currency?.symbol_space ? ' ' : '';

  return position === 'right'
    ? `${amount}${separator}${symbol}`
    : `${symbol}${separator}${amount}`;
}

/**
 * Look up a currency by ID from a list, then format amount.
 * Convenience wrapper around {@link formatWithCurrency} for list-based lookups.
 */
export function formatCurrencyAmount(
  currencies: (CurrencyLike & { id: string })[],
  currencyId: string | null | undefined,
  amount: number | string
): string {
  const currency = currencyId ? currencies.find(c => c.id === currencyId) : null;
  return formatWithCurrency(currency, amount);
}

/**
 * Look up a currency symbol from a list by its ID.
 * Returns '$' as the default fallback.
 */
export function getCurrencySymbol(
  currencies: { id: string; symbol: string }[],
  currencyId: string | null | undefined
): string {
  if (!currencyId) return '$';
  const currency = currencies.find(c => c.id === currencyId);
  return currency ? currency.symbol : '$';
}

// ─── PDF Margin Defaults ─────────────────────────────────────────────

export interface MarginValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export const DEFAULT_MARGINS: MarginValues = {
  top: '25.4mm',
  right: '31.8mm',
  bottom: '25.4mm',
  left: '31.8mm',
};

/**
 * Extract concrete margin values from a PdfMargins record.
 * Falls back to Normal preset values when no record is provided.
 */
export function resolveMargins(margin?: PdfMargins | null): MarginValues {
  if (!margin) return DEFAULT_MARGINS;
  return {
    top: margin.top,
    right: margin.right,
    bottom: margin.bottom,
    left: margin.left,
  };
}

// ─── Invoice Status ──────────────────────────────────────────────────

/** Canonical colour palette for invoice statuses (used in charts, badges, etc.) */
export const STATUS_COLORS: Record<InvoiceStatus, string> = {
  pending: 'hsl(var(--heroui-warning-400))',
  paid: 'hsl(var(--heroui-success-400))',
  overdue: 'hsl(var(--heroui-danger-400))',
  cancelled: 'hsl(var(--heroui-default-400))',
};

/**
 * Get the effective display status for an invoice.
 * If the stored status is 'pending' and the due_date is in the past, returns 'overdue'.
 */
export function getEffectiveStatus(
  status: InvoiceStatus,
  dueDate?: string | null
): InvoiceStatus {
  if (status === 'pending' && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  return status;
}
