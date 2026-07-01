import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function TopProductsCard() {
  const supabase = await createClient();

  // Query order items yang memiliki status order PAID
  const { data: orderItems, error } = await supabase
    .from("order_items")
    .select(`
      product_name,
      quantity,
      orders!inner(status)
    `)
    .eq("orders.status", "PAID");

  if (error) {
    console.error("[TopProductsCard] Gagal memuat data produk terlaris:", error);
  }

  // Agregasi jumlah terjual per produk
  const productSales: Record<string, number> = {};

  if (orderItems) {
    orderItems.forEach((item: any) => {
      const name = item.product_name;
      const qty = item.quantity || 0;
      productSales[name] = (productSales[name] || 0) + qty;
    });
  }

  // Urutkan dan ambil 5 produk teratas
  const topProducts = Object.entries(productSales)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Produk Terlaris
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          Top 5 berdasarkan volume penjualan
        </p>
      </div>

      {topProducts.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-100 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-400">
            Belum ada data penjualan
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {topProducts.map((product, index) => {
            const rank = index + 1;
            return (
              <div
                key={product.name}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Rank Number */}
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      rank === 1
                        ? "bg-orange-100 text-orange-600"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="text-sm font-medium text-slate-700 truncate">
                    {product.name}
                  </span>
                </div>

                <Badge variant="secondary" className="font-semibold text-xs px-2 py-0.5">
                  {product.quantity} porsi
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
