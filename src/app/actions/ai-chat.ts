"use server";

import { ai } from "@/lib/gemini";
import { getRole } from "@/lib/auth/getRole";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";

// ── Helper: format date to WIB ISO string ──────────────────────
function toWIB(date: Date): string {
  return date.toISOString();
}

function startOf(unit: "day" | "week" | "month", offsetDays = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (unit === "week") {
    const day = d.getDay();
    d.setDate(d.getDate() - day); // Sunday start
  } else if (unit === "month") {
    d.setDate(1);
  }
  if (offsetDays) d.setDate(d.getDate() - offsetDays);
  return toWIB(d);
}

export async function chatWithCopilot(
  chatHistory: { role: "user" | "model"; text: string }[]
) {
  try {
    // 1. Auth: owner atau admin
    const role = await getRole();
    if (role !== "owner" && role !== "admin") {
      return { error: "Unauthorized. Hanya owner/admin yang dapat mengakses AI Copilot." };
    }

    const supabase = await createClient();
    const now = new Date();

    // ── 2. Ambil data real-time dari Supabase ──────────────────

    // Pendapatan hari ini
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", startOf("day"));

    const todayRevenue = todayOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const todayCount   = todayOrders?.length ?? 0;

    // Pendapatan 7 hari terakhir
    const { data: last7Orders } = await supabase
      .from("orders")
      .select("total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", startOf("day", 6));

    const last7Revenue = last7Orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const last7Count   = last7Orders?.length ?? 0;
    const last7Avg     = last7Count > 0 ? Math.round(last7Revenue / last7Count) : 0;

    // Pendapatan bulan ini
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", startOf("month"));

    const monthRevenue = monthOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const monthCount   = monthOrders?.length ?? 0;
    const monthAvg     = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0;

    // Pendapatan bulan lalu
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: lastMonthOrders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "PAID")
      .gte("created_at", toWIB(lastMonthStart))
      .lt("created_at", toWIB(thisMonthStart));

    const lastMonthRevenue = lastMonthOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const lastMonthCount   = lastMonthOrders?.length ?? 0;
    const lastMonthAvg     = lastMonthCount > 0 ? Math.round(lastMonthRevenue / lastMonthCount) : 0;

    // Metode pembayaran (7 hari)
    const paymentMethodMap: Record<string, number> = {};
    last7Orders?.forEach((o) => {
      const m = o.payment_method ?? "UNKNOWN";
      paymentMethodMap[m] = (paymentMethodMap[m] ?? 0) + 1;
    });
    const topPaymentMethod = Object.entries(paymentMethodMap)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m}: ${c} transaksi`)
      .join(", ") || "Belum ada data";

    // Produk terlaris (7 hari) — join order_items
    const orderIds7 = last7Orders?.map((o: any) => o.id).filter(Boolean) ?? [];
    let topProductsText = "Belum ada data";
    if (orderIds7.length > 0) {
      // Ambil order IDs yang valid dari orders 7 hari
      const { data: recentOrdersWithId } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "PAID")
        .gte("created_at", startOf("day", 6));

      const validIds = recentOrdersWithId?.map((o) => o.id) ?? [];

      if (validIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity")
          .in("order_id", validIds);

        const qtyMap: Record<string, number> = {};
        items?.forEach((item) => {
          qtyMap[item.product_name] = (qtyMap[item.product_name] ?? 0) + item.quantity;
        });

        topProductsText = Object.entries(qtyMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, qty], i) => `${i + 1}. ${name} (${qty} terjual)`)
          .join("\n") || "Belum ada data";
      }
    }

    // Jam transaksi paling ramai (hari ini)
    const hourMap: Record<number, number> = {};
    todayOrders?.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      hourMap[hour] = (hourMap[hour] ?? 0) + 1;
    });
    const busiestHourEntry = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
    const busiestHour = busiestHourEntry
      ? `${busiestHourEntry[0]}:00–${parseInt(busiestHourEntry[0]) + 1}:00 (${busiestHourEntry[1]} transaksi)`
      : "Belum ada data";

    // Stok bahan baku kritis
    const { data: rawMaterials } = await supabase
      .from("raw_materials")
      .select("name, current_stock, min_stock_threshold, unit")
      .eq("is_active", true)
      .order("current_stock", { ascending: true });

    const criticalStock = rawMaterials?.filter((m) => m.current_stock <= m.min_stock_threshold) ?? [];
    const criticalText = criticalStock.length > 0
      ? criticalStock.map((s) => `${s.name}: ${s.current_stock}/${s.min_stock_threshold} ${s.unit}`).join(", ")
      : "Semua stok dalam kondisi aman ✓";

    const lowestStockText = rawMaterials?.slice(0, 5).map((s) => `${s.name}: ${s.current_stock} ${s.unit}`).join(", ") ?? "Belum ada data bahan baku";

    // Shift aktif
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("opened_at, modal_awal, total_cash_sales, total_qris_sales")
      .eq("status", "OPEN")
      .maybeSingle();

    const shiftInfo = activeShift
      ? `Shift sedang berjalan sejak ${new Date(activeShift.opened_at).toLocaleTimeString("id-ID")}. Penjualan tunai: ${formatRupiah(activeShift.total_cash_sales)}, QRIS: ${formatRupiah(activeShift.total_qris_sales)}.`
      : "Tidak ada shift yang sedang berjalan saat ini.";

    // Tanggal & waktu sekarang
    const nowStr = now.toLocaleString("id-ID", {
      weekday: "long", year: "numeric", month: "long",
      day: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    // ── 3. System prompt dengan data aktual ───────────────────
    const systemInstruction = `
