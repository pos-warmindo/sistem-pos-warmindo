import React, { Suspense } from "react";
import DailyRevenueCard from "@/components/dashboard/DailyRevenueCard";
import MonthlyRevenueCard from "@/components/dashboard/MonthlyRevenueCard";
import TopProductsCard from "@/components/dashboard/TopProductsCard";
import TopModifiersCard from "@/components/dashboard/TopModifiersCard";
import LowStockAlertCard from "@/components/dashboard/LowStockAlertCard";
import { Skeleton } from "@/components/ui/skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="space-y-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="space-y-3 mt-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3 w-full">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OwnerDashboardPage() {
  return (
    <main className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight md:text-3xl">
          Ringkasan Bisnis
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Selamat datang kembali! Berikut adalah ringkasan laporan performa outlet hari ini.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <DailyRevenueCard />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <MonthlyRevenueCard />
        </Suspense>
      </section>

      {/* Detailed Analysis Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Suspense fallback={<ListCardSkeleton />}>
          <TopProductsCard />
        </Suspense>

        <Suspense fallback={<ListCardSkeleton />}>
          <TopModifiersCard />
        </Suspense>

        <Suspense fallback={<ListCardSkeleton />}>
          <LowStockAlertCard />
        </Suspense>
      </section>
    </main>
  );
}