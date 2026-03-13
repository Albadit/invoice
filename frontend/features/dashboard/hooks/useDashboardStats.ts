'use client';

import { useMemo } from 'react';
import type { Currency, InvoiceStatus, InvoiceStat } from '@/lib/types';
import { formatCurrencyAmount, formatWithCurrency, getEffectiveStatus } from '@/config/formatting';
import { formatValue } from '@/features/dashboard/utils';

// ── Computed KPI shape ───────────────────────────────────────────

export interface DashboardKpis {
  total: number;
  pending: { count: number; amount: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
  cancelled: { count: number; amount: number };
  totalAmount: number;
}

export interface MonthlyBucket {
  key: string;
  label: string;
  paid: number;
  pending: number;
  overdue: number;
  cancelled: number;
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * Convert an invoice amount to the selected display currency.
 *
 * Formula: converted = original * (displayRate / invoiceRate)
 *
 * - invoiceRate: the exchange_rate snapshot stored on the invoice
 *   (rate of the invoice's currency relative to the base at time of creation)
 * - displayRate: the current exchange_rate of the display currency
 */
function convertAmount(
  amount: number,
  invoiceRate: number,
  displayRate: number,
): number {
  if (!invoiceRate || invoiceRate === 0) return amount;
  return amount * (displayRate / invoiceRate);
}

/**
 * Pure computation hook for dashboard analytics.
 * All data fetching is the caller's responsibility (app layer).
 *
 * @param displayCurrencyId - Currency ID to convert all amounts to.
 *   Pass `null` to skip conversion (amounts shown as-is).
 * @param customRates - Optional per-user exchange rate overrides keyed by currency ID.
 */
export function useDashboardComputed(
  stats: InvoiceStat[],
  currencies: Currency[],
  selectedYears: Set<string>,
  displayCurrencyId: string | null = null,
  customRates: Record<string, number> = {},
) {
  // Helper: resolve effective rate for a currency id
  const getRate = (id: string): number => {
    if (customRates[id] != null) return customRates[id];
    const c = currencies.find((cur) => cur.id === id);
    return c?.exchange_rate ?? 1;
  };

  // Resolve display currency's exchange rate
  const displayRate = useMemo(() => {
    if (!displayCurrencyId) return 1;
    return getRate(displayCurrencyId);
  }, [displayCurrencyId, currencies, customRates]);

  // Which currency ID to use for formatting
  const fmtCurrencyId = displayCurrencyId;

  // Filter by year(s)
  const isAllYears = selectedYears.has('all');
  const filteredStats = useMemo(() => {
    if (isAllYears) return stats;
    const years = new Set(Array.from(selectedYears).map(Number));
    return stats.filter((s) => s.issue_date && years.has(new Date(s.issue_date).getFullYear()));
  }, [stats, selectedYears, isAllYears]);

  // Available years derived from stats
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    stats.forEach((s) => {
      if (s.issue_date) years.add(new Date(s.issue_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [stats]);

  // Aggregate KPIs (with currency conversion)
  const computed = useMemo<DashboardKpis>(() => {
    const withEffective = filteredStats.map((s) => ({
      ...s,
      effectiveStatus: getEffectiveStatus(s.status as InvoiceStatus, s.due_date),
      converted: convertAmount(s.total_amount ?? 0, s.exchange_rate ?? 1, displayRate),
    }));
    const byStatus = (status: InvoiceStatus) => withEffective.filter((s) => s.effectiveStatus === status);
    const sum = (arr: typeof withEffective) => arr.reduce((a, i) => a + i.converted, 0);

    const pending = byStatus('pending');
    const paid = byStatus('paid');
    const overdue = byStatus('overdue');
    const cancelled = byStatus('cancelled');

    return {
      total: withEffective.length,
      pending: { count: pending.length, amount: sum(pending) },
      paid: { count: paid.length, amount: sum(paid) },
      overdue: { count: overdue.length, amount: sum(overdue) },
      cancelled: { count: cancelled.length, amount: sum(cancelled) },
      totalAmount: sum(withEffective),
    };
  }, [filteredStats, displayRate]);

  // Currency formatter — uses the display currency
  const fmt = useMemo(() => {
    return (amount: number) => {
      if (!fmtCurrencyId || !currencies.length)
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return formatCurrencyAmount(currencies, fmtCurrencyId, amount.toFixed(2));
    };
  }, [fmtCurrencyId, currencies]);

  // Compact currency formatter — abbreviated (K, M, B) with currency symbol
  const fmtCompact = useMemo(() => {
    const currency = fmtCurrencyId ? currencies.find((c) => c.id === fmtCurrencyId) : null;
    return (amount: number, locale?: string) => {
      const compact = formatValue(amount, 'number', locale);
      return formatWithCurrency(currency, compact);
    };
  }, [fmtCurrencyId, currencies]);

  // Monthly buckets for charts (or yearly when multiple / all years selected)
  const isSingleYear = !isAllYears && selectedYears.size === 1;
  const monthlyData = useMemo<MonthlyBucket[]>(() => {
    if (!isSingleYear) {
      // Yearly buckets — one per relevant year
      const yearList = isAllYears
        ? availableYears.slice().sort((a, b) => a - b)
        : Array.from(selectedYears).map(Number).sort((a, b) => a - b);
      if (!yearList.length) return [];
      const buckets: MonthlyBucket[] = yearList
        .map((y) => ({ key: String(y), label: String(y), paid: 0, pending: 0, overdue: 0, cancelled: 0 }));
      filteredStats.forEach((inv) => {
        if (!inv.issue_date) return;
        const year = String(new Date(inv.issue_date).getFullYear());
        const b = buckets.find((bu) => bu.key === year);
        if (!b) return;
        const a = convertAmount(inv.total_amount ?? 0, inv.exchange_rate ?? 1, displayRate);
        const effStatus = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
        if (effStatus === 'paid') b.paid += a;
        else if (effStatus === 'overdue') b.overdue += a;
        else if (effStatus === 'pending') b.pending += a;
        else if (effStatus === 'cancelled') b.cancelled += a;
      });
      return buckets;
    }
    const year = Number(Array.from(selectedYears)[0]);
    const months: MonthlyBucket[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString(undefined, { month: 'short' }), paid: 0, pending: 0, overdue: 0, cancelled: 0 });
    }
    filteredStats.forEach((inv) => {
      if (!inv.issue_date) return;
      const m = months.find((mo) => mo.key === inv.issue_date!.slice(0, 7));
      if (!m) return;
      const a = convertAmount(inv.total_amount ?? 0, inv.exchange_rate ?? 1, displayRate);
      const effStatus = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
      if (effStatus === 'paid') m.paid += a;
      else if (effStatus === 'overdue') m.overdue += a;
      else if (effStatus === 'pending') m.pending += a;
      else if (effStatus === 'cancelled') m.cancelled += a;
    });
    return months;
  }, [filteredStats, selectedYears, isAllYears, isSingleYear, availableYears, displayRate]);

  const paidPct = computed.total ? Math.round((computed.paid.count / computed.total) * 100) : 0;
  const overduePct = computed.total ? Math.round((computed.overdue.count / computed.total) * 100) : 0;

  return {
    availableYears,
    computed,
    fmt,
    fmtCompact,
    monthlyData,
    paidPct,
    overduePct,
  };
}
