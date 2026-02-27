import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
