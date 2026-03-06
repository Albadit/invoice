"use client";

import React from "react";
import {BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer} from "recharts";
import type {BarProps} from "recharts";
import {Card, cn} from "@heroui/react";
import type {MonthlyBucket} from "@/features/dashboard/hooks/useDashboardStats";
import {useTranslation} from "@/contexts/LocaleProvider";
import {STATUS_THEME_MAP} from "@/features/dashboard/utils";

/** Status key → HeroUI HSL fill colour */
const STATUS_FILL: Record<string, string> = {
  paid: "hsl(var(--heroui-success-400))",
  pending: "hsl(var(--heroui-warning-400))",
  overdue: "hsl(var(--heroui-danger-400))",
  cancelled: "hsl(var(--heroui-default-400))",
};

const DATA_KEYS = ["paid", "pending", "overdue", "cancelled"] as const;

type BarShapeProps = Parameters<Extract<BarProps["shape"], (...args: never[]) => unknown>>[0];

/** Custom bar shape: rounds top corners only for the topmost non-zero segment */
function TopRoundedBar(keyIndex: number) {
  const Shape = (props: BarShapeProps) => {
    const {x = 0, y = 0, width = 0, height = 0, fill, payload} = props;
    if (!height || height <= 0) return null;

    // Check if every key above this one in the stack is zero
    const keysAbove = DATA_KEYS.slice(keyIndex + 1);
    const rec = payload as Record<string, number>;
    const isTop = keysAbove.every((k) => !rec[k]);

    const r = isTop ? 4 : 0;

    return (
      <path
        d={
          `M${x},${y + r}` +
          `Q${x},${y} ${x + r},${y}` +
          `L${x + width - r},${y}` +
          `Q${x + width},${y} ${x + width},${y + r}` +
          `L${x + width},${y + height}` +
          `L${x},${y + height}Z`
        }
        fill={fill as string}
      />
    );
  };
  Shape.displayName = `TopRoundedBar_${DATA_KEYS[keyIndex]}`;
  return Shape;
}

export interface DashboardBarProps {
  monthlyData: MonthlyBucket[];
  fmt: (amount: number) => string;
  statusLabels: {
    paid: string;
    pending: string;
    overdue: string;
    cancelled: string;
  };
  title?: string;
  isEmpty?: boolean;
  emptyLabel?: string;
}

export default function DashboardBar({
  monthlyData,
  fmt,
  statusLabels,
  title,
  isEmpty,
  emptyLabel,
}: DashboardBarProps) {
  const {t} = useTranslation("dashboard");

  const categories = DATA_KEYS.map((k) => ({
    key: k,
    label: statusLabels[k],
    fill: STATUS_FILL[k],
    theme: STATUS_THEME_MAP[k],
  }));

  return (
    <Card as="dl" className={cn("dark:border-default-100 min-h-75 border border-transparent")}>
      {/* Header + legend */}
      <div className="flex flex-col gap-y-4 p-4">
        <h3 className="text-small text-default-500 font-medium">{title ?? t("amountByStatus")}</h3>
        <div className="text-tiny text-default-500 flex w-full justify-end gap-4 overflow-x-auto">
          {categories.map((c) => (
            <div key={c.key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{backgroundColor: c.fill}}
              />
              <span className="capitalize">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart area */}
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-default-400">
          {emptyLabel ?? t("noData")}
        </div>
      ) : (
        <ResponsiveContainer
          className="[&_.recharts-surface]:outline-hidden"
          height="100%"
          width="100%"
        >
          <BarChart
            accessibilityLayer
            data={monthlyData}
            margin={{top: 20, right: 14, left: -8, bottom: 5}}
          >
            <XAxis
              dataKey="label"
              strokeOpacity={0.25}
              style={{fontSize: "var(--heroui-font-size-tiny)"}}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              style={{fontSize: "var(--heroui-font-size-tiny)"}}
              tickLine={false}
            />
            <Tooltip
              content={({payload}) => {
                if (!payload?.length) return null;
                return (
                  <div className="rounded-medium bg-background text-tiny shadow-small flex h-auto min-w-30 items-center gap-x-2 p-2">
                    <div className="flex w-full flex-col gap-y-1">
                      <span className="text-foreground font-medium">
                        {payload[0]?.payload?.label}
                      </span>
                      {payload.map((p, index) => {
                        const k = p.dataKey as string;
                        const cat = categories.find((c) => c.key === k);
                        return (
                          <div key={`${index}-${k}`} className="flex w-full items-center gap-x-2">
                            <div
                              className="h-2 w-2 flex-none rounded-full"
                              style={{backgroundColor: cat?.fill ?? "#888"}}
                            />
                            <div className="text-default-700 flex w-full items-center justify-between gap-x-2 pr-1 text-xs">
                              <span className="text-default-500">{cat?.label ?? k}</span>
                              <span className="text-default-700 font-mono font-medium">
                                {fmt(p.value as number)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }}
              cursor={false}
            />
            {DATA_KEYS.map((key, index) => (
              <Bar
                key={key}
                animationDuration={450}
                animationEasing="ease"
                barSize={24}
                dataKey={key}
                fill={STATUS_FILL[key]}
                shape={TopRoundedBar(index)}
                stackId="bars"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
