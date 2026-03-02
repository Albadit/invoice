"use client";

import type {CardProps} from "@heroui/react";

import React from "react";
import {ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Label} from "recharts";
import {
  Card,
  cn,
} from "@heroui/react";

type ChartData = {
  name: string;
  color: string;
  [key: string]: string | number;
};

type CircleChartProps = {
  title: string;
  total: number;
  unit?: string;
  categories: string[];
  chartData: ChartData[];
};

export type { CircleChartProps as DashboardCircleChartProps };

export default function DashboardCircleChart(props: CircleChartProps) {
  return <CircleChartCard {...props} />;
}

const formatTotal = (total: number) => {
  return total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total;
};

const CircleChartCard = React.forwardRef<
  HTMLDivElement,
  Omit<CardProps, "children"> & CircleChartProps
>(({className, title, total, unit, categories, chartData, ...props}, ref) => {
  return (
    <Card
      as="dl"
      ref={ref}
      className={cn("w-full dark:border-default-100 border border-transparent", className)}
      {...props}
    >
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center justify-between gap-x-2">
          <dt>
            <h3 className="text-medium text-foreground font-medium">{title}</h3>
          </dt>
        </div>
      </div>
      <div className="flex h-full flex-wrap items-center justify-center gap-x-2 lg:flex-nowrap">
        <ResponsiveContainer
          className="w-full max-w-70 [&_.recharts-surface]:outline-hidden"
          height={280}
          width="100%"
        >
          <PieChart accessibilityLayer margin={{top: 0, right: 0, left: 0, bottom: 0}}>
            <Tooltip
              content={({label, payload}) => (
                <div className="rounded-medium bg-background text-tiny shadow-small flex h-8 min-w-30 items-center gap-x-2 px-1">
                  <span className="text-foreground font-medium">{label}</span>
                  {payload?.map((p) => {
                    const name = p.name;
                    const value = p.value;
                    const category = categories.find((c) => c.toLowerCase() === name) ?? name;
                    const index = chartData.findIndex((c) => c.name === name);

                    return (
                      <div key={`${index}-${name}`} className="flex w-full items-center gap-x-2">
                        <div
                          className="h-3 w-3 flex-none rounded-full"
                          style={{
                            backgroundColor: chartData[index]?.color ?? "#888",
                          }}
                        />
                        <div className="text-default-700 flex w-full items-center justify-between gap-x-2 pr-1 text-xs">
                          <span className="text-default-500">{category}</span>
                          <span className="text-default-700 font-mono font-medium">
                            {formatTotal(value as number)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              cursor={false}
            />
            <Pie
              animationDuration={1000}
              animationEasing="ease"
              cornerRadius={12}
              data={chartData}
              dataKey="value"
              innerRadius="55%"
              outerRadius="75%"
              nameKey="name"
              paddingAngle={-20}
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                />
              ))}
              <Label
                content={({viewBox}) => {
                  if (viewBox && "x" in viewBox && "y" in viewBox) {
                    return (
                      <text
                        dominantBaseline="auto"
                        textAnchor="middle"
                        x={viewBox.x! + viewBox.width! / 2}
                        y={viewBox.y! + viewBox.height! / 2}
                      >
                        <tspan
                          fill="hsl(var(--heroui-default-700))"
                          fontSize={28}
                          fontWeight={600}
                          x={viewBox.x! + viewBox.width! / 2}
                          y={viewBox.y! + viewBox.height! / 2}
                        >
                          {formatTotal(total)}
                        </tspan>
                        <tspan
                          fill="hsl(var(--heroui-default-500))"
                          fontSize={14}
                          fontWeight={500}
                          x={viewBox.x! + viewBox.width! / 2}
                          y={viewBox.y! + 18 + viewBox.height! / 2}
                        >
                          {unit}
                        </tspan>
                      </text>
                    );
                  }

                  return null;
                }}
                position="center"
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="text-sm text-default-500 flex w-full flex-col justify-center gap-4 p-4 lg:p-0">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{
                  backgroundColor: chartData[index]?.color ?? "#888",
                }}
              />
              <div className="flex items-center gap-2 flex-1">
                <span className="capitalize">{category}</span>
                <span className="font-mono font-medium">{chartData[index]?.value ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
});

CircleChartCard.displayName = "CircleChartCard";