Kamu adalah WP2 AI Business Insight Copilot, asisten analitik bisnis untuk "Warmindo WP 2 POS".
Tugas utama: membantu owner/admin dengan analisis penjualan, stok, dan operasional berdasarkan DATA REAL-TIME berikut.

📅 Waktu Sekarang: ${nowStr}

📊 DATA BISNIS REAL-TIME:

─── PENDAPATAN ───
• Hari ini: ${formatRupiah(todayRevenue)} dari ${todayCount} transaksi
• 7 hari terakhir: ${formatRupiah(last7Revenue)} dari ${last7Count} transaksi (rata-rata ${formatRupiah(last7Avg)}/transaksi)
• Bulan ini: ${formatRupiah(monthRevenue)} dari ${monthCount} transaksi (rata-rata ${formatRupiah(monthAvg)}/transaksi)
• Bulan lalu: ${formatRupiah(lastMonthRevenue)} dari ${lastMonthCount} transaksi (rata-rata ${formatRupiah(lastMonthAvg)}/transaksi)

─── METODE PEMBAYARAN (7 hari) ───
${topPaymentMethod}

─── PRODUK TERLARIS (7 hari) ───
${topProductsText}

─── JAM TERSIBUK (hari ini) ───
${busiestHour}

─── STOK BAHAN BAKU KRITIS ───
${criticalText}

─── 5 STOK BAHAN BAKU TERENDAH SAAT INI ───
${lowestStockText}

─── STATUS SHIFT ───
${shiftInfo}

INSTRUKSI:
1. Jawab HANYA pertanyaan seputar penjualan, stok, produk, shift, dan operasional Warmindo WP 2.
2. Jika ditanya di luar topik bisnis ini, tolak dengan sopan:
   "Maaf, saya hanya dapat membantu seputar performa penjualan dan operasional Warmindo WP 2."
3. Gunakan data di atas sebagai referensi utama. Jawab dengan ringkas, akurat, dan gunakan format Rupiah (Rp X.XXX) yang benar.
4. Jika data tidak tersedia untuk periode tertentu, sampaikan dengan jelas.
5. Bahasa: Indonesia. Nada: profesional tapi ramah.
`;

    // ── 4. Format chat history & panggil Gemini ────────────────
    // Gemini API mensyaratkan: pertama harus "user", alternating user/model
    // Filter: hapus pesan "model" di awal, pastikan dimulai dari "user"
    const filteredHistory = chatHistory.filter((msg, idx) => {
      // Selalu include user messages
      if (msg.role === "user") return true;
      // Include model messages hanya jika ada user message sebelumnya
      const prevUserIdx = chatHistory.slice(0, idx).findLastIndex((m) => m.role === "user");
      return prevUserIdx !== -1;
    });

    // Pastikan dimulai dari user
    const firstUserIdx = filteredHistory.findIndex((m) => m.role === "user");
    const contents = (firstUserIdx >= 0 ? filteredHistory.slice(firstUserIdx) : filteredHistory)
      .map((msg) => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      }));

    if (contents.length === 0) {
      return { error: "Tidak ada pesan yang valid untuk diproses." };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
          maxOutputTokens: 1024,
        temperature: 0.3,
      },
    });

    return {
      success: true,
      text: response.text,
    };

  } catch (error: any) {
    console.error("[AI Copilot] Error:", error?.message ?? error);
    console.error("[AI Copilot] Error status:", error?.status);
    console.error("[AI Copilot] Error details:", JSON.stringify(error, null, 2));

    if (error?.status === 429) {
      return { error: "Batas penggunaan AI tercapai. Silakan tunggu beberapa saat lalu coba lagi." };
    }
    return { error: "Terjadi kesalahan saat menghubungi AI Copilot. Silakan coba lagi." };
  }
}
