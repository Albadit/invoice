'use client';

import { useState, useEffect } from 'react';
import { Select, SelectItem } from '@heroui/select';
import { Spinner } from '@heroui/spinner';
import { useTranslation } from '@/contexts/LocaleProvider';
import { useRouter } from 'next/navigation';

import type { Company, Currency, InvoiceStat } from '@/lib/types';

import { pctOfTotal } from '@/features/dashboard/utils';
import { invoicesApi } from '@/features/invoice/api';
import { companiesApi } from '@/features/companies/api';
import { currenciesApi } from '@/features/currencies/api';
import { useDashboardComputed } from '@/features/dashboard/hooks/useDashboardStats';
import DashboardGraph from '@/features/dashboard/components/DashboardGraph';
import DashboardKpi from '@/features/dashboard/components/DashboardKpi';
import DashboardCircleChart from '@/features/dashboard/components/DashboardCircleChart';
import DashboardBar from '@/features/dashboard/components/DashboardBar';
import { StickyHeader } from '@/components/ui';
import { INVOICE_ROUTES } from '@/config/routes';

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
    computed, fmt, monthlyData, overduePct,
  } = useDashboardComputed(stats, currencies, selectedYear);

  // Pie data (non-zero slices only)
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
          <DashboardKpi
            items={(() => {
              // Build query string based on selected company/year
              const params = new URLSearchParams();
              if (selectedCompany !== 'all') params.set('company', selectedCompany);
              if (selectedYear !== 'all') params.set('year', selectedYear);
              const qs = (status?: string) => {
                const p = new URLSearchParams(params);
                if (status) p.set('status', status);
                const s = p.toString();
                return s ? `${INVOICE_ROUTES.list}?${s}` : INVOICE_ROUTES.list;
              };
              return [
                {
                  title: t('totalInvoices'),
                  value: computed.total.toLocaleString(),
                  changeType: 'info' as const,
                  iconName: 'solar:document-text-linear',
                  onViewAll: () => router.push(qs()),
                  viewAllLabel: t('viewAll'),
                },
                {
                  title: t('totalRevenue'),
                  value: fmt(computed.paid.amount),
                  subtitle: `${computed.paid.count} ${tInvoice('status.paid').toLowerCase()}`,
                  change: pctOfTotal(computed.paid.count, computed.total),
                  changeType: 'positive' as const,
                  iconName: 'solar:wallet-money-outline',
                  onViewAll: () => router.push(qs('paid')),
                  viewAllLabel: t('viewAll'),
                },
                {
                  title: t('outstanding'),
                  value: fmt(computed.pending.amount + computed.overdue.amount),
                  subtitle: `${computed.pending.count + computed.overdue.count} ${tInvoice('status.pending').toLowerCase()} / ${tInvoice('status.overdue').toLowerCase()}`,
                  change: pctOfTotal(computed.pending.count + computed.overdue.count, computed.total),
                  changeType: overduePct > 20 ? 'negative' : overduePct > 0 ? 'neutral' : 'negative',
                  iconName: 'solar:hand-money-linear',
                  onViewAll: () => router.push(qs('pending,overdue')),
                  viewAllLabel: t('viewAll'),
                },
                {
                  title: tInvoice('status.cancelled'),
                  value: fmt(computed.cancelled.amount),
                  subtitle: `${computed.cancelled.count} ${tInvoice('status.cancelled').toLowerCase()}`,
                  change: computed.total ? pctOfTotal(computed.cancelled.count, computed.total) : undefined,
                  changeType: 'default' as const,
                  iconName: 'solar:close-circle-linear',
                  onViewAll: () => router.push(qs('cancelled')),
                  viewAllLabel: t('viewAll'),
                },
              ];
            })()}
          />

          {/* ---- Analytics Card (DashboardGraph) ----------------------- */}
          <DashboardGraph
            monthlyData={monthlyData}
            stats={stats}
            fmt={fmt}
            statusLabels={{
              paid: tInvoice('status.paid'),
              pending: tInvoice('status.pending'),
              overdue: tInvoice('status.overdue'),
            }}
            title={t('monthlyTrend')}
          />

          {/* ---- Bottom Row: Donut + Bar -------------------------*/}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Donut with side legend */}
            <DashboardCircleChart
              title={t('statusDistribution')}
              total={computed.total}
              unit={t('totalInvoices')}
              categories={[
                tInvoice('status.pending'),
                tInvoice('status.paid'),
                tInvoice('status.overdue'),
                tInvoice('status.cancelled'),
              ]}
              chartData={[
                { name: tInvoice('status.pending'), value: computed.pending.count, color: 'hsl(var(--heroui-warning-400))' },
                { name: tInvoice('status.paid'), value: computed.paid.count, color: 'hsl(var(--heroui-success-400))' },
                { name: tInvoice('status.overdue'), value: computed.overdue.count, color: 'hsl(var(--heroui-danger-400))' },
                { name: tInvoice('status.cancelled'), value: computed.cancelled.count, color: 'hsl(var(--heroui-default-400))' },
              ].filter((d) => d.value > 0)}
            />

            {/* Weekday Stacked Bar */}
            <DashboardBar
              monthlyData={monthlyData}
              fmt={fmt}
              statusLabels={{
                paid: tInvoice('status.paid'),
                pending: tInvoice('status.pending'),
                overdue: tInvoice('status.overdue'),
                cancelled: tInvoice('status.cancelled'),
              }}
              isEmpty={stats.length === 0}
              emptyLabel={t('noData')}
            />
          </div>
        </>
      )}
    </div>
  );
}
