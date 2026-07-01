import React from "react";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";
import { DollarSign } from "@/lib/icons";
import StatCard from "./StatCard";

export default async function DailyRevenueCard() {
  const supabase = await createClient();

  // Hitung awal hari ini dalam zona waktu WIB (UTC+7)
  const now = new Date();
  const wibTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  wibTime.setUTCHours(0, 0, 0, 0);
  const startOfTodayUTC = new Date(wibTime.getTime() - 7 * 60 * 60 * 1000);
  const startOfTodayISO = startOfTodayUTC.toISOString();

  // Query total pendapatan hari ini (status PAID)
  const { data: orders, error } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("status", "PAID")
    .gte("created_at", startOfTodayISO);

  if (error) {
    console.error("[DailyRevenueCard] Gagal memuat data pendapatan:", error);
  }

  const dailyRevenue = orders
    ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
    : 0;

  return (
    <StatCard
      title="Pendapatan Hari Ini"
      value={formatRupiah(dailyRevenue)}
      subtitle="Hari ini (WIB)"
      icon={DollarSign}
    />
  );
}
