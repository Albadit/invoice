"use client";

import React from "react";
import {
  Chip,
  Card,
  cn,
  Tab,
  Tabs,
  Spacer,
} from "@heroui/react";
import {Icon} from "@iconify/react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis} from "recharts";
import type {MonthlyBucket} from "@/features/dashboard/hooks/useDashboardStats";
import type {InvoiceStat, InvoiceStatus} from "@/lib/types";
import { getEffectiveStatus } from '@/config/formatting';
import {useTranslation, useLocale} from "@/contexts/LocaleProvider";
import {getIntlLocale} from "@/lib/i18n/settings";
import {formatValue, STATUS_THEME_MAP, pctOfTotal} from "@/features/dashboard/utils";

type ChartData = {
  month: string;
  value: number;
};

/** A single day's aggregated amounts by status */
type DailyBucket = {
  key: string;       // "YYYY-MM-DD"
  label: string;     // localized short date label, e.g. "Feb 22"
  paid: number;
  pending: number;
  overdue: number;
};

type Chart = {
  key: string;
  title: string;
  value: number;
  suffix: string;
  type: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  chartData: ChartData[];
};

export interface DashboardGraphProps {
  monthlyData: MonthlyBucket[];
  stats: InvoiceStat[];
  fmt: (amount: number) => string;
  statusLabels: {
    paid: string;
    pending: string;
    overdue: string;
  };
  title: string;
}

type TimePeriod = "1-year" | "6-months" | "3-months" | "30-days" | "7-days";

/**
 * 🚨 This example requires installing the `recharts` package:
 * `npm install recharts`
 *
 * ```tsx
 * import {Area, AreaChart, ResponsiveContainer, YAxis} from "recharts";
 * ```
 */
