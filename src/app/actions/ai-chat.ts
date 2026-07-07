"use server";

import { ai } from "@/lib/gemini";
import { getRole } from "@/lib/auth/getRole";
import { createClient } from "@/lib/supabase/server";

export async function chatWithCopilot(chatHistory: { role: "user" | "model"; text: string }[]) {
  try {
    // 1. Verifikasi bahwa hanya role 'owner' yang bisa mengakses
    const role = await getRole();
    if (role !== "owner") {
      return { error: "Unauthorized. Hanya owner yang dapat mengakses AI Copilot." };
    }

    const supabase = await createClient();

    // 2. Kueri data real-time untuk konteks
    // Omzet Hari Ini
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data: dailyOrders } = await supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "PAID")
      .gte("created_at", startOfDay.toISOString());

    const dailyRevenue = dailyOrders?.reduce((acc, order) => acc + order.total_amount, 0) || 0;

    // Stok Bahan Baku Kritis
    const { data: rawMaterials } = await supabase
      .from("raw_materials")
      .select("name, current_stock, min_stock_threshold, unit")
      .eq("is_active", true);

    const criticalStock = rawMaterials?.filter(m => m.current_stock <= m.min_stock_threshold) || [];

    // 5 Riwayat Transaksi Terakhir
    const { data: recentTransactions } = await supabase
      .from("orders")
      .select("order_number, total_amount, payment_method, status")
      .order("created_at", { ascending: false })
      .limit(5);

    // 3. Definisikan Strict System Instruction (Guardrails)
    const systemInstruction = `
Kamu adalah AI Business Insight Copilot untuk "Warmindo WP 2 POS".
Tugas utamamu adalah membantu pemilik (owner) dengan analisis penjualan, stok bahan baku, operasional menu, dan kondisi bisnis secara umum.

Berikut adalah data bisnis terkini (real-time) yang bisa kamu gunakan sebagai konteks:
- **Pendapatan Hari Ini:** Rp ${dailyRevenue.toLocaleString('id-ID')}
- **Stok Kritis (Perlu Restock):** ${
      criticalStock.length > 0 
        ? criticalStock.map(s => `${s.name} (${s.current_stock} ${s.unit}, batas minimum: ${s.min_stock_threshold})`).join(', ') 
        : 'Tidak ada stok kritis.'
    }
- **5 Transaksi Terakhir:** ${
      recentTransactions?.map(t => `#${t.order_number} (${t.status}) - Rp ${t.total_amount.toLocaleString('id-ID')} via ${t.payment_method}`).join(' | ') || 'Belum ada transaksi.'
    }

ATURAN KETAT (Strict Guardrails):
1. Kamu HANYA boleh menjawab pertanyaan terkait performa penjualan, analisis stok, operasional menu, dan bisnis Warmindo WP 2 POS.
2. Jika pengguna bertanya hal di luar topik tersebut (misalnya tentang coding, cuaca, politik, atau hal umum lainnya), kamu HARUS MENOLAK SECARA SOPAN dengan membalas persis seperti ini:
   "Maaf, sebagai asisten bisnis Warmindo, saya hanya dapat menjawab pertanyaan seputar performa penjualan dan operasional warung Anda."
3. Jawablah dengan profesional, ringkas, dan fokus pada data jika relevan.
`;

    // 4. Format pesan untuk API Google Gen AI
    const contents = chatHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.text }],
    }));

    // 5. Panggil API Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    return { 
      success: true, 
      text: response.text 
    };

  } catch (error: any) {
    console.error("AI Copilot Error:", error);
    return { error: "Terjadi kesalahan saat menghubungkan ke AI Copilot." };
  }
}
