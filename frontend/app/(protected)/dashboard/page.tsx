'use client';

import { useState, useEffect, useMemo } from 'react';
import { Spinner } from '@heroui/spinner';
import { useTranslation, useLocale } from '@/contexts/LocaleProvider';
import { useRouter } from 'next/navigation';

import type { Company, Currency, InvoiceStat } from '@/lib/types';

import { pctOfTotal, formatValue } from '@/features/dashboard/utils';
import { invoicesApi } from '@/features/invoice/api';
import { companiesApi } from '@/features/companies/api';
import { currenciesApi } from '@/features/currencies/api';
import { settingsApi } from '@/features/settings/api';
import { useDashboardComputed } from '@/features/dashboard/hooks/useDashboardStats';
import {
  DashboardGraph,
  DashboardKpi,
  DashboardCircleChart,
  DashboardBar,
  type KpiItem,
} from '@/features/dashboard/components';
import { StickyHeader, Select, SelectItem } from '@/components/ui';
import { INVOICE_ROUTES } from '@/config/routes';

// ===================================================================
export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const { t: tInvoice } = useTranslation('invoice');
  const { locale } = useLocale();
  const router = useRouter();

  // ── Data fetching (app layer responsibility) ────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<InvoiceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set(['all']));
  const [selectedYears, setSelectedYears] = useState<Set<string>>(new Set(['all']));
  const [displayCurrencyId, setDisplayCurrencyId] = useState<string | null>(null);
  const [customRates, setCustomRates] = useState<Record<string, number>>({});


  useEffect(() => {
    async function load() {
      try {
        const [c, cu, userSettings] = await Promise.all([
          companiesApi.getAll(),
          currenciesApi.getAll(),
          settingsApi.get().catch(() => null),
        ]);
        setCompanies(c);
        setCurrencies(cu);
        // Load user's custom exchange rate overrides
        if (userSettings?.custom_exchange_rates) {
          setCustomRates(userSettings.custom_exchange_rates as Record<string, number>);
        }
        // Default display currency: user setting → USD → first company's currency → first available
        const saved = userSettings?.dashboard_currency_id;
        const valid = saved && cu.some((cur: Currency) => cur.id === saved) ? saved : null;
        const usdId = cu.find((cur: Currency) => cur.code === 'USD')?.id ?? null;
        const fallback = valid ?? usdId ?? (c.length > 0 ? c[0].currency_id : null) ?? (cu.length > 0 ? cu[0].id : null);
        if (fallback) setDisplayCurrencyId(fallback);
      } catch { /* ignore */ }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        setStats(await invoicesApi.getStats());
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    loadStats();
  }, []);

  // Filter stats by selected companies (client-side)
  const isAllCompanies = selectedCompanies.has('all');
  const isAllYears = selectedYears.has('all');
  const filteredStats = useMemo(() => {
    if (isAllCompanies) return stats;
    return stats.filter((s) => selectedCompanies.has(s.company_id));
  }, [stats, selectedCompanies, isAllCompanies]);

  // ── Pure computation (feature hook) ─────────────────────────────
  const {
    availableYears,
    computed, fmt, fmtCompact, monthlyData, overduePct,
  } = useDashboardComputed(filteredStats, currencies, selectedYears, displayCurrencyId, customRates);

  // Pie data (non-zero slices only)
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <StickyHeader title={t('title')} subtitle={t('subtitle')}>
        <div className="sm:ml-auto shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Select
            search
            label={t('filterCurrency')}
            labelPlacement="inside"
            selectedKeys={displayCurrencyId ? [displayCurrencyId] : []}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0];
              if (selected) setDisplayCurrencyId(String(selected));
            }}
            className="w-full sm:w-44"
            size="sm"
          >
            {currencies.map((c) => (
              <SelectItem key={c.id} textValue={`${c.code} (${c.symbol})`}>
                {c.code} ({c.symbol})
              </SelectItem>
            ))}
          </Select>
          <Select
            label={t('filterYear')}
            labelPlacement="inside"
            selectionMode="multiple"
            selectedKeys={selectedYears}
            onSelectionChange={(keys) => {
              const selected = new Set(Array.from(keys).map(String));
              if (selected.size === 0) {
                setSelectedYears(new Set(['all']));
              } else if (selected.has('all') && !selectedYears.has('all')) {
                setSelectedYears(new Set(['all']));
              } else {
                selected.delete('all');
                setSelectedYears(selected);
              }
            }}
            className="w-full sm:w-36"
            size="sm"
          >
            {[{ key: 'all', label: t('allYears') }, ...availableYears.map((y) => ({ key: String(y), label: String(y) }))].map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>
          <Select
            label={t('filterCompany')}
            labelPlacement="inside"
            selectionMode="multiple"
            selectedKeys={selectedCompanies}
            onSelectionChange={(keys) => {
              const selected = new Set(Array.from(keys).map(String));
              if (selected.size === 0) {
                setSelectedCompanies(new Set(['all']));
              } else if (selected.has('all') && !selectedCompanies.has('all')) {
                // User clicked "All" — reset to all
                setSelectedCompanies(new Set(['all']));
              } else {
                // User picked specific companies — remove "all"
                selected.delete('all');
                setSelectedCompanies(selected);
              }
            }}
            className="w-full sm:w-64"
            size="sm"
          >
            {[{key: 'all', name: t('allCompanies')}, ...companies.map((c) => ({key: c.id, name: c.name}))].map((item) => (
              <SelectItem key={item.key} textValue={item.name}>{item.name}</SelectItem>
            ))}
          </Select>
        </div>
      </StickyHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* ---- KPI Row (4 cards) --------------------------------------- */}
          {(() => {
            // Build query string based on selected company/year
            const params = new URLSearchParams();
            if (!isAllCompanies) {
              const companyArr = Array.from(selectedCompanies);
              if (companyArr.length === 1) params.set('company', companyArr[0]);
            }
            if (!isAllYears) {
              const yearArr = Array.from(selectedYears);
              if (yearArr.length === 1) params.set('year', yearArr[0]);
            }
            const qs = (status?: string) => {
              const p = new URLSearchParams(params);
              if (status) p.set('status', status);
              const s = p.toString();
              return s ? `${INVOICE_ROUTES.list}?${s}` : INVOICE_ROUTES.list;
            };

            const kpiItems: KpiItem[] = [
              {
                title: t('totalInvoices'),
                value: formatValue(computed.total, 'number', locale),
                fullValue: computed.total.toLocaleString(),
                changeType: 'info',
                iconName: 'solar:document-text-linear',
                onViewAll: () => router.push(qs()),
                viewAllLabel: t('viewAll'),
              },
              {
                title: t('totalRevenue'),
                value: fmtCompact(computed.paid.amount, locale),
                fullValue: fmt(computed.paid.amount),
                subtitle: `${computed.paid.count} ${tInvoice('status.paid').toLowerCase()}`,
                change: pctOfTotal(computed.paid.count, computed.total),
                changeType: 'positive',
                iconName: 'solar:wallet-money-outline',
                onViewAll: () => router.push(qs('paid')),
                viewAllLabel: t('viewAll'),
              },
              {
                title: t('outstanding'),
                value: fmtCompact(computed.pending.amount + computed.overdue.amount, locale),
                fullValue: fmt(computed.pending.amount + computed.overdue.amount),
                subtitle: `${computed.pending.count + computed.overdue.count} ${tInvoice('status.pending').toLowerCase()} / ${tInvoice('status.overdue').toLowerCase()}`,
                change: pctOfTotal(computed.pending.count + computed.overdue.count, computed.total),
                changeType: overduePct > 20 ? 'negative' : overduePct > 0 ? 'neutral' : 'negative',
                iconName: 'solar:hand-money-linear',
                onViewAll: () => router.push(qs('pending,overdue')),
                viewAllLabel: t('viewAll'),
              },
              {
                title: tInvoice('status.cancelled'),
                value: fmtCompact(computed.cancelled.amount, locale),
                fullValue: fmt(computed.cancelled.amount),
                subtitle: `${computed.cancelled.count} ${tInvoice('status.cancelled').toLowerCase()}`,
                change: computed.total ? pctOfTotal(computed.cancelled.count, computed.total) : undefined,
                changeType: 'default',
                iconName: 'solar:close-circle-linear',
                onViewAll: () => router.push(qs('cancelled')),
                viewAllLabel: t('viewAll'),
              },
            ];

            return (
              <dl className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {kpiItems.map((item, index) => (
                  <DashboardKpi key={index} {...item} />
                ))}
              </dl>
            );
          })()}

          {/* ---- Analytics Card (DashboardGraph) ----------------------- */}
          <DashboardGraph
            monthlyData={monthlyData}
            stats={filteredStats}
            fmt={fmt}
            fmtCompact={fmtCompact}
            convertAmount={(() => {
              const displayRate = currencies.find(c => c.id === displayCurrencyId)?.exchange_rate ?? 1;
              return (amount: number, invoiceRate: number) =>
                amount * (displayRate / (invoiceRate || 1));
            })()}
            statusLabels={{
              paid: tInvoice('status.paid'),
              pending: tInvoice('status.pending'),
              overdue: tInvoice('status.overdue'),
              cancelled: tInvoice('status.cancelled'),
            }}
            title={t('revenueOverview')}
            isAllYears={!selectedYears.has('all') && selectedYears.size === 1 ? false : true}
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