export default function DashboardGraph({
  monthlyData,
  stats,
  fmt,
  statusLabels,
  title: sectionTitle,
}: DashboardGraphProps) {
  const {t} = useTranslation("dashboard");
  const {locale} = useLocale();

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

  /** Format a Date as a short localized label, e.g. "Feb 22" */
  const dayLabel = React.useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(intlLocale, {month: "short", day: "numeric"}).format(date),
    [intlLocale],
  );

  /** Format a Date as a long localized label for tooltips, e.g. "February 22" */
  const dayLabelLong = React.useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(intlLocale, {month: "long", day: "numeric"}).format(date),
    [intlLocale],
  );

  // ── Time-period filter ─────────────────────────────────────────
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>("1-year");

  // ── Daily buckets for 7-day / 30-day periods ───────────────────
  const isDailyPeriod = timePeriod === "7-days" || timePeriod === "30-days";

  // ── Shared X-axis config (single source of truth) ──────────────
  const xAxisProps = React.useMemo(() => {
    const base = {
      axisLine: false as const,
      dataKey: "month",
      style: {fontSize: "var(--heroui-font-size-tiny)"},
      tickLine: false as const,
      angle: -45,
      textAnchor: "end" as const,
      height: 5,
      tickMargin: 10,
    };
    if (isDailyPeriod) {
      return {...base, interval: 0 as const};
    }
    return base;
  }, [isDailyPeriod]);

  // ── Shared chart margin (single source of truth) ───────────────
  const chartMargin = {left: 20, right: 20, bottom: 40};
  const periodDays: Record<string, number> = {"30-days": 30, "7-days": 7};

  const dailyData = React.useMemo<DailyBucket[]>(() => {
    if (!isDailyPeriod) return [];
    const days = periodDays[timePeriod] ?? 7;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Build empty day buckets from today back N-1 days
    const buckets: DailyBucket[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      buckets.push({key, label: dayLabel(d), paid: 0, pending: 0, overdue: 0});
    }

    // Fill from raw stats
    stats.forEach((inv) => {
      if (!inv.issue_date) return;
      const dateKey = inv.issue_date.slice(0, 10); // "YYYY-MM-DD"
      const bucket = buckets.find((b) => b.key === dateKey);
      if (!bucket) return;
      const amount = inv.total_amount ?? 0;
      const effStatus = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
      if (effStatus === "paid") bucket.paid += amount;
      else if (effStatus === "overdue") bucket.overdue += amount;
      else if (effStatus === "pending") bucket.pending += amount;
    });

    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDailyPeriod, timePeriod, stats, dayLabel]);

  /** Map short day label → long day label for tooltip display */
  const shortToLongDay = React.useMemo(() => {
    const map: Record<string, string> = {};
    dailyData.forEach((d) => {
      const date = new Date(d.key + "T00:00:00");
      map[d.label] = dayLabelLong(date);
    });
    return map;
  }, [dailyData, dayLabelLong]);

  const filteredMonthlyData = React.useMemo(() => {
    const periodMonths: Record<TimePeriod, number> = {"1-year": 12, "6-months": 6, "3-months": 3, "30-days": 1, "7-days": 1};
    if (isDailyPeriod || timePeriod === "1-year") return monthlyData;

    const n = periodMonths[timePeriod];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    // Check if the data belongs to the current year
    const dataYear =
      monthlyData.length > 0
        ? parseInt(monthlyData[0].key.slice(0, 4), 10)
        : currentYear;

    if (dataYear === currentYear) {
      // Longer periods: show N months starting from the current month
      const start = currentMonth;
      const end = Math.min(start + n, monthlyData.length);
      return monthlyData.slice(start, end);
    }

    // Past / future year: show the last N months of that year
    return monthlyData.slice(-n);
  }, [monthlyData, timePeriod, isDailyPeriod]); // periodMonths is a static mapping

  const data: Chart[] = React.useMemo(() => {
    // Use daily or monthly data depending on the selected period
    const toChartData = isDailyPeriod
      ? (getter: (d: DailyBucket) => number): ChartData[] =>
          dailyData.map((d) => ({month: d.label, value: getter(d)}))
      : (getter: (m: MonthlyBucket) => number): ChartData[] =>
          filteredMonthlyData.map((m) => ({month: monthShort(bucketMonthIndex(m)), value: getter(m)}));

    // Compute period-filtered totals from the visible data
    type Totals = {paid: number; pending: number; overdue: number};
    const totals: Totals = isDailyPeriod
      ? dailyData.reduce<Totals>(
          (acc, d) => ({paid: acc.paid + d.paid, pending: acc.pending + d.pending, overdue: acc.overdue + d.overdue}),
          {paid: 0, pending: 0, overdue: 0},
        )
      : filteredMonthlyData.reduce<Totals>(
          (acc, m) => ({paid: acc.paid + m.paid, pending: acc.pending + m.pending, overdue: acc.overdue + m.overdue}),
          {paid: 0, pending: 0, overdue: 0},
        );

    // Count invoices in the period (from raw stats for daily, approximate from amounts for monthly)
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    if (isDailyPeriod) {
      // Count from raw stats falling within the daily range
      const dayKeys = new Set(dailyData.map((d) => d.key));
      stats.forEach((inv) => {
        if (!inv.issue_date) return;
        const dateKey = inv.issue_date.slice(0, 10);
        if (!dayKeys.has(dateKey)) return;
        const eff = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
        if (eff === "paid") paidCount++;
        else if (eff === "overdue") overdueCount++;
        else if (eff === "pending") pendingCount++;
      });
    } else {
      // Count from raw stats falling within the monthly range
      const monthKeys = new Set(filteredMonthlyData.map((m) => m.key));
      stats.forEach((inv) => {
        if (!inv.issue_date) return;
        const monthKey = inv.issue_date.slice(0, 7); // "YYYY-MM"
        if (!monthKeys.has(monthKey)) return;
        const eff = getEffectiveStatus(inv.status as InvoiceStatus, inv.due_date);
        if (eff === "paid") paidCount++;
        else if (eff === "overdue") overdueCount++;
        else if (eff === "pending") pendingCount++;
      });
    }

    const totalCount = paidCount + pendingCount + overdueCount;

    const paidData = toChartData((b) => b.paid);
    const pendingData = toChartData((b) => b.pending);
    const overdueData = toChartData((b) => b.overdue);

    return [
      {
        key: "paid",
        title: statusLabels.paid,
        suffix: "",
        value: totals.paid,
        type: "currency",
        change: pctOfTotal(paidCount, totalCount),
        changeType: "positive" as const,
        chartData: paidData,
      },
      {
        key: "pending",
        title: statusLabels.pending,
        suffix: "",
        value: totals.pending,
        type: "currency",
        change: pctOfTotal(pendingCount, totalCount),
        changeType: "neutral" as const,
        chartData: pendingData,
      },
      {
        key: "overdue",
        title: statusLabels.overdue,
        suffix: "",
        value: totals.overdue,
        type: "currency",
        change: pctOfTotal(overdueCount, totalCount),
        changeType: "negative" as const,
        chartData: overdueData,
      },
    ];
  }, [isDailyPeriod, dailyData, filteredMonthlyData, stats, statusLabels, monthShort]);

  /** Formats a value: delegates "currency" to the fmt prop, everything else to the shared util. */
  const fmtValue = React.useCallback(
    (value: number, type: string | undefined) =>
      type === "currency" ? fmt(value) : formatValue(value, type),
    [fmt],
  );

  const [activeChart, setActiveChart] = React.useState<string | null>(null);

  const handleTabClick = (key: string) => {
    setActiveChart((prev) => (prev === key ? null : key));
  };

  // Single-series view when a tab is selected
  const activeChartData = React.useMemo(() => {
    if (activeChart === null) return null;
    const chart = data.find((d) => d.key === activeChart);

    return {
      chartData: chart?.chartData ?? [],
      color: STATUS_THEME_MAP[activeChart] ?? "default",
      suffix: chart?.suffix,
      type: chart?.type,
    };
  }, [activeChart, data]);

  // Combined data for "all" view
  const allChartData = React.useMemo(() => {
    if (activeChart !== null) return [];
    if (isDailyPeriod) {
      return dailyData.map((d) => ({
        month: d.label,
        paid: d.paid,
        pending: d.pending,
        overdue: d.overdue,
      }));
    }
    return filteredMonthlyData.map((m) => ({
      month: monthShort(bucketMonthIndex(m)),
      paid: m.paid,
      pending: m.pending,
      overdue: m.overdue,
    }));
  }, [activeChart, isDailyPeriod, dailyData, filteredMonthlyData, monthShort]);

  return (
    <Card as="dl" className="dark:border-default-100 border border-transparent">
      <section className="flex flex-col flex-nowrap">
        <div className="flex flex-col justify-between gap-y-2 p-6">
          <div className="flex flex-col gap-y-2">
            <div className="flex flex-col gap-y-0">
              <dt className="text-medium text-foreground font-medium">{sectionTitle}</dt>
            </div>
            <Spacer y={2} />
            <Tabs
              size="sm"
              selectedKey={timePeriod}
              onSelectionChange={(key) => setTimePeriod(key as TimePeriod)}
            >
              <Tab key="1-year" title={t("period1Year")} />
              <Tab key="6-months" title={t("period6Months")} />
              <Tab key="3-months" title={t("period3Months")} />
              <Tab key="30-days" title={t("period30Days")} />
              <Tab key="7-days" title={t("period7Days")} />
            </Tabs>
            <div className="mt-2 flex w-full items-center">
              <div className="-my-3 flex w-full items-center gap-4 overflow-x-auto py-3">
                {data.map(({key, change, changeType, value, title}) => (
                  <button
                    key={key}
                    className={cn(
                      "rounded-medium flex flex-col gap-2 p-3 transition-colors",
                      {
                        "bg-default-100": activeChart === key,
                      },
                    )}
                    onClick={() => handleTabClick(key)}
                  >
                    <span
                      className={cn("text-small text-default-500 font-medium transition-colors", {
                        "text-primary": activeChart === key,
                      })}
                    >
                      {title}
                    </span>
                    <div className="flex items-center gap-x-3">
                      <span className="text-foreground text-3xl font-bold">
                        {String(formatValue(value, "number"))}
                      </span>
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
          height="100%"
          width="100%"
        >
          {activeChart !== null ? (
            /* ── Single series ─────────────────────────────────── */
            <AreaChart
              accessibilityLayer
              data={activeChartData?.chartData ?? []}
              height={300}
              margin={chartMargin}
              width={500}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="10%"
                    stopColor={`hsl(var(--heroui-${activeChartData?.color ?? "default"}-500))`}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={`hsl(var(--heroui-${activeChartData?.color ?? "default"}-100))`}
                    stopOpacity={0.1}
                  />
                </linearGradient>
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
                    <div className="flex w-full flex-col gap-y-0">
                      {payload?.map((p, index) => (
                        <div key={`${index}-${p.name}`} className="flex w-full items-center gap-x-2">
                          <div className="text-small text-background flex w-full items-center gap-x-1">
                            <span>{fmtValue(p.value as number, activeChartData?.type)}</span>
                            <span>{activeChartData?.suffix}</span>
                          </div>
                        </div>
                      ))}
                      <span className="text-small text-foreground-400 font-medium">
                        {isDailyPeriod
                          ? (shortToLongDay[String(label ?? "")] ?? String(label ?? ""))
                          : (shortToLongMonth[String(label ?? "")] ?? String(label ?? ""))}
                      </span>
                    </div>
                  </div>
                )}
                cursor={{strokeWidth: 0}}
              />
              <Area
                activeDot={{
                  stroke: `hsl(var(--heroui-${activeChartData?.color ?? "default"}))`,
                  strokeWidth: 2,
                  fill: "hsl(var(--heroui-background))",
                  r: 5,
                }}
                animationDuration={1000}
                animationEasing="ease"
                dataKey="value"
                fill="url(#colorGradient)"
                stroke={`hsl(var(--heroui-${activeChartData?.color ?? "default"}))`}
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          ) : (
            /* ── All series combined ──────────────────────────── */
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
                            <span>{fmtValue(p.value as number, "currency")}</span>
                          </div>
                        </div>
                      ))}
                      <span className="text-small text-foreground-400 font-medium">
                        {isDailyPeriod
                          ? (shortToLongDay[String(label ?? "")] ?? String(label ?? ""))
                          : (shortToLongMonth[String(label ?? "")] ?? String(label ?? ""))}
                      </span>
                    </div>
                  </div>
                )}
                cursor={{strokeWidth: 0}}
              />
              {data.map(({key}) => (
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
          )}
        </ResponsiveContainer>
      </section>
    </Card>
  );
}
