"use client";

import { Button, Card, Chip, cn, Tooltip } from "@heroui/react";
import { Icon } from "@iconify/react";

// ── Types ────────────────────────────────────────────────────────

export interface KpiItem {
  title: string;
  value: string;
  fullValue?: string;
  subtitle?: string;
  change?: string;
  changeType: "positive" | "negative" | "neutral" | "info" | "default";
  iconName: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
}

export type DashboardKpiProps = KpiItem;

// ── Component ────────────────────────────────────────────────────

export default function DashboardKpi({
  title,
  value,
  fullValue,
  subtitle,
  change,
  changeType,
  iconName,
  onViewAll,
  viewAllLabel,
}: DashboardKpiProps) {
  return (
    <Card className="dark:border-default-100 border border-transparent">
      <div className="flex flex-1 p-4">
        <div
          className={cn(
            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            {
              "bg-default-100": changeType === "default",
              "bg-primary-50": changeType === "info",
              "bg-success-50": changeType === "positive",
              "bg-warning-50": changeType === "neutral",
              "bg-danger-50": changeType === "negative",
            },
          )}
        >
          <Icon
            className={cn({
              "text-default-500": changeType === "default",
              "text-primary": changeType === "info",
              "text-success": changeType === "positive",
              "text-warning": changeType === "neutral",
              "text-danger": changeType === "negative",
            })}
            icon={iconName}
            width={20}
          />
        </div>

        <div className="flex w-full flex-col gap-y-1">
          <dt className="text-small text-default-500 mx-4 font-medium whitespace-nowrap">
            {title}
          </dt>
          <dd className="text-default-700 px-4 text-2xl font-semibold whitespace-nowrap">
            {fullValue ? (
              <Tooltip content={fullValue} delay={0} closeDelay={0}>
                <span>{value}</span>
              </Tooltip>
            ) : value}
          </dd>
          {subtitle && (
            <dd className="text-default-400 px-4 text-xs whitespace-nowrap">{subtitle}</dd>
          )}
        </div>

        {change && (
          <Chip
            className="absolute right-4 top-4"
            classNames={{ content: "font-semibold text-[0.65rem]" }}
            color={
              changeType === "default"
                ? "default"
                : changeType === "info"
                  ? "primary"
                  : changeType === "positive"
                    ? "success"
                    : changeType === "neutral"
                      ? "warning"
                      : "danger"
            }
            radius="sm"
            size="sm"
            startContent={
              changeType === "positive" ? (
                <Icon
                  height={12}
                  icon="solar:arrow-right-up-linear"
                  width={12}
                />
              ) : changeType === "negative" ? (
                <Icon
                  height={12}
                  icon="solar:arrow-right-down-linear"
                  width={12}
                />
              ) : (
                <Icon
                  height={12}
                  icon="solar:arrow-right-linear"
                  width={12}
                />
              )
            }
            variant="flat"
          >
            {change}
          </Chip>
        )}
      </div>

      {onViewAll && (
        <div className="mt-auto bg-default-100">
          <Button
            fullWidth
            className="text-default-500 flex justify-start text-xs data-pressed:scale-100"
            radius="none"
            variant="light"
            onPress={onViewAll}
          >
            {viewAllLabel ?? "View All"}
          </Button>
        </div>
      )}
    </Card>
  );
}
