"use server";

import { ai } from "@/lib/groq";
import { getRole } from "@/lib/auth/getRole";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";

// ── Helper: format date to WIB ISO string ──────────────────────
function getWIBDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function getWIBRange(offsetDaysStart: number, offsetDaysEnd = 0): { fromTs: string; toTs: string } {
  const now = new Date();
  
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - offsetDaysStart);
  
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() - offsetDaysEnd);
  
  const fromDateStr = getWIBDateString(startDate);
  const toDateStr = getWIBDateString(endDate);
  
  return {
    fromTs: `${fromDateStr}T00:00:00+07:00`,
    toTs: `${toDateStr}T23:59:59+07:00`
  };
}

function getWIBMonthRange(offsetMonth = 0): { fromTs: string; toTs: string } {
  const now = new Date();
  
  const wibStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const wibDate = new Date(wibStr);
  
  const targetYear = wibDate.getMonth() - offsetMonth < 0 ? wibDate.getFullYear() - 1 : wibDate.getFullYear();
  const targetMonth = wibDate.getMonth() - offsetMonth < 0 ? 12 + (wibDate.getMonth() - offsetMonth) : wibDate.getMonth() - offsetMonth;
  
  const fromDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-01`;
  
  let toDateStr: string;
  if (offsetMonth === 0) {
    toDateStr = getWIBDateString(now);
  } else {
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    toDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
  
  return {
    fromTs: `${fromDateStr}T00:00:00+07:00`,
    toTs: `${toDateStr}T23:59:59+07:00`
  };
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

    // Calculate exact ranges
    const todayRange = getWIBRange(0, 0);
    const last7Range = getWIBRange(6, 0);
    const thisMonthRange = getWIBMonthRange(0);
    const lastMonthRange = getWIBMonthRange(1);

    // ── 2. Ambil data real-time dari Supabase ──────────────────

    // Pendapatan hari ini
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", todayRange.fromTs)
      .lte("created_at", todayRange.toTs);

    const todayRevenue = todayOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const todayCount   = todayOrders?.length ?? 0;

    // Pendapatan 7 hari terakhir
    const { data: last7Orders } = await supabase
      .from("orders")
      .select("id, total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", last7Range.fromTs)
      .lte("created_at", last7Range.toTs);

    const last7Revenue = last7Orders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const last7Count   = last7Orders?.length ?? 0;
    const last7Avg     = last7Count > 0 ? Math.round(last7Revenue / last7Count) : 0;

    // Pendapatan bulan ini
    const { data: monthOrders } = await supabase
      .from("orders")
      .select("total_amount, payment_method, created_at")
      .eq("status", "PAID")
      .gte("created_at", thisMonthRange.fromTs)
      .lte("created_at", thisMonthRange.toTs);

    const monthRevenue = monthOrders?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
    const monthCount   = monthOrders?.length ?? 0;
    const monthAvg     = monthCount > 0 ? Math.round(monthRevenue / monthCount) : 0;

    // Pendapatan bulan lalu
    const { data: lastMonthOrders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "PAID")
      .gte("created_at", lastMonthRange.fromTs)
      .lte("created_at", lastMonthRange.toTs);

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
    let topProductsText = "Belum ada data mengenai produk terlaris untuk periode 7 hari terakhir.";
    
    if (orderIds7.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, quantity")
        .in("order_id", orderIds7);

      // Temporary Logging
      console.log("Date Range:", last7Range.fromTs, "s/d", last7Range.toTs);
      console.log("Top Product Query Result:", items);
      console.log("Rows:", items?.length ?? 0);

      const qtyMap: Record<string, number> = {};
      items?.forEach((item) => {
        qtyMap[item.product_name] = (qtyMap[item.product_name] ?? 0) + item.quantity;
      });

      const sortedProducts = Object.entries(qtyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedProducts.length > 0) {
        topProductsText = sortedProducts
          .map(([name, qty], i) => `${i + 1}. ${name} (${qty} penjualan)`)
          .join("\n");
      }
    } else {
      console.log("Date Range:", last7Range.fromTs, "s/d", last7Range.toTs);
      console.log("Top Product Query Result: No orders found");
      console.log("Rows: 0");
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

    // ── 4. Format chat history & panggil Groq ──────────────────
    // Pastikan dimulai dari user, lalu petakan role "model" -> "assistant"
    const filteredHistory = chatHistory.filter((msg, idx) => {
      // Selalu include user messages
      if (msg.role === "user") return true;
      // Include model messages hanya jika ada user message sebelumnya
      const prevUserIdx = chatHistory.slice(0, idx).findLastIndex((m) => m.role === "user");
      return prevUserIdx !== -1;
    });

    // Pastikan dimulai dari user
    const firstUserIdx = filteredHistory.findIndex((m) => m.role === "user");
    const conversation = (firstUserIdx >= 0 ? filteredHistory.slice(firstUserIdx) : filteredHistory)
      .map((msg) => ({
        role: msg.role === "model" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      }));

    if (conversation.length === 0) {
      return { error: "Tidak ada pesan yang valid untuk diproses." };
    }

    const response = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemInstruction },
        ...conversation,
      ],
      max_tokens: 1024,
      temperature: 0.3,
    });

    return {
      success: true,
      text: response.choices[0]?.message?.content ?? "",
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
