"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";
import { formatDateFull } from "@/lib/utils/dateRange";

export type Transaction = {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string | null;
  status: string;
  cashier_name: string;
};

interface Props { data: Transaction[] }

const PAGE_SIZE = 20;

export default function TransactionTable({ data }: Props) {
  const [page, setPage] = useState(1);

  // Sort terbaru di atas (default)
  const sorted = [...data].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!data.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-400">
        Tidak ada transaksi pada periode ini.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Waktu</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Total</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Metode</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kasir</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t, idx) => (
                <tr key={t.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {formatDateFull(t.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                    {formatRupiah(t.total_amount)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className={
                      t.payment_method === "QRIS"
                        ? "bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold"
                        : "bg-orange-100 text-orange-700 border-orange-200 text-[10px] font-bold"
                    }>
                      {t.payment_method ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge className={
                      t.status === "PAID"
                        ? "bg-green-100 text-green-700 border-green-200 text-[10px] font-bold"
                        : t.status === "VOIDED"
                        ? "bg-red-100 text-red-600 border-red-200 text-[10px] font-bold"
                        : "bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold"
                    }>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs">{t.cashier_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} dari {sorted.length} transaksi
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 p-0 rounded-lg">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold text-slate-600">
              {page} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 p-0 rounded-lg">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
