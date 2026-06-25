"use client";

import { useCart } from "@/lib/hooks/useCart";
import { useShift } from "@/lib/hooks/useShift";
import { formatRupiah } from "@/lib/utils/format";
import { ShoppingCart } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import CartLineItem from "./CartLineItem";

export default function CartPanel() {
  const { cartItems, itemCount, subtotal, clearCart, setCheckoutOpen } = useCart();
  const { activeShift } = useShift();

  const handleClear = () => {
    clearCart();
    toast.info("Keranjang belanja dibersihkan");
  };

  const handleCheckout = () => {
    if (!activeShift) {
      toast.error("Transaksi tidak diizinkan. Silakan buka shift terlebih dahulu.");
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <div className="hidden lg:flex w-full lg:w-[400px] shrink-0 flex-col h-full bg-white shadow-xl shadow-slate-100 z-10">
      {/* Cart Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-5 text-primary" />
          <h2 className="font-bold text-heading text-lg">Keranjang Belanja</h2>
        </div>
        {itemCount > 0 && (
          <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
            {itemCount} Menu
          </span>
        )}
      </div>

      {/* Cart items list */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center">
              <ShoppingCart className="size-8 text-muted" />
            </div>
            <div>
              <h3 className="font-bold text-heading text-base">Keranjang Kosong</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
                Pilih menu makanan atau minuman di panel kiri untuk mulai membuat pesanan.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {cartItems.map((item) => (
              <CartLineItem key={item.itemKey} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer / Checkout Summary */}
      {cartItems.length > 0 && (
        <div className="p-5 border-t border-border bg-slate-50/50 space-y-4">
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
      )}
    </div>
  );
}
