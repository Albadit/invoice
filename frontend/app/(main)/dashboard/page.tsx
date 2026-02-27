'use client';

import { useState, useEffect, useMemo } from 'react';
import { invoicesApi } from '@/features/invoice/api';
import { companiesApi, currenciesApi } from '@/features/settings/api';
import type { Company, Currency } from '@/lib/types';
import { Card, CardBody, CardHeader, CardFooter } from '@heroui/card';
import { Select, SelectItem } from '@heroui/select';
import { Divider } from '@heroui/divider';
import { Spinner } from '@heroui/spinner';
import { useTranslation } from '@/contexts/LocaleProvider';
import { formatCurrencyAmount } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
} from 'lucide-react';
import { getEffectiveStatus } from '@/features/invoice/utils/invoice-utils';

type InvoiceStat = {
  status: string;
  total_amount: number | null;
  currency_id: string;
  issue_date: string | null;
  due_date: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a524',
  paid: '#17c964',
  overdue: '#f31260',
  cancelled: '#889096',
};

// ---------------------------------------------------------------------------
// KPI Stat Card — HeroUI Pro "KPI Stat 1" style
// ---------------------------------------------------------------------------
function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  trendValue,
  trendDirection,
  onViewAll,
  viewAllLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trendValue?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  onViewAll?: () => void;
  viewAllLabel?: string;
}) {
  const trendColor =
    trendDirection === 'up'
      ? 'bg-success-50 text-success-600 dark:bg-success-100/10 dark:text-success-400'
      : trendDirection === 'down'
        ? 'bg-danger-50 text-danger-600 dark:bg-danger-100/10 dark:text-danger-400'
        : 'bg-warning-50 text-warning-600 dark:bg-warning-100/10 dark:text-warning-400';

  const TrendIcon =
    trendDirection === 'up' ? ArrowUpRight : trendDirection === 'down' ? ArrowDownRight : ArrowRight;

  return (
    <Card className="w-full border border-default-200 dark:border-default-100 shadow-sm">
      <CardBody className="p-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
              {icon}
            </div>
            <span className="text-sm font-medium text-default-500">{title}</span>
          </div>
          {trendValue && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              {trendValue}
            </span>
          )}
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-default-400 mt-0.5">{subtitle}</p>}
      </CardBody>
      {onViewAll && (
        <>
          <Divider />
          <CardFooter className="px-4 py-2">
            <button onClick={onViewAll} className="text-xs text-default-400 hover:text-default-600 transition-colors">
              {viewAllLabel ?? 'View All'}
            </button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom dark-themed Recharts Tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({
  active,
  payload,
  label,
  fmtValue,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  fmtValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-default-200 bg-content1 px-3 py-2 shadow-lg text-xs">
      {label && <p className="mb-1 font-semibold text-default-700">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-default-500">{p.name}:</span>
          <span className="font-semibold">{fmtValue(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Donut legend row
// ---------------------------------------------------------------------------
function LegendDot({
  color,
  label,
  count,
  amount,
  pct,
}: {
  color: string;
  label: string;
  count: number;
  amount: string;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm text-default-600 font-medium">{label}</span>
          <span className="text-sm font-bold">{count}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-default-400">{amount}</span>
          <span className="text-xs text-default-400">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
export default function DashboardPage() {
  const { t } = useTranslation('invoice');
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<InvoiceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const [c, cu] = await Promise.all([companiesApi.getAll(), currenciesApi.getAll()]);
        setCompanies(c);
        setCurrencies(cu);
      } catch { /* ignore */ }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const companyId = selectedCompany === 'all' ? undefined : selectedCompany;
        setStats(await invoicesApi.getStats(companyId));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    loadStats();
  }, [selectedCompany]);

  // Derive available years from stats
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    stats.forEach((s) => {
      if (s.issue_date) years.add(new Date(s.issue_date).getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [stats]);

  // Filter stats by selected year
  const filteredStats = useMemo(() => {
    if (selectedYear === 'all') return stats;
    const year = Number(selectedYear);
    return stats.filter((s) => s.issue_date && new Date(s.issue_date).getFullYear() === year);
  }, [stats, selectedYear]);

  // ---------- computed --------------------------------------------------
  const computed = useMemo(() => {
    const withEffective = filteredStats.map((s) => ({
      ...s,
      effectiveStatus: getEffectiveStatus(s.status as 'pending' | 'paid' | 'overdue' | 'cancelled', s.due_date),
    }));
    const pending = withEffective.filter((s) => s.effectiveStatus === 'pending');
    const paid = withEffective.filter((s) => s.effectiveStatus === 'paid');
    const overdue = withEffective.filter((s) => s.effectiveStatus === 'overdue');
    const cancelled = withEffective.filter((s) => s.effectiveStatus === 'cancelled');
    const sum = (arr: typeof withEffective) => arr.reduce((a, i) => a + (i.total_amount ?? 0), 0);
    return {
      total: withEffective.length,
      pending: { count: pending.length, amount: sum(pending) },
      paid: { count: paid.length, amount: sum(paid) },
      overdue: { count: overdue.length, amount: sum(overdue) },
      cancelled: { count: cancelled.length, amount: sum(cancelled) },
      totalAmount: sum(withEffective),
    };
  }, [filteredStats]);

  const primaryCurrencyId = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredStats.forEach((s) => { freq[s.currency_id] = (freq[s.currency_id] || 0) + 1; });
    let maxId = ''; let maxCount = 0;
    Object.entries(freq).forEach(([id, count]) => { if (count > maxCount) { maxId = id; maxCount = count; } });
    return maxId;
  }, [filteredStats]);

  const fmt = (amount: number) => {
    if (!primaryCurrencyId || !currencies.length)
      return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return formatCurrencyAmount(currencies, primaryCurrencyId, amount.toFixed(2));
  };

  // Pie
  const pieData = useMemo(() => [
    { name: t('status.pending'), value: computed.pending.count, color: STATUS_COLORS.pending },
    { name: t('status.paid'), value: computed.paid.count, color: STATUS_COLORS.paid },
    { name: t('status.overdue'), value: computed.overdue.count, color: STATUS_COLORS.overdue },
    { name: t('status.cancelled'), value: computed.cancelled.count, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0), [computed, t]);

  // Monthly
  const monthlyData = useMemo(() => {
    const year = selectedYear !== 'all' ? Number(selectedYear) : new Date().getFullYear();
    const months: { key: string; label: string; paid: number; pending: number; overdue: number }[] = [];
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
      const effStatus = getEffectiveStatus(inv.status as 'pending' | 'paid' | 'overdue' | 'cancelled', inv.due_date);
      if (effStatus === 'paid') m.paid += a;
      else if (effStatus === 'overdue') m.overdue += a;
      else if (effStatus === 'pending') m.pending += a;
    });
    return months;
  }, [filteredStats, selectedYear]);

  const paidPct = computed.total ? Math.round((computed.paid.count / computed.total) * 100) : 0;
  const overduePct = computed.total ? Math.round((computed.overdue.count / computed.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-default-500 text-sm">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select
            label={t('dashboard.filterYear')}
            labelPlacement="inside"
            selectedKeys={[selectedYear]}
            onChange={(e) => setSelectedYear(e.target.value || 'all')}
            className="w-full sm:w-36"
            size="sm"
          >
            {[
              <SelectItem key="all">{t('dashboard.allYears')}</SelectItem>,
              ...availableYears.map((y) => <SelectItem key={String(y)}>{String(y)}</SelectItem>),
            ]}
          </Select>
          <Select
            label={t('dashboard.filterCompany')}
            labelPlacement="inside"
            selectedKeys={[selectedCompany]}
            onChange={(e) => setSelectedCompany(e.target.value || 'all')}
            className="w-full sm:w-64"
            size="sm"
          >
            {[
              <SelectItem key="all">{t('dashboard.allCompanies')}</SelectItem>,
              ...companies.map((c) => <SelectItem key={c.id}>{c.name}</SelectItem>),
            ]}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* ---- KPI Row (3 cards) --------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title={t('dashboard.totalInvoices')}
              value={computed.total.toLocaleString()}
              icon={<FileText className="h-5 w-5 text-primary" />}
              iconBg="bg-primary/10"
              trendValue={`${paidPct}%`}
              trendDirection={paidPct >= 50 ? 'up' : paidPct > 0 ? 'neutral' : 'down'}
              onViewAll={() => router.push('/')}
              viewAllLabel={t('dashboard.viewAll')}
            />
            <KpiCard
              title={t('dashboard.totalRevenue')}
              value={fmt(computed.paid.amount)}
              subtitle={`${computed.paid.count} ${t('status.paid').toLowerCase()}`}
              icon={<TrendingUp className="h-5 w-5 text-success" />}
              iconBg="bg-success/10"
              trendValue={paidPct ? `${paidPct}%` : undefined}
              trendDirection="up"
              onViewAll={() => router.push('/')}
              viewAllLabel={t('dashboard.viewAll')}
            />
            <KpiCard
              title={t('dashboard.outstanding')}
              value={fmt(computed.pending.amount + computed.overdue.amount)}
              subtitle={`${computed.pending.count + computed.overdue.count} ${t('status.pending').toLowerCase()} / ${t('status.overdue').toLowerCase()}`}
              icon={<AlertTriangle className="h-5 w-5 text-danger" />}
              iconBg="bg-danger/10"
              trendValue={overduePct ? `${overduePct}%` : undefined}
              trendDirection={overduePct > 20 ? 'down' : overduePct > 0 ? 'neutral' : 'up'}
              onViewAll={() => router.push('/')}
              viewAllLabel={t('dashboard.viewAll')}
            />
          </div>

          {/* ---- Analytics Card (area chart + inline KPIs) --------------- */}
          <Card className="border border-default-200 dark:border-default-100 shadow-sm">
            <CardBody className="p-5">
              <h3 className="text-base font-bold mb-4">{t('dashboard.monthlyTrend')}</h3>
              {/* Inline stat chips */}
              <div className="flex flex-wrap gap-x-8 gap-y-3 mb-5">
                {[
                  { label: t('status.paid'), value: fmt(computed.paid.amount), color: 'text-success' },
                  { label: t('status.pending'), value: fmt(computed.pending.amount), color: 'text-warning' },
                  { label: t('status.overdue'), value: fmt(computed.overdue.amount), color: 'text-danger' },
                  { label: t('status.cancelled'), value: fmt(computed.cancelled.amount), color: 'text-default-400' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                    <span className="text-lg font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              {/* Area Chart */}
              {stats.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-default-400">{t('dashboard.noData')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={STATUS_COLORS.paid} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={STATUS_COLORS.paid} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={STATUS_COLORS.pending} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={STATUS_COLORS.pending} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-default-200 dark:text-default-100" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                    <RechartsTooltip content={<ChartTooltip fmtValue={fmt} />} />
                    <Area type="monotone" dataKey="paid" name={t('status.paid')} stroke={STATUS_COLORS.paid} fill="url(#gradPaid)" strokeWidth={2} />
                    <Area type="monotone" dataKey="pending" name={t('status.pending')} stroke={STATUS_COLORS.pending} fill="url(#gradPending)" strokeWidth={2} />
                    <Area type="monotone" dataKey="overdue" name={t('status.overdue')} stroke={STATUS_COLORS.overdue} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* ---- Bottom Row: Donut + Stacked Bar -------------------------*/}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Donut with side legend */}
            <Card className="border border-default-200 dark:border-default-100 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-0">
                <h3 className="text-base font-bold">{t('dashboard.statusDistribution')}</h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-default-400">{t('dashboard.noData')}</div>
                ) : (
                  <>
                    <div className="flex items-center gap-8">
                      {/* Donut */}
                      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <RechartsTooltip content={<ChartTooltip fmtValue={(v) => String(v)} />} />
                          </PieChart>
                        </ResponsiveContainer>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold">{computed.total}</span>
                          <span className="text-xs text-default-400">{t('dashboard.totalInvoices')}</span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {[
                          { key: 'pending', label: t('status.pending'), color: STATUS_COLORS.pending, count: computed.pending.count, amount: computed.pending.amount },
                          { key: 'paid', label: t('status.paid'), color: STATUS_COLORS.paid, count: computed.paid.count, amount: computed.paid.amount },
                          { key: 'overdue', label: t('status.overdue'), color: STATUS_COLORS.overdue, count: computed.overdue.count, amount: computed.overdue.amount },
                          { key: 'cancelled', label: t('status.cancelled'), color: STATUS_COLORS.cancelled, count: computed.cancelled.count, amount: computed.cancelled.amount },
                        ].filter((d) => d.count > 0).map((d) => (
                          <LegendDot
                            key={d.key}
                            color={d.color}
                            label={d.label}
                            count={d.count}
                            amount={fmt(d.amount)}
                            pct={computed.total ? Math.round((d.count / computed.total) * 100) : 0}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Proportional breakdown bar */}
                    <div className="mt-4">
                      <div className="flex h-2.5 rounded-full overflow-hidden">
                        {[
                          { key: 'paid', color: STATUS_COLORS.paid, count: computed.paid.count },
                          { key: 'pending', color: STATUS_COLORS.pending, count: computed.pending.count },
                          { key: 'overdue', color: STATUS_COLORS.overdue, count: computed.overdue.count },
                          { key: 'cancelled', color: STATUS_COLORS.cancelled, count: computed.cancelled.count },
                        ].filter((d) => d.count > 0).map((d) => (
                          <div
                            key={d.key}
                            className="h-full transition-all"
                            style={{
                              backgroundColor: d.color,
                              width: `${computed.total ? (d.count / computed.total) * 100 : 0}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardBody>
            </Card>

            {/* Monthly Stacked Bar with large stat header */}
            <Card className="border border-default-200 dark:border-default-100 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-0 flex-col items-start gap-1">
                <h3 className="text-base font-bold">{t('dashboard.amountByStatus')}</h3>
                <p className="text-2xl font-bold">{fmt(computed.totalAmount)}</p>
              </CardHeader>
              <CardBody className="px-2 pb-4">
                {stats.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-default-400">{t('dashboard.noData')}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-default-200 dark:text-default-100" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                      <RechartsTooltip content={<ChartTooltip fmtValue={fmt} />} />
                      <Bar dataKey="paid" name={t('status.paid')} stackId="a" fill={STATUS_COLORS.paid} />
                      <Bar dataKey="pending" name={t('status.pending')} stackId="a" fill={STATUS_COLORS.pending} />
                      <Bar dataKey="overdue" name={t('status.overdue')} stackId="a" fill={STATUS_COLORS.overdue} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {/* Bottom legend */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  {[
                    { label: t('status.paid'), color: STATUS_COLORS.paid },
                    { label: t('status.pending'), color: STATUS_COLORS.pending },
                    { label: t('status.overdue'), color: STATUS_COLORS.overdue },
                  ].map((d) => (
                    <div key={d.label} className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-default-500">{d.label}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
