"use client";

import { useCart } from "@/lib/hooks/useCart";
import { useShift } from "@/lib/hooks/useShift";
import { formatRupiah } from "@/lib/utils/format";
import { ShoppingCart } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import CartLineItem from "./CartLineItem";

export default function CartSheet() {
  const { cartItems, itemCount, subtotal, clearCart, setCheckoutOpen } = useCart();
  const { activeShift } = useShift();

  const handleClear = () => {
    clearCart();
    toast.info("Pesanan dibatalkan"); // Void Order behavior toast
  };

  const handleCheckout = () => {
    if (!activeShift) {
      toast.error("Transaksi tidak diizinkan. Silakan buka shift terlebih dahulu.");
      return;
    }
    setCheckoutOpen(true);
  };

  if (itemCount === 0) return null;

  return (
    <div className="lg:hidden">
      <Sheet>
        {/* Floating bottom bar acting as the trigger */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between z-40 animate-in slide-in-from-bottom duration-300">
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-1">
              Total Pesanan ({itemCount} Menu)
            </span>
            <span className="text-lg font-bold text-slate-900 leading-tight">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <SheetTrigger
            render={
              <Button
                type="button"
                className="bg-primary hover:bg-primary-hover text-white font-semibold px-5 py-2.5 flex items-center gap-2 text-xs shadow-md shadow-primary/10 rounded-xl"
              >
                <ShoppingCart className="size-4" />
                Lihat Keranjang
              </Button>
            }
          />
        </div>

        {/* Bottom Drawer Content */}
        <SheetContent
          side="bottom"
          showCloseButton={true}
          className="h-[82vh] rounded-t-2xl flex flex-col p-0 overflow-hidden border-t border-slate-100 focus:outline-none"
        >
          {/* Header */}
          <SheetHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" />
              <SheetTitle className="font-bold text-heading text-lg">
                Keranjang Belanja
              </SheetTitle>
            </div>
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold mr-6">
              {itemCount} Menu
            </span>
          </SheetHeader>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-1">
              {cartItems.map((item) => (
                <CartLineItem key={item.itemKey} item={item} />
              ))}
            </div>
          </div>

          {/* Footer / Summary and Action buttons */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 shrink-0 pb-8">
            <div className="space-y-1.5 text-sm font-semibold">
              <div className="flex items-center justify-between text-muted">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <Separator className="my-2 bg-slate-200/60" />
              <div className="flex items-center justify-between text-base font-bold text-heading">
                <span>Total Bayar</span>
                <span className="text-primary">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="font-semibold text-xs py-5 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 rounded-xl"
                onClick={handleClear}
              >
                Batal Semua
              </Button>
              <Button
                type="button"
                className="bg-primary hover:bg-primary-hover text-white font-semibold text-xs py-5 rounded-xl shadow-md shadow-primary/10"
                onClick={handleCheckout}
              >
                Bayar Sekarang
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
