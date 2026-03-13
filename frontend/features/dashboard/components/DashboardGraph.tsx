"use client";

import React from "react";
import {
  Chip,
  Card,
  cn,
  Select,
  SelectItem,
  Tooltip as HeroTooltip,
} from "@heroui/react";
import {Icon} from "@iconify/react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis} from "recharts";
import type {MonthlyBucket} from "@/features/dashboard/hooks/useDashboardStats";
import type {InvoiceStat, InvoiceStatus} from "@/lib/types";
import { getEffectiveStatus } from '@/config/formatting';
import {useTranslation, useLocale} from "@/contexts/LocaleProvider";
import {getIntlLocale} from "@/lib/i18n/settings";
import {STATUS_THEME_MAP, pctOfTotal} from "@/features/dashboard/utils";

/** A single day's aggregated amounts by status */
type DailyBucket = {
  key: string;       // "YYYY-MM-DD"
  label: string;     // localized short date label, e.g. "Feb 22"
  paid: number;
  pending: number;
  overdue: number;
  cancelled: number;
};

type Chart = {
  key: string;
  title: string;
  value: number;
  change: string;
  changeType: "positive" | "negative" | "neutral";
};

export interface DashboardGraphProps {
  monthlyData: MonthlyBucket[];
  stats: InvoiceStat[];
  fmt: (amount: number) => string;
  fmtCompact: (amount: number, locale?: string) => string;
  convertAmount?: (amount: number, invoiceRate: number) => number;
  statusLabels: {
    paid: string;
    pending: string;
    overdue: string;
    cancelled: string;
  };
  title: string;
  isAllYears?: boolean;
}

type GraphView = "year" | "month";
const ALL_STATUSES = ["paid", "pending", "overdue", "cancelled"] as const;

