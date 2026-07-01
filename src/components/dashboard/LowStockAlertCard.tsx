import React from "react";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "@/lib/icons";

export default async function LowStockAlertCard() {
  const supabase = await createClient();

  // Query bahan baku yang stoknya di bawah atau sama dengan threshold
  const { data: materials, error } = await supabase
    .from("raw_materials")
    .select("name, current_stock, min_stock_threshold, unit")
    .eq("is_active", true);

  if (error) {
    console.error("[LowStockAlertCard] Gagal memuat data stok bahan baku:", error);
  }

  // Filter bahan baku dengan stok rendah secara manual (untuk fleksibilitas tipe data)
  const lowStockMaterials = materials
    ? materials.filter((m) => m.current_stock <= (m.min_stock_threshold || 0))
    : [];

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Peringatan Stok Rendah
          </h3>
          <p className="text-xs text-slate-400 font-medium">
            Bahan baku di bawah batas aman
          </p>
        </div>
        {lowStockMaterials.length > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      {lowStockMaterials.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-emerald-100 bg-emerald-50/20 text-center">
          <span className="text-2xl mb-1">✓</span>
          <p className="text-xs font-semibold text-emerald-600">
            Semua stok dalam kondisi baik
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
          {lowStockMaterials.map((material) => {
            const isZero = material.current_stock === 0;
            return (
              <div
                key={material.name}
                className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0"
              >
                <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                  {material.name}
                </span>

                <div className="text-right">
                  <span
                    className={`text-sm font-bold ${
                      isZero ? "text-red-500" : "text-amber-500"
                    }`}
                  >
                    {material.current_stock}
                  </span>
                  <span className="text-xs text-slate-400 font-medium ml-1">
                    /{material.min_stock_threshold} {material.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
