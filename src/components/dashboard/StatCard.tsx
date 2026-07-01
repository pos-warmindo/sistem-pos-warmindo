import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string | number;
    label: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          {value}
        </h3>

        {(subtitle || trend) && (
          <div className="mt-2 flex items-center space-x-2 text-xs">
            {trend && (
              <span
                className={cn(
                  "font-semibold",
                  trend.isPositive ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-400 font-medium">{subtitle}</span>
            )}
            {trend && !subtitle && (
              <span className="text-slate-400 font-medium">{trend.label}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