export default function DashboardGraph({
  monthlyData,
  stats,
  fmt,
  fmtCompact,
  convertAmount: convertAmountProp,
  statusLabels,
  title: sectionTitle,
  isAllYears,
}: DashboardGraphProps) {
  const {t} = useTranslation("dashboard");
  const {locale} = useLocale();

  const convert = React.useCallback(
    (amount: number, rate: number) => convertAmountProp ? convertAmountProp(amount, rate) : amount,
    [convertAmountProp],
  );

  const intlLocale = getIntlLocale(locale);

  /** Get localized short month name from a MonthlyBucket key ("YYYY-MM") or 0-based index. */
  const monthShort = React.useCallback(
    (monthIndex: number) =>
      new Intl.DateTimeFormat(intlLocale, {month: "short"}).format(new Date(2024, monthIndex, 1)),
    [intlLocale],
  );

  /** Get localized long month name from a 0-based index — for tooltips. */
  const monthLong = React.useCallback(
    (monthIndex: number) =>
      new Intl.DateTimeFormat(intlLocale, {month: "long"}).format(new Date(2024, monthIndex, 1)),
    [intlLocale],
  );

  /** Map translated-short → translated-long for tooltip display */
  const shortToLongMonth = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < 12; i++) {
      map[monthShort(i)] = monthLong(i);
    }
    return map;
  }, [monthShort, monthLong]);

  /** Extract 0-based month index from a MonthlyBucket key ("YYYY-MM"). */
  const bucketMonthIndex = (bucket: MonthlyBucket) =>
    parseInt(bucket.key.slice(5, 7), 10) - 1;

  // ── Graph view: year vs month ────────────────────────────────
  const [graphView, setGraphView] = React.useState<GraphView>("year");
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth());

  // Force year view when "All Years" is selected
  React.useEffect(() => {
    if (isAllYears) setGraphView("year");
  }, [isAllYears]);

  const isMonthView = graphView === "month" && !isAllYears;

  // ── Multi-select active statuses ───────────────────────────
  const [activeStatuses, setActiveStatuses] = React.useState<Set<string>>(new Set(ALL_STATUSES));

  const toggleStatus = (key: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Month options for the month selector
  const monthOptions = React.useMemo(() => {
    return Array.from({length: 12}, (_, i) => ({
      key: String(i),
      label: monthLong(i),
    }));
  }, [monthLong]);

  // ── Shared X-axis config (single source of truth) ──────────────
  const xAxisProps = React.useMemo(() => {
    const base = {
      axisLine: false as const,
      dataKey: "month",
      style: {fontSize: "var(--heroui-font-size-tiny)"},
      tickLine: false as const,
    };
    if (isMonthView) {
      return {...base, interval: 0 as const, angle: -45, textAnchor: "end" as const, height: 5, tickMargin: 10};
    }
    if (isAllYears) {
      return {...base, interval: 0 as const, textAnchor: "middle" as const, height: 5, tickMargin: 10};
    }
    return {...base, angle: -45, textAnchor: "end" as const, height: 5, tickMargin: 10};
  }, [isMonthView, isAllYears]);

  // ── Shared chart margin (single source of truth) ───────────────
  const chartMargin = {left: 20, right: 20, bottom: 40};

  // ── Daily buckets for month view ───────────────────────────
  const monthViewDailyData = React.useMemo<DailyBucket[]>(() => {
    if (graphView !== "month") return [];
    const year = monthlyData.length > 0 ? parseInt(monthlyData[0].key.slice(0, 4), 10) : new Date().getFullYear();
    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const buckets: DailyBucket[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, selectedMonth, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.push({key, label: String(i), paid: 0, pending: 0, overdue: 0, cancelled: 0});
    }
    stats.forEach((inv) => {
      if (!inv.issue_date) return;
      const dateKey = inv.issue_date.slice(0, 10);
      const bucket = buckets.find((b) => b.key === dateKey);
      if (!bucket) return;
      const amount = convert(inv.total_amount ?? 0, inv.exchange_rate ?? 1);
      const effStatus = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
      if (effStatus === "paid") bucket.paid += amount;
      else if (effStatus === "overdue") bucket.overdue += amount;
      else if (effStatus === "pending") bucket.pending += amount;
      else if (effStatus === "cancelled") bucket.cancelled += amount;
    });
    return buckets;
  }, [graphView, selectedMonth, monthlyData, stats, convert]);

  const data: Chart[] = React.useMemo(() => {
    const useDaily = isMonthView;
    const dailySrc = monthViewDailyData;

    type Totals = {paid: number; pending: number; overdue: number; cancelled: number};
    const totals: Totals = useDaily
      ? dailySrc.reduce<Totals>(
          (acc, d) => ({paid: acc.paid + d.paid, pending: acc.pending + d.pending, overdue: acc.overdue + d.overdue, cancelled: acc.cancelled + d.cancelled}),
          {paid: 0, pending: 0, overdue: 0, cancelled: 0},
        )
      : monthlyData.reduce<Totals>(
          (acc, m) => ({paid: acc.paid + m.paid, pending: acc.pending + m.pending, overdue: acc.overdue + m.overdue, cancelled: acc.cancelled + m.cancelled}),
          {paid: 0, pending: 0, overdue: 0, cancelled: 0},
        );

    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let cancelledCount = 0;

    if (useDaily) {
      const dayKeys = new Set(dailySrc.map((d) => d.key));
      stats.forEach((inv) => {
        if (!inv.issue_date) return;
        const dateKey = inv.issue_date.slice(0, 10);
        if (!dayKeys.has(dateKey)) return;
        const eff = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
        if (eff === "paid") paidCount++;
        else if (eff === "overdue") overdueCount++;
        else if (eff === "pending") pendingCount++;
        else if (eff === "cancelled") cancelledCount++;
      });
    } else {
      const monthKeys = new Set(monthlyData.map((m) => m.key));
      stats.forEach((inv) => {
        if (!inv.issue_date) return;
        const monthKey = inv.issue_date.slice(0, 7);
        if (!monthKeys.has(monthKey)) return;
        const eff = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
        if (eff === "paid") paidCount++;
        else if (eff === "overdue") overdueCount++;
        else if (eff === "pending") pendingCount++;
        else if (eff === "cancelled") cancelledCount++;
      });
    }

    const totalCount = paidCount + pendingCount + overdueCount + cancelledCount;

    return [
      {
        key: "paid",
        title: statusLabels.paid,
        value: totals.paid,
        change: pctOfTotal(paidCount, totalCount),
        changeType: "positive" as const,
      },
      {
        key: "pending",
        title: statusLabels.pending,
        value: totals.pending,
        change: pctOfTotal(pendingCount, totalCount),
        changeType: "neutral" as const,
      },
      {
        key: "overdue",
        title: statusLabels.overdue,
        value: totals.overdue,
        change: pctOfTotal(overdueCount, totalCount),
        changeType: "negative" as const,
      },
      {
        key: "cancelled",
        title: statusLabels.cancelled,
        value: totals.cancelled,
        change: pctOfTotal(cancelledCount, totalCount),
        changeType: "negative" as const,
      },
    ];
  }, [isMonthView, isAllYears, monthViewDailyData, monthlyData, stats, statusLabels, monthShort]);

  // Filter chart data to only active statuses
  const visibleData = React.useMemo(() => data.filter((d) => activeStatuses.has(d.key)), [data, activeStatuses]);

  // Combined data for chart (only active statuses)
  const allChartData = React.useMemo(() => {
    if (isMonthView) {
      return monthViewDailyData.map((d) => {
        const point: Record<string, string | number> = {month: d.label};
        ALL_STATUSES.forEach((s) => { if (activeStatuses.has(s)) point[s] = d[s]; });
        return point;
      });
    }
    return monthlyData.map((m) => {
      const point: Record<string, string | number> = {
        month: isAllYears ? m.label : monthShort(bucketMonthIndex(m)),
      };
      ALL_STATUSES.forEach((s) => { if (activeStatuses.has(s)) point[s] = m[s]; });
      return point;
    });
  }, [isMonthView, isAllYears, monthViewDailyData, monthlyData, activeStatuses, monthShort]);

  // Tooltip label resolver
  const tooltipLabel = React.useCallback(
    (label: string) => {
      if (isMonthView) return label;
      if (isAllYears) return label;
      return shortToLongMonth[label] ?? label;
    },
    [isMonthView, isAllYears, shortToLongMonth],
  );

  return (
    <Card as="dl" className="dark:border-default-100 border border-transparent">
      <section className="flex flex-col flex-nowrap">
        <div className="flex flex-col justify-between gap-y-2 p-6">
          <div className="flex flex-col gap-y-2">
            {/* Title row + top-right controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <dt className="text-medium text-foreground font-medium">{sectionTitle}</dt>
              {!isAllYears && (
                <div className="flex flex-row-reverse items-center gap-2 shrink-0">
                  <Select
                    aria-label={t("graphView")}
                    size="sm"
                    className="w-28"
                    selectedKeys={new Set([graphView])}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys)[0];
                      if (v) setGraphView(String(v) as GraphView);
                    }}
                  >
                    <SelectItem key="year">{t("graphViewYear")}</SelectItem>
                    <SelectItem key="month">{t("graphViewMonth")}</SelectItem>
                  </Select>
                  {graphView === "month" && (
                    <Select
                      aria-label={t("selectMonth")}
                      size="sm"
                      className="w-36"
                      selectedKeys={new Set([String(selectedMonth)])}
                      onSelectionChange={(keys) => {
                        const v = Array.from(keys)[0];
                        if (v != null) setSelectedMonth(Number(v));
                      }}
                    >
                      {monthOptions.map((m) => (
                        <SelectItem key={m.key}>{m.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 flex w-full items-center">
              <div className="-my-3 flex w-full items-center gap-4 overflow-x-auto py-3">
                {data.map(({key, change, changeType, value, title}) => (
                  <button
                    key={key}
                    className={cn(
                      "rounded-medium flex flex-col gap-2 p-3 transition-colors",
                      {
                        "bg-default-100": activeStatuses.has(key),
                        "opacity-40": !activeStatuses.has(key),
                      },
                    )}
                    onClick={() => toggleStatus(key)}
                  >
                    <span
                      className={cn("text-small text-default-500 font-medium transition-colors", {
                        "text-primary": activeStatuses.has(key),
                      })}
                    >
                      {title}
                    </span>
                    <div className="flex items-center gap-x-3">
                      <HeroTooltip content={fmt(value)} delay={0} closeDelay={0}>
                        <span className="text-foreground text-2xl font-bold whitespace-nowrap">
                          {fmtCompact(value, intlLocale)}
                        </span>
                      </HeroTooltip>
                      <Chip
                        classNames={{
                          content: "font-medium",
                        }}
                        color={
                          changeType === "positive"
                            ? "success"
                            : changeType === "negative"
                              ? "danger"
                              : "warning"
                        }
                        radius="sm"
                        size="sm"
                        startContent={
                          changeType === "positive" ? (
                            <Icon height={16} icon={"solar:arrow-right-up-linear"} width={16} />
                          ) : changeType === "negative" ? (
                            <Icon height={16} icon={"solar:arrow-right-down-linear"} width={16} />
                          ) : (
                            <Icon height={16} icon={"solar:arrow-right-linear"} width={16} />
                          )
                        }
                        variant="flat"
                      >
                        <span>{change}</span>
                      </Chip>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ResponsiveContainer
          className="min-h-75 [&_.recharts-surface]:outline-hidden"
          height={300}
          width="100%"
          minWidth={0}
        >
          <AreaChart
            accessibilityLayer
            data={allChartData}
            height={300}
            margin={chartMargin}
            width={500}
          >
            <defs>
              {Object.entries(STATUS_THEME_MAP).map(([key, c]) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="10%" stopColor={`hsl(var(--heroui-${c}-500))`} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={`hsl(var(--heroui-${c}-100))`} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              horizontalCoordinatesGenerator={() => [200, 150, 100, 50]}
              stroke="hsl(var(--heroui-default-200))"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis {...xAxisProps} />
            <Tooltip
              content={({label, payload}) => (
                <div className="rounded-medium bg-foreground text-tiny shadow-small flex h-auto min-w-30 items-center gap-x-2 p-2">
                  <div className="flex w-full flex-col gap-y-1">
                    {payload?.map((p, index) => (
                      <div key={`${index}-${p.name}`} className="flex w-full items-center gap-x-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{backgroundColor: typeof p.color === "string" ? p.color : undefined}}
                        />
                        <div className="text-small text-background flex w-full items-center gap-x-1">
                          <span className="capitalize">{String(p.name)}</span>
                          <span>{fmt(p.value as number)}</span>
                        </div>
                      </div>
                    ))}
                    <span className="text-small text-foreground-400 font-medium">
                      {tooltipLabel(String(label ?? ""))}
                    </span>
                  </div>
                </div>
              )}
              cursor={{strokeWidth: 0}}
            />
            {visibleData.map(({key}) => (
              <Area
                key={key}
                activeDot={{
                  stroke: `hsl(var(--heroui-${STATUS_THEME_MAP[key]}))`,
                  strokeWidth: 2,
                  fill: "hsl(var(--heroui-background))",
                  r: 4,
                }}
                animationDuration={1000}
                animationEasing="ease"
                dataKey={key}
                fill={`url(#gradient-${key})`}
                stroke={`hsl(var(--heroui-${STATUS_THEME_MAP[key]}))`}
                strokeWidth={2}
                type="monotone"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </section>
    </Card>
  );
}
