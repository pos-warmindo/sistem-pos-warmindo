"use client";

import { useEffect, useState } from "react";
import { formatRupiah, formatDate } from "@/lib/utils/format";
import { Printer, X } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  modifiers: {
    modifier_name: string;
    price_delta: number;
  }[];
}

export interface ReceiptOrder {
  order_number: string;
  payment_method: "TUNAI" | "QRIS";
  amount_paid?: number | null;
  change_amount?: number | null;
  subtotal: number;
  total_amount: number;
  cashier_name: string;
  shift_id: string;
  created_at: string;
  items: ReceiptItem[];
}

interface ReceiptViewProps {
  order: ReceiptOrder;
  onClose?: () => void;
}

export default function ReceiptView({ order, onClose }: ReceiptViewProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const shortShiftId = order.shift_id ? order.shift_id.substring(0, 8) : "";

  return (
    <div className="flex flex-col items-center w-full space-y-4">
      {/* Simulation card wrapper - visible on screen, styled cleanly */}
      <div 
        id="receipt-container"
        className="w-[220px] mx-auto bg-white text-black p-4 font-mono text-[10px] leading-relaxed shadow-sm border border-slate-200 rounded-sm"
      >
        {/* Header Block */}
        <div className="text-center space-y-0.5">
          <h1 className="text-sm font-extrabold tracking-wider uppercase">WARMINDO WP 2</h1>
          <p className="text-[8px] text-slate-600">Jl. Raya Purwokerto, Banyumas</p>
          <p className="text-[8px] text-slate-600">Telp: 0812-3456-7890</p>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-400 my-2" />

        {/* Meta Block */}
        <div className="space-y-0.5 text-left text-[8px] text-slate-700">
          <div className="flex justify-between">
            <span>No Struk:</span>
            <span className="font-semibold text-black">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir:</span>
            <span>{order.cashier_name}</span>
          </div>
          <div className="flex justify-between">
            <span>Shift ID:</span>
            <span>{shortShiftId}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-400 my-2" />

        {/* Items List */}
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="space-y-0.5">
              <div className="flex justify-between font-semibold text-black">
                <span className="max-w-[150px] truncate">{item.product_name}</span>
                <span>{formatRupiah(item.line_total)}</span>
              </div>
              
              {/* Modifier summary if any */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="pl-2 text-[8px] text-slate-600 leading-tight space-y-0.5">
                  {item.modifiers.map((mod, mIndex) => (
                    <div key={mIndex} className="flex justify-between">
                      <span>+ {mod.modifier_name}</span>
                      {mod.price_delta > 0 && <span>+{formatRupiah(mod.price_delta)}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity x unit price */}
              <div className="text-[8px] text-slate-500">
                {item.quantity} x {formatRupiah(item.unit_price)}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-400 my-2" />

        {/* Totals Section */}
        <div className="space-y-0.5 text-[8px] text-slate-700">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Metode Bayar:</span>
            <span className="font-bold text-black">{order.payment_method}</span>
          </div>
          
          {order.payment_method === "TUNAI" && (
            <>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span>{formatRupiah(order.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-black text-[9px] border-t border-dashed border-slate-200 pt-0.5 mt-0.5">
                <span>Kembalian:</span>
                <span>{formatRupiah(order.change_amount || 0)}</span>
              </div>
            </>
          )}

          {order.payment_method === "QRIS" && (
            <div className="flex justify-between font-bold text-black text-[9px] border-t border-dashed border-slate-200 pt-0.5 mt-0.5">
              <span>Total:</span>
              <span>{formatRupiah(order.total_amount)}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-slate-400 my-2" />

        {/* Footer Block */}
        <div className="text-center mt-2 space-y-0.5">
          <p className="font-bold text-[8px]">TERIMA KASIH</p>
          <p className="text-[8px] text-slate-500">Silakan Datang Kembali!</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[220px] print:hidden">
        {/* Reprint Action Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={handlePrint}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 flex items-center justify-center gap-2 w-full"
        >
          <Printer className="size-4" />
          Cetak Ulang Struk
        </Button>

        {/* Cancel Print Action Button */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsConfirmOpen(true)}
          className="text-xs font-bold text-red-500 hover:text-red-900 border border-red-200 rounded-xl px-4 py-2 hover:bg-red-50 flex items-center justify-center gap-2 w-full"
        >
          <X className="size-4" />
          Tidak Cetak Struk
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-heading">Konfirmasi</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Apakah Anda yakin tidak ingin mencetak struk transaksi ini?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              className="flex-1 py-2 text-xs font-bold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsConfirmOpen(false);
                onClose?.();
              }}
              className="flex-1 py-2 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-xl"
            >
              Ya, Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}