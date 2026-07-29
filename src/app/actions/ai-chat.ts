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
      .select("id, total_amount, payment_method, created_at, shift_id")
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

    // Shift aktif — query dengan auth user untuk memastikan RLS pass
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

    const { data: activeShift, error: shiftError } = await supabase
      .from("shifts")
      .select("id, opened_at, modal_awal, total_cash_sales, total_qris_sales, opened_by")
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shiftError) {
      console.error("[AI Copilot] Shift query error:", shiftError);
    }

    // Query order langsung berdasarkan shift_id (tidak terbatas hari ini)
    let activeShiftOrders: any[] = [];
    if (activeShift) {
      const { data: shiftOrds } = await supabase
        .from("orders")
        .select("id, total_amount, payment_method")
        .eq("shift_id", activeShift.id)
        .eq("status", "PAID");
      activeShiftOrders = shiftOrds ?? [];
    }

    // Shift terakhir yang ditutup (fallback jika tidak ada shift aktif)
    let lastClosedShift: any = null;
    let lastClosedShiftOrders: any[] = [];
    if (!activeShift) {
      const { data: closedShift } = await supabase
        .from("shifts")
        .select("id, opened_at, closed_at, modal_awal, total_cash_sales, total_qris_sales, cash_counted, cash_variance, expected_cash")
        .eq("status", "CLOSED")
        .order("closed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closedShift) {
        lastClosedShift = closedShift;
        // Ambil order dalam shift terakhir untuk produk terlaris & metode bayar
        const { data: shiftOrders } = await supabase
          .from("orders")
          .select("id, total_amount, payment_method")
          .eq("shift_id", closedShift.id)
          .eq("status", "PAID");
        lastClosedShiftOrders = shiftOrders ?? [];
      }
    }

    // Produk terlaris shift aktif atau shift terakhir
    const shiftOrderIds = activeShift
      ? [] // untuk shift aktif, kita ambil dari orders hari ini yang sudah di-query
      : lastClosedShiftOrders.map((o) => o.id);

    let shiftTopProductsText = "Belum ada transaksi";
    const shiftOrderIdsToQuery = activeShift
      ? activeShiftOrders.map((o) => o.id)
      : shiftOrderIds;

    if (shiftOrderIdsToQuery.length > 0) {
      const { data: shiftItems } = await supabase
        .from("order_items")
        .select("product_name, quantity")
        .in("order_id", shiftOrderIdsToQuery);

      const shiftQtyMap: Record<string, number> = {};
      shiftItems?.forEach((item) => {
        shiftQtyMap[item.product_name] = (shiftQtyMap[item.product_name] ?? 0) + item.quantity;
      });
      const shiftTopProds = Object.entries(shiftQtyMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (shiftTopProds.length > 0) {
        shiftTopProductsText = shiftTopProds.map(([n, q], i) => `${i + 1}. ${n} (${q})`).join(", ");
      }
    }

    // Metode pembayaran shift aktif atau shift terakhir
    const shiftPaymentOrders = activeShift ? activeShiftOrders : lastClosedShiftOrders;
    const shiftPayMap: Record<string, number> = {};
    (shiftPaymentOrders as any[]).forEach((o) => {
      const m = o.payment_method ?? "UNKNOWN";
      shiftPayMap[m] = (shiftPayMap[m] ?? 0) + 1;
    });
    const shiftPaymentText = Object.entries(shiftPayMap)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m}: ${c} transaksi`)
      .join(", ") || "Belum ada data";

    // ── Build shift context string ─────────────────────────────
    let shiftContext: string;

    if (activeShift) {
      const shiftSales = (activeShift.total_cash_sales ?? 0) + (activeShift.total_qris_sales ?? 0);
      const shiftOrderCount = activeShiftOrders.length;
      const shiftAvg = shiftOrderCount > 0 ? Math.round(shiftSales / shiftOrderCount) : 0;

      shiftContext = `
