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
 * Format a numeric value for display based on its type.
 * - "number": abbreviates large values (1M, 10k) or uses locale string
 * - "percentage": appends %
 * - other / undefined: returns value as-is
 */
export function formatValue(value: number, type?: string): string | number {
  if (type === 'number') {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(2) + 'k';
    return value.toLocaleString();
  }
  if (type === 'percentage') return `${value}%`;
  return value;
}

/**
 * Compute share-of-total as a formatted percentage string.
 * Returns "0%" when the total is zero.
 */
export function pctOfTotal(amount: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((amount / total) * 100)}%`;
}
