'use client';

import React from 'react';
import { Card, CardBody, CardFooter } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';

// ── KPI Stat Card ────────────────────────────────────────────────

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  trendValue?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export function KpiCard({
  title, value, subtitle, icon, iconBg,
  trendValue, trendDirection, onViewAll, viewAllLabel,
}: KpiCardProps) {
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

// ── Recharts Tooltip ─────────────────────────────────────────────

export interface ChartTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  fmtValue: (v: number) => string;
}

export function ChartTooltip({ active, payload, label, fmtValue }: ChartTooltipProps) {
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

// ── Donut legend row ─────────────────────────────────────────────

export interface LegendDotProps {
  color: string;
  label: string;
  count: number;
  amount: string;
  pct: number;
}

export function LegendDot({ color, label, count, amount, pct }: LegendDotProps) {
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