STATUS SHIFT: AKTIF (sedang berjalan)
Dibuka: ${new Date(activeShift.opened_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
Modal Awal: ${formatRupiah(activeShift.modal_awal)} (cash float/saldo kas awal untuk kembalian)
Total Pendapatan Shift: ${formatRupiah(shiftSales)} (Tunai: ${formatRupiah(activeShift.total_cash_sales)}, QRIS: ${formatRupiah(activeShift.total_qris_sales)})
Jumlah Transaksi: ${shiftOrderCount}
Rata-rata Transaksi: ${formatRupiah(shiftAvg)}
Produk Terlaris Shift: ${shiftTopProductsText}
Metode Pembayaran Shift: ${shiftPaymentText}`;
    } else if (lastClosedShift) {
      const closedSales = (lastClosedShift.total_cash_sales ?? 0) + (lastClosedShift.total_qris_sales ?? 0);
      const closedCount = lastClosedShiftOrders.length;
      const closedAvg = closedCount > 0 ? Math.round(closedSales / closedCount) : 0;

      shiftContext = `
STATUS SHIFT: TIDAK ADA SHIFT AKTIF
Shift Terakhir Ditutup:
  Dibuka: ${new Date(lastClosedShift.opened_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
  Ditutup: ${new Date(lastClosedShift.closed_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
  Modal Awal: ${formatRupiah(lastClosedShift.modal_awal)} (cash float untuk kembalian)
  Total Pendapatan: ${formatRupiah(closedSales)} (Tunai: ${formatRupiah(lastClosedShift.total_cash_sales)}, QRIS: ${formatRupiah(lastClosedShift.total_qris_sales)})
  Jumlah Transaksi: ${closedCount}
  Rata-rata Transaksi: ${formatRupiah(closedAvg)}
  Produk Terlaris: ${shiftTopProductsText}
  Metode Pembayaran: ${shiftPaymentText}
  Kas Dihitung: ${lastClosedShift.cash_counted ? formatRupiah(lastClosedShift.cash_counted) : "Tidak tersedia"}
  Selisih Kas: ${lastClosedShift.cash_variance !== null ? formatRupiah(lastClosedShift.cash_variance) : "Tidak tersedia"}`;
    } else {
      shiftContext = `STATUS SHIFT: Tidak ada data shift sama sekali. Belum ada data yang dapat dianalisis.`;
    }

    // Tanggal & waktu sekarang
    const nowStr = now.toLocaleString("id-ID", {
      weekday: "long", year: "numeric", month: "long",
      day: "numeric", hour: "2-digit", minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });

    // ── 3. System prompt dengan data aktual ───────────────────
    const systemInstruction = `
Anda adalah AI Assistant Sistem POS Warmindo WP 2.
Jawab berdasarkan data yang diberikan. Jangan mengarang angka yang tidak ada di data.
Anda BOLEH membuat prediksi dan analisis tren berdasarkan data penjualan yang tersedia (misalnya rata-rata 7 hari untuk memperkirakan pendapatan besok).

Waktu Sekarang: ${nowStr}

═══════════════════════════════════════
DATA SHIFT (PRIORITAS UTAMA)
═══════════════════════════════════════
${shiftContext}

═══════════════════════════════════════
DATA PENJUALAN UMUM
═══════════════════════════════════════
Hari Ini: ${formatRupiah(todayRevenue)} dari ${todayCount} transaksi
7 Hari Terakhir: ${formatRupiah(last7Revenue)} dari ${last7Count} transaksi (avg ${formatRupiah(last7Avg)})
Bulan Ini: ${formatRupiah(monthRevenue)} dari ${monthCount} transaksi (avg ${formatRupiah(monthAvg)})
Bulan Lalu: ${formatRupiah(lastMonthRevenue)} dari ${lastMonthCount} transaksi (avg ${formatRupiah(lastMonthAvg)})
Metode Pembayaran (7 hari): ${topPaymentMethod}
Produk Terlaris (7 hari): ${topProductsText}
Jam Tersibuk Hari Ini: ${busiestHour}

═══════════════════════════════════════
STOK BAHAN BAKU
═══════════════════════════════════════
Stok Kritis: ${criticalText}
5 Stok Terendah: ${lowestStockText}

═══════════════════════════════════════
ATURAN WAJIB
═══════════════════════════════════════
1. Modal awal adalah cash float (saldo kas awal untuk menyediakan kembalian). BUKAN biaya, BUKAN pengurang pendapatan.
2. "Profit" dan "analisis profit" berarti analisis pendapatan (omzet) berdasarkan data shift dan penjualan. Jawab langsung dengan data yang tersedia tanpa disclaimer apapun.
3. Jika shift AKTIF: berikan analisis pendapatan shift yang sedang berjalan (total pendapatan, jumlah transaksi, rata-rata transaksi, produk terlaris, metode pembayaran).
4. Jika shift DITUTUP: berikan ringkasan akhir shift terakhir (total pendapatan, jumlah transaksi, rata-rata transaksi, produk terlaris, metode pembayaran, selisih kas).
5. Jika tidak ada data shift → jawab "Belum ada data yang dapat dianalisis".
6. Fokus pada: pendapatan (omzet), jumlah transaksi, rata-rata transaksi, produk terlaris, metode pembayaran, stok bahan baku, operasional shift, prediksi/tren penjualan, dan saran operasional.
7. Jawab HANYA tentang penjualan, stok, produk, shift, dan operasional Warmindo WP 2.
8. Jika ditanya di luar topik, tolak sopan: "Maaf, saya hanya dapat membantu seputar operasional Warmindo WP 2."

FORMAT JAWABAN:
- Shift Aktif → gunakan format: Analisis Penjualan (Sementara)
- Shift Ditutup → gunakan format: Ringkasan Akhir Shift
- Bahasa Indonesia, profesional dan ringkas.
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

    const replyText = response.choices[0]?.message?.content?.trim() ?? "";

    // Groq sesekali mengembalikan konten kosong untuk prompt singkat/ambigu.
    // Jangan kirim string kosong sebagai "sukses" — beri fallback yang jelas.
    if (!replyText) {
      return {
        success: true,
        text: "Maaf, saya belum bisa menyusun jawaban untuk permintaan itu. Coba perjelas pertanyaannya, misalnya \"Prediksi pendapatan besok berdasarkan tren 7 hari terakhir\".",
      };
    }

    return {
      success: true,
      text: replyText,
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
