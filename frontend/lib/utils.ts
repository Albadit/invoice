import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

/**
 * Format an amount with currency symbol, respecting position and space settings.
 * 
 * @example
 * formatCurrencyAmount(currencies, currencyId, 100.00)
 * // "$100.00"  (left, no space)
 * // "$ 100.00" (left, with space)
 * // "100.00$"  (right, no space)
 * // "100.00 $" (right, with space)
 */
export function formatCurrencyAmount(
  currencies: { id: string; symbol: string; symbol_position?: 'left' | 'right'; symbol_space?: boolean }[],
  currencyId: string | null | undefined,
  amount: number | string
): string {
  const currency = currencyId ? currencies.find(c => c.id === currencyId) : null;
  const symbol = (currency?.symbol ?? '$').trim();
  const position = currency?.symbol_position ?? 'left';
  const space = currency?.symbol_space ?? false;
  const separator = space ? ' ' : '';

  if (position === 'right') {
    return `${amount}${separator}${symbol}`;
  }
  return `${symbol}${separator}${amount}`;
}

/**
 * Format a currency symbol + amount using a Currency object directly.
 * Used in templates and PDF rendering where the full currency object is available.
 */
export function formatWithCurrency(
  currency: { symbol: string; symbol_position?: 'left' | 'right'; symbol_space?: boolean } | null | undefined,
  amount: number | string
): string {
  const symbol = (currency?.symbol ?? '$').trim();
  const position = currency?.symbol_position ?? 'left';
  const space = currency?.symbol_space ?? false;
  const separator = space ? ' ' : '';

  if (position === 'right') {
    return `${amount}${separator}${symbol}`;
  }
  return `${symbol}${separator}${amount}`;
}
