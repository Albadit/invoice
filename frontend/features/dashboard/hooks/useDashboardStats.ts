'use client';

import { useMemo } from 'react';
import type { Currency, InvoiceStatus, InvoiceStat } from '@/lib/types';
import { formatCurrencyAmount } from '@/lib/utils';
import { getEffectiveStatus } from '@/lib/types';

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
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * Pure computation hook for dashboard analytics.
 * All data fetching is the caller's responsibility (app layer).
 */
export function useDashboardComputed(
  stats: InvoiceStat[],
  currencies: Currency[],
  selectedYear: string,
) {
  // Filter by year
  const filteredStats = useMemo(() => {
    if (selectedYear === 'all') return stats;
    const year = Number(selectedYear);
    return stats.filter((s) => s.issue_date && new Date(s.issue_date).getFullYear() === year);
  }, [stats, selectedYear]);

  // Available years derived from stats
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    stats.forEach((s) => {
      if (s.issue_date) years.add(new Date(s.issue_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [stats]);

  // Aggregate KPIs
  const computed = useMemo<DashboardKpis>(() => {
    const withEffective = filteredStats.map((s) => ({
      ...s,
      effectiveStatus: getEffectiveStatus(s.status as InvoiceStatus, s.due_date),
    }));
    const byStatus = (status: InvoiceStatus) => withEffective.filter((s) => s.effectiveStatus === status);
    const sum = (arr: typeof withEffective) => arr.reduce((a, i) => a + (i.total_amount ?? 0), 0);

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
  }, [filteredStats]);

  // Most-used currency for formatting
  const primaryCurrencyId = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredStats.forEach((s) => { freq[s.currency_id] = (freq[s.currency_id] || 0) + 1; });
    let maxId = '';
    let maxCount = 0;
    Object.entries(freq).forEach(([id, count]) => { if (count > maxCount) { maxId = id; maxCount = count; } });
    return maxId;
  }, [filteredStats]);

  // Currency formatter
  const fmt = useMemo(() => {
    return (amount: number) => {
      if (!primaryCurrencyId || !currencies.length)
        return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return formatCurrencyAmount(currencies, primaryCurrencyId, amount.toFixed(2));
    };
  }, [primaryCurrencyId, currencies]);

  // Monthly buckets for charts
  const monthlyData = useMemo<MonthlyBucket[]>(() => {
    const year = selectedYear !== 'all' ? Number(selectedYear) : new Date().getFullYear();
    const months: MonthlyBucket[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(year, i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString(undefined, { month: 'short' }), paid: 0, pending: 0, overdue: 0 });
    }
    filteredStats.forEach((inv) => {
      if (!inv.issue_date) return;
      const m = months.find((mo) => mo.key === inv.issue_date!.slice(0, 7));
      if (!m) return;
      const a = inv.total_amount ?? 0;
      const effStatus = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
      if (effStatus === 'paid') m.paid += a;
      else if (effStatus === 'overdue') m.overdue += a;
      else if (effStatus === 'pending') m.pending += a;
    });
    return months;
  }, [filteredStats, selectedYear]);

  const paidPct = computed.total ? Math.round((computed.paid.count / computed.total) * 100) : 0;
  const overduePct = computed.total ? Math.round((computed.overdue.count / computed.total) * 100) : 0;

  return {
    availableYears,
    computed,
    fmt,
    monthlyData,
    paidPct,
    overduePct,
  };
}
