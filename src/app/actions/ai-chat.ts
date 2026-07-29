"use server";

import { ai } from "@/lib/groq";
import { getRole } from "@/lib/auth/getRole";
import { createClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";

// Mengubah objek Date menjadi string tanggal format YYYY-MM-DD dalam zona waktu WIB
function getWIBDateString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

// Menghitung rentang waktu dari N hari lalu hingga M hari lalu dalam WIB,
// menghasilkan timestamp ISO dengan offset +07:00 untuk filter query Supabase
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

// Menghitung rentang waktu satu bulan penuh dalam WIB.
// offsetMonth=0 berarti bulan ini (sampai hari ini), offsetMonth=1 berarti bulan lalu (tanggal 1 s.d. akhir bulan).
// Penanganan lintas tahun dilakukan dengan memeriksa apakah hasil pengurangan bulan bernilai negatif.
function getWIBMonthRange(offsetMonth = 0): { fromTs: string; toTs: string } {
  const now = new Date();
  
  const wibStr = now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const wibDate = new Date(wibStr);
  
  const targetYear = wibDate.getMonth() - offsetMonth < 0 ? wibDate.getFullYear() - 1 : wibDate.getFullYear();
  const targetMonth = wibDate.getMonth() - offsetMonth < 0 ? 12 + (wibDate.getMonth() - offsetMonth) : wibDate.getMonth() - offsetMonth;
  
  const fromDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-01`;
  
  let toDateStr: string;
  if (offsetMonth === 0) {
    // Bulan berjalan: batas atas adalah hari ini
    toDateStr = getWIBDateString(now);
  } else {
    // Bulan sebelumnya: hitung hari terakhir bulan tersebut
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

    // Menghitung frekuensi setiap metode pembayaran hari ini, lalu diurutkan dari yang terbanyak
    const todayPaymentMap: Record<string, number> = {};
    todayOrders?.forEach((o) => {
      const m = o.payment_method ?? "UNKNOWN";
      todayPaymentMap[m] = (todayPaymentMap[m] ?? 0) + 1;
    });
    const todayPaymentMethod = Object.entries(todayPaymentMap)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m}: ${c} transaksi`)
      .join(", ") || "Belum ada transaksi hari ini";

    // Produk terlaris hari ini — join order_items
    const todayOrderIds = todayOrders?.map((o: any) => o.id).filter(Boolean) ?? [];
    let todayTopProductsText = "Belum ada transaksi hari ini.";

    if (todayOrderIds.length > 0) {
      const { data: todayItems } = await supabase
        .from("order_items")
        .select("product_name, quantity")
        .in("order_id", todayOrderIds);

      const todayQtyMap: Record<string, number> = {};
      todayItems?.forEach((item) => {
        todayQtyMap[item.product_name] = (todayQtyMap[item.product_name] ?? 0) + item.quantity;
      });

      const sortedTodayProducts = Object.entries(todayQtyMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedTodayProducts.length > 0) {
        todayTopProductsText = sortedTodayProducts
          .map(([name, qty], i) => `${i + 1}. ${name} (${qty} penjualan)`)
          .join(", ");
      }
    }

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
    }

    // Mengelompokkan transaksi hari ini berdasarkan jam untuk menemukan jam paling ramai
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

    // Menyiapkan peta pendapatan harian 7 hari terakhir.
    // Diinisialisasi dengan nilai 0 terlebih dahulu agar hari tanpa transaksi tetap muncul sebagai Rp 0,
    // bukan hilang dari data — penting untuk analisis tren yang akurat.
    const dailyRevenueMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = getWIBDateString(d);
      dailyRevenueMap[dateKey] = 0;
    }
    last7Orders?.forEach((o) => {
      const dateKey = getWIBDateString(new Date(o.created_at));
      if (dailyRevenueMap[dateKey] !== undefined) {
        dailyRevenueMap[dateKey] += o.total_amount;
      }
    });

    const dailyRevenueDetails = Object.entries(dailyRevenueMap)
      .map(([date, amount]) => `${date}: ${formatRupiah(amount)}`)
      .join(", ");

    // totalDaysWithData dipakai AI untuk mendeteksi apakah data cukup untuk analisis tren
    const totalDaysWithData = Object.values(dailyRevenueMap).filter(val => val > 0).length;
    // Rata-rata selalu dibagi 7 (bukan hanya hari yang ada data) agar konsisten sebagai rata-rata harian
    const avgDailyRevenue = Math.round(last7Revenue / 7);

    // ── 3. System prompt dengan data aktual ───────────────────
    const systemInstruction = `
Anda adalah AI Assistant Sistem POS Warmindo WP 2.
Jawab berdasarkan data yang diberikan. Jangan mengarang angka yang tidak ada di data.

Waktu Sekarang: ${nowStr}

═══════════════════════════════════════
DATA SHIFT (PRIORITAS UTAMA)
═══════════════════════════════════════
${shiftContext}

═══════════════════════════════════════
DATA PENJUALAN UMUM
═══════════════════════════════════════
Hari Ini: ${formatRupiah(todayRevenue)} dari ${todayCount} transaksi
Metode Pembayaran Hari Ini: ${todayPaymentMethod}
Produk Terlaris Hari Ini: ${todayTopProductsText}
Jam Tersibuk Hari Ini: ${busiestHour}

7 Hari Terakhir: ${formatRupiah(last7Revenue)} dari ${last7Count} transaksi
Rincian Pendapatan Harian (7 Hari Terakhir): ${dailyRevenueDetails}
Rata-rata Pendapatan HARIAN (Total 7 Hari ÷ 7 Hari): ${formatRupiah(avgDailyRevenue)} per hari
Metode Pembayaran (7 hari): ${topPaymentMethod}
Produk Terlaris (7 hari): ${topProductsText}

Bulan Ini: ${formatRupiah(monthRevenue)} dari ${monthCount} transaksi
Bulan Lalu: ${formatRupiah(lastMonthRevenue)} dari ${lastMonthCount} transaksi

═══════════════════════════════════════
STOK BAHAN BAKU
═══════════════════════════════════════
Stok Kritis: ${criticalText}
5 Stok Terendah: ${lowestStockText}

═══════════════════════════════════════
ATURAN WAJIB UNTUK PREDIKSI PENDAPATAN BESOK
═══════════════════════════════════════
Saat pengguna meminta prediksi pendapatan besok:
1. Analisis tren dari data rincian pendapatan harian 7 hari terakhir (${dailyRevenueDetails}):
   - Naik: jika penjualan harian cenderung terus meningkat dari hari ke hari.
   - Turun: jika penjualan harian cenderung terus menurun dari hari ke hari.
   - Stabil / Belum Jelas / Data Terbatas: jika penjualan harian naik-turun berubah-ubah tanpa arah pasti, bernilai sama, atau data belum mencukupi.
2. Penentuan Nilai Prediksi:
   - Jika tren NAIK atau TURUN: sesuaikan angka prediksi dari pendapatan harian terakhir sesuai arah tren.
   - Jika tren STABIL, BELUM JELAS, atau DATA TERBATAS: gunakan angka Rata-rata Pendapatan HARIAN (${formatRupiah(avgDailyRevenue)}).
3. BAHASA DAN KATA-KATA DALAM ALASAN (SANGAT IMPORTANT):
   - DILARANG menggunakan kata "fluktuatif", "volatilitas", atau istilah teknis/rumit lainnya! Gunakan kalimat yang sangat sederhana, jelas, dan mudah dipahami oleh pemilik warung/kasir.
   - Contoh alasan jika tren tidak jelas/stabil: "Prediksi didasarkan pada rata-rata harian 7 hari terakhir karena tren penjualan harian masih berubah-ubah dan belum menunjukkan kenaikan atau penurunan yang konsisten."
   - Contoh alasan jika data sedikit/kosong: "Prediksi menggunakan rata-rata pendapatan harian 7 hari terakhir karena data penjualan harian belum cukup untuk menentukan pola tren."
   - Contoh alasan jika tren naik: "Prediksi disesuaikan meningkat mengikuti tren kenaikan penjualan harian selama 7 hari terakhir."
4. DILARANG KERAS:
   - DILARANG menggunakan rata-rata per transaksi (total pendapatan ÷ jumlah transaksi) sebagai prediksi pendapatan harian!
   - DILARANG membuat data atau asumsi di luar data harian yang tersedia.
5. FORMAT OUTPUT WAJIB (Gunakan persis format berikut jika ditanya prediksi pendapatan besok):
   Prediksi pendapatan besok: Rp {nominal}
   Alasan: {maksimal 2 kalimat dengan bahasa yang sangat sederhana dan jelas}

═══════════════════════════════════════
ATURAN WAJIB LAINNYA
═══════════════════════════════════════
1. Modal awal adalah cash float (saldo kas awal untuk menyediakan kembalian). BUKAN biaya, BUKAN pengurang pendapatan.
2. "Profit", "keuntungan", dan "analisis profit" berarti analisis total pendapatan (omzet) berdasarkan data penjualan aktual. Jawab langsung menggunakan data Penjualan Hari Ini (${formatRupiah(todayRevenue)}) dan/atau data shift. Jangan pernah menjawab Rp 0 jika ada data Penjualan Hari Ini atau Penjualan 7 Hari Terakhir!
3. Saat memberikan Analisis Profit atau Ringkasan Penjualan Hari Ini, WAJIB sebutkan:
   - Total pendapatan hari ini (${formatRupiah(todayRevenue)}) & jumlah transaksi.
   - Produk Terlaris Hari Ini (${topProductsText}).
   - Metode Pembayaran Hari Ini (${todayPaymentMethod}).
   - Status Shift & Waktu Buka Shift dalam WIB.
4. Jika ditanya tentang shift atau analisis profit:
   - Selalu sebutkan status shift (AKTIF atau DITUTUP).
   - Selalu cantumkan waktu buka shift (dan tutup shift jika sudah ditutup) dalam format waktu WIB (misal: "Shift aktif sejak pukul 08.30 WIB" atau "Shift terakhir dibuka tanggal DD MMMM YYYY pukul HH.MM WIB").
   - Jika pendapatan shift beda dari pendapatan hari ini, jelaskan secara transparan (contoh: "Pendapatan hari ini total Rp X, dengan rincian shift aktif yang dibuka jam HH:MM WIB sebesar Rp Y").
6. Fokus pada: pendapatan (omzet), jumlah transaksi, rata-rata transaksi, produk terlaris, metode pembayaran, stok bahan baku, operasional shift, prediksi/tren penjualan, dan saran operasional.
7. Jawab HANYA tentang penjualan, stok, produk, shift, dan operasional Warmindo WP 2.
8. Jika ditanya di luar topik, tolak sopan: "Maaf, saya hanya dapat membantu seputar operasional Warmindo WP 2."
`;

    // ── 4. Format chat history & panggil Groq ──────────────────
    // Groq API mengharuskan percakapan dimulai dari pesan "user".
    // Filter ini membuang pesan "model" di awal (yang tidak punya konteks user sebelumnya),
    // lalu memetakan role "model" -> "assistant" sesuai format API Groq.
    const filteredHistory = chatHistory.filter((msg, idx) => {
      if (msg.role === "user") return true;
      // Pesan model hanya valid jika sudah ada pesan user sebelumnya
      const prevUserIdx = chatHistory.slice(0, idx).findLastIndex((m) => m.role === "user");
      return prevUserIdx !== -1;
    });

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

    // Groq terkadang mengembalikan konten kosong untuk prompt yang terlalu singkat atau ambigu.
    // Daripada mengirim string kosong yang terlihat seperti sukses, kembalikan pesan fallback
    // agar pengguna tahu perlu memperjelas pertanyaannya.
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
