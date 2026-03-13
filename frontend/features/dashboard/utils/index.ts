/**
 * Dashboard-specific utility functions and constants.
 *
 * These helpers are used exclusively by the dashboard feature's
 * components and hooks, so they live here rather than in the
 * shared `lib/utils` module.
 */

import { STATUS_THEME } from '@/config/constants';

/**
 * Re-export the shared status theme map for backward compatibility.
 * @deprecated Import directly from '@/config/constants' instead.
 */
export const STATUS_THEME_MAP = STATUS_THEME;

/**
 * Format a numeric value as a compact string with locale-aware abbreviations.
 * Uses Intl.NumberFormat with notation: 'compact' so abbreviations
 * (K, M, B, etc.) adapt to the user's locale automatically.
 */
export function formatValue(value: number, type?: string, locale?: string): string {
  if (type === 'number') {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (type === 'percentage') return `${value}%`;
  return value.toLocaleString(locale);
}

/**
 * Compute share-of-total as a formatted percentage string.
 * Returns "0%" when the total is zero.
 */
export function pctOfTotal(amount: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((amount / total) * 100)}%`;
}
