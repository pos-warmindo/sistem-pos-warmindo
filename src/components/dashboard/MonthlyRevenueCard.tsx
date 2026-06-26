import React from "react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";
import { TrendingUp } from "@/lib/icons";
import StatCard from "./StatCard";

export default async function MonthlyRevenueCard() {
  const supabase = await createClient();

  // Hitung awal bulan ini dalam zona waktu WIB (UTC+7)
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const startOfMonthWIB = new Date(
    wibTime.getUTCFullYear(),
    wibTime.getUTCMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const startOfMonthUTC = new Date(startOfMonthWIB.getTime() - 7 * 60 * 60 * 1000);
  const startOfMonthISO = startOfMonthUTC.toISOString();

  // Query total pendapatan bulan ini (status PAID)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("status", "PAID")
    .gte("created_at", startOfMonthISO);

  if (error) {
    console.error("[MonthlyRevenueCard] Gagal memuat data pendapatan:", error);
  }

  const monthlyRevenue = orders
    ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    : 0;

  return (
    <StatCard
      title="Pendapatan Bulan Ini"
      value={formatRupiah(monthlyRevenue)}
      subtitle="Bulan ini (WIB)"
      icon={TrendingUp}
    />
  );
}
