"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, TrendingUp, DollarSign, CreditCard, FileText } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";
import { getPeriodRange, type PeriodKey, type DateRange } from "@/lib/utils/dateRange";
import RevenueChart,      { type DailyRevenue }      from "@/components/dashboard/RevenueChart";
import PaymentMethodChart, { type PaymentMethodData } from "@/components/dashboard/PaymentMethodChart";
import TopProductsChart,  { type TopProduct }         from "@/components/dashboard/TopProductsChart";
import TransactionTable,  { type Transaction }        from "@/components/dashboard/TransactionTable";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────
interface KPI {
  totalRevenue: number;
  totalOrders: number;
  avgOrder: number;
  topMethod: string;
}

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today:     "Hari Ini",
  "7days":   "7 Hari Terakhir",
  "30days":  "30 Hari Terakhir",
  thisMonth: "Bulan Ini",
  custom:    "Custom",
};

export default function LaporanPage() {
  const supabase = createClient();

  const [period, setPeriod]       = useState<PeriodKey>("7days");
  const [custom, setCustom]       = useState<DateRange>({ from: "", to: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [kpi, setKpi]                     = useState<KPI>({ totalRevenue: 0, totalOrders: 0, avgOrder: 0, topMethod: "—" });
  const [dailyRevenue, setDailyRevenue]   = useState<DailyRevenue[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [topProducts, setTopProducts]     = useState<TopProduct[]>([]);
  const [transactions, setTransactions]   = useState<Transaction[]>([]);

  // ── Fetch all report data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    const range = getPeriodRange(period, period === "custom" ? custom : undefined);
    if (period === "custom" && (!custom.from || !custom.to)) return;

    setIsLoading(true);
    try {
      const fromTs = `${range.from}T00:00:00+07:00`;
      const toTs   = `${range.to}T23:59:59+07:00`;

      // 1. Orders PAID in range
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, payment_method, status, cashier_id, users(display_name)")
        .eq("status", "PAID")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false });

      if (ordersErr) throw ordersErr;
      const ordersData = (orders ?? []) as any[];

      // KPI
      const totalRevenue = ordersData.reduce((s, o) => s + (o.total_amount ?? 0), 0);
      const totalOrders  = ordersData.length;
      const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const methodCounts: Record<string, number> = {};
      ordersData.forEach((o) => {
        const m = o.payment_method ?? "UNKNOWN";
        methodCounts[m] = (methodCounts[m] ?? 0) + 1;
      });
      const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

      setKpi({ totalRevenue, totalOrders, avgOrder, topMethod });

      // Daily revenue — group by date
      const dailyMap: Record<string, number> = {};
      ordersData.forEach((o) => {
        const date = o.created_at.split("T")[0];
        dailyMap[date] = (dailyMap[date] ?? 0) + (o.total_amount ?? 0);
      });
      setDailyRevenue(
        Object.entries(dailyMap).sort().map(([date, total]) => ({ date, total }))
      );

      // Payment methods
      const methodTotals: Record<string, { count: number; total: number }> = {};
      ordersData.forEach((o) => {
        const m = o.payment_method ?? "UNKNOWN";
        if (!methodTotals[m]) methodTotals[m] = { count: 0, total: 0 };
        methodTotals[m].count++;
        methodTotals[m].total += o.total_amount ?? 0;
      });
      setPaymentMethods(
        Object.entries(methodTotals).map(([method, d]) => ({ method, ...d }))
      );

      // Transactions table
      setTransactions(
        ordersData.map((o) => ({
          id:             o.id,
          created_at:     o.created_at,
          total_amount:   o.total_amount,
          payment_method: o.payment_method,
          status:         o.status,
          cashier_name:   (o.users as any)?.display_name ?? "—",
        }))
      );

      // 2. Top products in range (join order_items)
      const orderIds = ordersData.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity")
          .in("order_id", orderIds);

        const qtyMap: Record<string, number> = {};
        (items ?? []).forEach((item) => {
          qtyMap[item.product_name] = (qtyMap[item.product_name] ?? 0) + item.quantity;
        });
        const top5 = Object.entries(qtyMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty]) => ({ name, qty }));
        setTopProducts(top5);
      } else {
        setTopProducts([]);
      }
    } catch (err: any) {
      console.error("[Laporan] fetchData error:", err);
      toast.error("Gagal memuat data laporan: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, period, custom]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Export Excel ──────────────────────────────────────────
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const range = getPeriodRange(period, period === "custom" ? custom : undefined);
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan
      const summary = [
        ["Laporan Penjualan — Warmindo WP 2 POS"],
        [],
        ["Periode",          `${range.from} s/d ${range.to}`],
        ["Total Pendapatan", formatRupiah(kpi.totalRevenue)],
        ["Jumlah Transaksi", kpi.totalOrders],
        ["Rata-rata/Transaksi", formatRupiah(kpi.avgOrder)],
        ["Metode Terbanyak", kpi.topMethod],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Ringkasan");

      // Sheet 2: Detail Transaksi
      const txHeaders = ["Waktu", "Total (Rp)", "Metode", "Status", "Kasir"];
      const txRows = transactions.map((t) => [
        t.created_at, t.total_amount, t.payment_method ?? "—", t.status, t.cashier_name,
      ]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]), "Detail Transaksi");

      // Sheet 3: Produk Terlaris
      const prodHeaders = ["Rank", "Produk", "Qty Terjual"];
      const prodRows = topProducts.map((p, i) => [i + 1, p.name, p.qty]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([prodHeaders, ...prodRows]), "Produk Terlaris");

      // Download
      const fileName = `Laporan_WP2POS_${range.from}_${range.to}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Export berhasil: " + fileName);
    } catch (err: any) {
      toast.error("Gagal export: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const range = getPeriodRange(period, period === "custom" ? custom : undefined);

  // ── Render ─────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Laporan Penjualan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analitik transaksi dan pendapatan per periode.
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting || isLoading}
          variant="outline" className="rounded-xl gap-2 border-slate-300 font-semibold shrink-0">
          {isExporting
            ? <div className="size-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            : <Download className="size-4" />}
          Export Excel
        </Button>
      </div>

      {/* Period filter */}
      <div className="flex items-center flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              period === key
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            {PERIOD_LABELS[key]}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-1">
            <Input type="date" value={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="h-8 rounded-lg text-xs w-36" />
            <span className="text-slate-400 text-xs">s/d</span>
            <Input type="date" value={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-8 rounded-lg text-xs w-36" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Pendapatan",  value: formatRupiah(kpi.totalRevenue), icon: DollarSign,  color: "text-orange-500" },
              { label: "Jumlah Transaksi",  value: kpi.totalOrders.toString(),     icon: FileText,    color: "text-blue-500"   },
              { label: "Rata-rata/Transaksi", value: formatRupiah(kpi.avgOrder),   icon: TrendingUp,  color: "text-green-500"  },
              { label: "Metode Terbanyak",  value: kpi.topMethod,                  icon: CreditCard,  color: "text-purple-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <p className="text-xl font-bold text-heading">{value}</p>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Pendapatan Harian</h2>
            <RevenueChart data={dailyRevenue} />
          </div>

          {/* Payment method + top products */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-2">Metode Pembayaran</h2>
              <PaymentMethodChart data={paymentMethods} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Top 5 Produk Terlaris</h2>
              <TopProductsChart data={topProducts} />
            </div>
          </div>

          {/* Transaction table */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">
              Riwayat Transaksi ({range.from} s/d {range.to})
            </h2>
            <TransactionTable data={transactions} />
          </div>
        </>
      )}
    </main>
  );
}
