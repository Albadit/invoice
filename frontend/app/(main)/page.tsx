'use client';

import { useState, useEffect } from 'react';
import { Select, SelectItem } from '@heroui/select';
import { Spinner } from '@heroui/spinner';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { useTranslation } from '@/contexts/LocaleProvider';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { FileText, AlertTriangle, TrendingUp } from 'lucide-react';

import type { Company, Currency, InvoiceStat } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/types';
import { invoicesApi } from '@/features/invoice/api';
import { companiesApi } from '@/features/companies/api';
import { currenciesApi } from '@/features/currencies/api';
import { useDashboardComputed } from '@/features/dashboard/hooks/useDashboardStats';
import { KpiCard, ChartTooltip, LegendDot } from '@/features/dashboard/components/DashboardWidgets';
import { StickyHeader } from '@/components/ui';

// ===================================================================
export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tInvoice } = useTranslation('invoice');
  const router = useRouter();

  // ── Data fetching (app layer responsibility) ────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<InvoiceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => setChartsReady(true), []);

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

  // ── Pure computation (feature hook) ─────────────────────────────
  const {
    availableYears,
    computed, fmt, monthlyData,
    paidPct, overduePct,
  } = useDashboardComputed(stats, currencies, selectedYear);

  // Pie data (non-zero slices only)
  const pieData = [
    { name: tInvoice('status.pending'), value: computed.pending.count, color: STATUS_COLORS.pending },
    { name: tInvoice('status.paid'), value: computed.paid.count, color: STATUS_COLORS.paid },
    { name: tInvoice('status.overdue'), value: computed.overdue.count, color: STATUS_COLORS.overdue },
    { name: tInvoice('status.cancelled'), value: computed.cancelled.count, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
          <div className="hidden lg:flex flex-col gap-0.5 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
            <p className="text-xs sm:text-sm text-default-500">{t('subtitle')}</p>
          </div>
          <div className="sm:ml-auto shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select
              label={t('filterYear')}
              labelPlacement="inside"
              selectedKeys={[selectedYear]}
              onChange={(e) => setSelectedYear(e.target.value || 'all')}
              className="w-full sm:w-36"
              size="sm"
            >
              {[
                <SelectItem key="all">{t('allYears')}</SelectItem>,
                ...availableYears.map((y) => <SelectItem key={String(y)}>{String(y)}</SelectItem>),
              ]}
            </Select>
            <Select
              label={t('filterCompany')}
              labelPlacement="inside"
              selectedKeys={[selectedCompany]}
              onChange={(e) => setSelectedCompany(e.target.value || 'all')}
              className="w-full sm:w-64"
              size="sm"
            >
              {[
                <SelectItem key="all">{t('allCompanies')}</SelectItem>,
                ...companies.map((c) => <SelectItem key={c.id}>{c.name}</SelectItem>),
              ]}
            </Select>
          </div>
      </StickyHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* ---- KPI Row (3 cards) --------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title={t('totalInvoices')}
              value={computed.total.toLocaleString()}
              icon={<FileText className="h-5 w-5 text-primary" />}
              iconBg="bg-primary/10"
              trendValue={`${paidPct}%`}
              trendDirection={paidPct >= 50 ? 'up' : paidPct > 0 ? 'neutral' : 'down'}
              onViewAll={() => router.push('/')}
              viewAllLabel={t('viewAll')}
            />
            <KpiCard
              title={t('totalRevenue')}
              value={fmt(computed.paid.amount)}
              subtitle={`${computed.paid.count} ${tInvoice('status.paid').toLowerCase()}`}
              icon={<TrendingUp className="h-5 w-5 text-success" />}
              iconBg="bg-success/10"
              trendValue={paidPct ? `${paidPct}%` : undefined}
              trendDirection="up"
              onViewAll={() => router.push('/')}
              viewAllLabel={t('viewAll')}
            />
            <KpiCard
              title={t('outstanding')}
              value={fmt(computed.pending.amount + computed.overdue.amount)}
              subtitle={`${computed.pending.count + computed.overdue.count} ${tInvoice('status.pending').toLowerCase()} / ${tInvoice('status.overdue').toLowerCase()}`}
              icon={<AlertTriangle className="h-5 w-5 text-danger" />}
              iconBg="bg-danger/10"
              trendValue={overduePct ? `${overduePct}%` : undefined}
              trendDirection={overduePct > 20 ? 'down' : overduePct > 0 ? 'neutral' : 'up'}
              onViewAll={() => router.push('/')}
              viewAllLabel={t('viewAll')}
            />
          </div>

          {/* ---- Analytics Card (area chart + inline KPIs) --------------- */}
          <Card className="border border-default-200 dark:border-default-100 shadow-sm">
            <CardBody className="p-5">
              <h3 className="text-base font-bold mb-4">{t('monthlyTrend')}</h3>
              {/* Inline stat chips */}
              <div className="flex flex-wrap gap-x-8 gap-y-3 mb-5">
                {[
                  { label: tInvoice('status.paid'), value: fmt(computed.paid.amount), color: 'text-success' },
                  { label: tInvoice('status.pending'), value: fmt(computed.pending.amount), color: 'text-warning' },
                  { label: tInvoice('status.overdue'), value: fmt(computed.overdue.amount), color: 'text-danger' },
                  { label: tInvoice('status.cancelled'), value: fmt(computed.cancelled.amount), color: 'text-default-400' },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <span className={`text-xs font-medium ${item.color}`}>{item.label}</span>
                    <span className="text-lg font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              {/* Area Chart */}
              {stats.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-default-400">{t('noData')}</div>
              ) : chartsReady ? (
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
                    <Area type="monotone" dataKey="paid" name={tInvoice('status.paid')} stroke={STATUS_COLORS.paid} fill="url(#gradPaid)" strokeWidth={2} />
                    <Area type="monotone" dataKey="pending" name={tInvoice('status.pending')} stroke={STATUS_COLORS.pending} fill="url(#gradPending)" strokeWidth={2} />
                    <Area type="monotone" dataKey="overdue" name={tInvoice('status.overdue')} stroke={STATUS_COLORS.overdue} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 260 }} />
              )}
            </CardBody>
          </Card>

          {/* ---- Bottom Row: Donut + Stacked Bar -------------------------*/}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Donut with side legend */}
            <Card className="border border-default-200 dark:border-default-100 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-0">
                <h3 className="text-base font-bold">{t('statusDistribution')}</h3>
              </CardHeader>
              <CardBody className="px-5 pb-5">
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-default-400">{t('noData')}</div>
                ) : (
                  <>
                    <div className="flex items-center gap-8">
                      {/* Donut */}
                      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                        <PieChart width={200} height={200}>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip content={<ChartTooltip fmtValue={(v) => String(v)} />} />
                        </PieChart>
                        {/* Center label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold">{computed.total}</span>
                          <span className="text-xs text-default-400">{t('totalInvoices')}</span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        {[
                          { key: 'pending', label: tInvoice('status.pending'), color: STATUS_COLORS.pending, count: computed.pending.count, amount: computed.pending.amount },
                          { key: 'paid', label: tInvoice('status.paid'), color: STATUS_COLORS.paid, count: computed.paid.count, amount: computed.paid.amount },
                          { key: 'overdue', label: tInvoice('status.overdue'), color: STATUS_COLORS.overdue, count: computed.overdue.count, amount: computed.overdue.amount },
                          { key: 'cancelled', label: tInvoice('status.cancelled'), color: STATUS_COLORS.cancelled, count: computed.cancelled.count, amount: computed.cancelled.amount },
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
                <h3 className="text-base font-bold">{t('amountByStatus')}</h3>
                <p className="text-2xl font-bold">{fmt(computed.totalAmount)}</p>
              </CardHeader>
              <CardBody className="px-2 pb-4">
                {stats.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-default-400">{t('noData')}</div>
                ) : chartsReady ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-default-200 dark:text-default-100" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-default-400" />
                      <RechartsTooltip content={<ChartTooltip fmtValue={fmt} />} />
                      <Bar dataKey="paid" name={tInvoice('status.paid')} stackId="a" fill={STATUS_COLORS.paid} />
                      <Bar dataKey="pending" name={tInvoice('status.pending')} stackId="a" fill={STATUS_COLORS.pending} />
                      <Bar dataKey="overdue" name={tInvoice('status.overdue')} stackId="a" fill={STATUS_COLORS.overdue} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 220 }} />
                )}
                {/* Bottom legend */}
                <div className="flex items-center justify-center gap-4 mt-2">
                  {[
                    { label: tInvoice('status.paid'), color: STATUS_COLORS.paid },
                    { label: tInvoice('status.pending'), color: STATUS_COLORS.pending },
                    { label: tInvoice('status.overdue'), color: STATUS_COLORS.overdue },
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
