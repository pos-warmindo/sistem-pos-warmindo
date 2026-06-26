import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export default async function TopModifiersCard() {
  const supabase = await createClient();

  // Query order item modifiers yang memiliki status order PAID
  const { data: modifierItems, error } = await supabase
    .from("order_item_modifiers")
    .select(`
      modifier_name_snapshot,
      order_items!inner(
        orders!inner(status)
      )
    `)
    .eq("order_items.orders.status", "PAID");

  if (error) {
    console.error("[TopModifiersCard] Gagal memuat data modifikator terlaris:", error);
  }

  // Agregasi jumlah pemakaian per modifikator
  const modifierCounts: Record<string, number> = {};

  if (modifierItems) {
    modifierItems.forEach((item: any) => {
      const name = item.modifier_name_snapshot;
      modifierCounts[name] = (modifierCounts[name] || 0) + 1;
    });
  }

  // Urutkan dan ambil 5 modifikator teratas
  const topModifiers = Object.entries(modifierCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          Modifikator Terlaris
        </h3>
        <p className="text-xs text-slate-400 font-medium">
          Top 5 topping & level pedas paling populer
        </p>
      </div>

      {topModifiers.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-100 bg-slate-50/50">
          <p className="text-xs font-medium text-slate-400">
            Belum ada modifikator yang digunakan
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {topModifiers.map((modifier, index) => {
            const rank = index + 1;
            return (
              <div
                key={modifier.name}
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
                    {modifier.name}
                  </span>
                </div>

                <Badge variant="secondary" className="font-semibold text-xs px-2 py-0.5">
                  {modifier.count} kali
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
