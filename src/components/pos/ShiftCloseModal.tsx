"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Banknote, AlertTriangle, CheckCircle } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";
import { Shift } from "@/lib/hooks/useShift";

interface ShiftCloseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeShift: Shift;
  onCloseShift: (cashCounted: number, notes: string | null) => Promise<any>;
}

export default function ShiftCloseModal({
  isOpen,
  onOpenChange,
  activeShift,
  onCloseShift,
}: ShiftCloseModalProps) {
  const [cashCountedStr, setCashCountedStr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract variables
  const modalAwal = Number(activeShift.modal_awal);
  const totalCashSales = Number(activeShift.total_cash_sales);
  const totalQrisSales = Number(activeShift.total_qris_sales);
  const expectedCash = modalAwal + totalCashSales;

  // Calculate live variance
  const cashCounted = cashCountedStr !== "" ? parseFloat(cashCountedStr) : 0;
  const variance = cashCounted - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashCountedStr === "" || isNaN(cashCounted)) {
      setError("Silakan masukkan jumlah kas fisik.");
      return;
    }
    if (cashCounted < 0) {
      setError("Jumlah kas fisik tidak boleh negatif.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCloseShift(cashCounted, notes.trim() || null);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Gagal menutup shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading text-xl font-bold">
            <Banknote className="size-6 text-primary" />
            Tutup Shift Aktif
          </DialogTitle>
          <DialogDescription>
            Masukkan jumlah kas fisik saat ini untuk mencocokkan saldo laci kasir sebelum menutup shift.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100 text-sm">
            <div className="space-y-1">
              <span className="text-muted text-xs uppercase tracking-wider block font-medium">
                Modal Awal
              </span>
              <span className="text-heading font-semibold text-base">
                {formatRupiah(modalAwal)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted text-xs uppercase tracking-wider block font-medium">
                Total Penjualan Tunai
              </span>
              <span className="text-heading font-semibold text-base">
                {formatRupiah(totalCashSales)}
              </span>
            </div>
            <div className="space-y-1 col-span-2 border-t border-slate-200/60 pt-3">
              <span className="text-muted text-xs uppercase tracking-wider block font-medium">
                Ekspektasi Kas Fisik (Awal + Tunai)
              </span>
              <span className="text-primary font-bold text-lg">
                {formatRupiah(expectedCash)}
              </span>
            </div>
            <div className="space-y-1 col-span-2 border-t border-slate-200/60 pt-3">
              <span className="text-muted text-xs uppercase tracking-wider block font-medium">
                Total QRIS (Non-Tunai)
              </span>
              <span className="text-heading font-semibold text-base">
                {formatRupiah(totalQrisSales)}
              </span>
            </div>
          </div>

          <Separator />

          {/* User Inputs */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cash_counted" className="text-sm font-semibold">
                Jumlah Uang Kas Fisik (Rp)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted">
                  Rp
                </span>
                <Input
                  id="cash_counted"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="pl-9 text-base font-semibold"
                  value={cashCountedStr}
                  onChange={(e) => setCashCountedStr(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            {/* Variance indicator */}
            {cashCountedStr !== "" && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-sm ${
                  variance >= 0
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}
              >
                {variance >= 0 ? (
                  <CheckCircle className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {variance === 0
                      ? "Saldo sesuai (Ekspektasi Kas Cocok)"
                      : variance > 0
                      ? `Kelebihan Kas: +${formatRupiah(variance)}`
                      : `Selisih Kurang: ${formatRupiah(variance)}`}
                  </p>
                  <p className={`text-xs mt-0.5 ${variance >= 0 ? "text-emerald-600/90" : "text-rose-600/90"}`}>
                    {variance === 0
                      ? "Jumlah fisik yang dihitung persis sama dengan ekspektasi sistem."
                      : variance > 0
                      ? "Terdapat sisa uang kas lebih di laci kasir."
                      : "Uang kas fisik kurang dari ekspektasi sistem. Pastikan alasan dicatat di bawah."}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Catatan Shift (Opsional)
              </Label>
              <textarea
                id="notes"
                placeholder="Tambahkan catatan khusus jika ada selisih kas atau kendala selama shift..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs p-3">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menutup Shift..." : "Tutup Shift Sekarang"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
