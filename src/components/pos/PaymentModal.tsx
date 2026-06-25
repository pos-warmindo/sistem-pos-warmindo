"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/lib/hooks/useCart";
import { useShift } from "@/lib/hooks/useShift";
import { formatRupiah } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Banknote, CreditCard } from "@/lib/icons";

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentModal({ isOpen, onOpenChange }: PaymentModalProps) {
  const { cartItems, total, subtotal, clearCart } = useCart();
  const { activeShift } = useShift();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<string>("tunai");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const numericPaid = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, numericPaid - total);
  const isValidAmount = numericPaid >= total;

  // Reset inputs when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmountPaidInput("");
      setActiveTab("tunai");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Generate suggested cash amounts
  const getPresetAmounts = () => {
    const presets = new Set<number>();
    presets.add(total); // Uang pas

    const notes = [10000, 20000, 50000, 100000];
    notes.forEach((note) => {
      if (note > total) {
        presets.add(note);
      }
    });

    return Array.from(presets).sort((a, b) => a - b);
  };

  const handleConfirmTunai = async () => {
    if (!isValidAmount) {
      toast.error("Nominal pembayaran kurang dari total belanja.");
      return;
    }
    if (!activeShift) {
      toast.error("Transaksi ditolak. Tidak ada shift aktif.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Get active user id
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Pengguna tidak terautentikasi.");
      }

      // 2. Insert order with PENDING status
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          shift_id: activeShift.id,
          cashier_id: user.id,
          subtotal: subtotal,
          total_amount: total,
          status: "PENDING",
          payment_method: "TUNAI",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Insert order items
      const orderItemsData = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        unit_price: item.product.base_price,
        quantity: item.quantity,
        line_total: item.lineTotal,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItemsData)
        .select();

      if (itemsError) throw itemsError;

      // 4. Insert modifier snapshots (if any)
      const modifiersData: any[] = [];
      cartItems.forEach((item) => {
        const matchedItem = insertedItems.find((ii) => ii.product_id === item.product.id);
        if (matchedItem && item.modifiers.length > 0) {
          item.modifiers.forEach((mod) => {
            modifiersData.push({
              order_item_id: matchedItem.id,
              modifier_id: mod.id,
              modifier_name: mod.modifier_name,
              modifier_group: mod.modifier_group,
              price_delta: mod.price_delta,
            });
          });
        }
      });

      if (modifiersData.length > 0) {
        const { error: modsError } = await supabase
          .from("order_item_modifiers")
          .insert(modifiersData);

        if (modsError) throw modsError;
      }

      // 5. Update order status to PAID (this triggers database stock deduction and checks)
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "PAID",
          amount_paid: numericPaid,
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderData.id);

      if (updateError) throw updateError;

      // 6. Insert payment log
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: orderData.id,
          amount: total,
          method: "TUNAI",
        });

      if (paymentError) throw paymentError;

      toast.success("Transaksi Tunai Berhasil!");
      clearCart();
      onOpenChange(false);
    } catch (error: any) {
      console.error("[PaymentModal] Transaction failed:", error);
      const msg = error.message || "";
      if (msg.includes("insufficient stock") || msg.includes("Stok tidak mencukupi") || error.code === "P0001") {
        toast.error(msg.replace("internal error: ", "").replace("exception: ", "") || "Stok bahan baku tidak mencukupi!");
      } else {
        toast.error("Gagal memproses pembayaran: " + msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-heading">
            Pembayaran
          </DialogTitle>
        </DialogHeader>

        {/* Pricing Summary */}
        <div className="bg-slate-50/50 p-6 flex flex-col items-center justify-center text-center border-b border-border">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
            Total Tagihan
          </span>
          <span className="text-3xl font-extrabold text-heading">
            {formatRupiah(total)}
          </span>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="flex w-full bg-slate-100/80 p-1.5 rounded-2xl group-data-horizontal/tabs:h-auto">
              <TabsTrigger
                value="tunai"
                className="rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2"
              >
                <Banknote className="size-5" />
                Tunai
              </TabsTrigger>
              <TabsTrigger
                value="qris"
                className="rounded-xl py-4 font-bold text-sm flex items-center justify-center gap-2"
              >
                <CreditCard className="size-5" />
                QRIS
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="tunai" className="m-0 space-y-5 focus:outline-none">
              {/* Cash payment amount inputs */}
              <div className="space-y-2">
                <Label htmlFor="amount-paid" className="text-xs font-bold text-heading uppercase tracking-wider">
                  Jumlah Dibayar (Rp)
                </Label>
                <div className="relative">
                  <Input
                    id="amount-paid"
                    type="number"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    autoFocus
                    placeholder="Masukkan nominal uang"
                    className="py-6 px-4 text-base font-bold rounded-xl border-slate-200 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Preset quick buttons */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Uang Cepat
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {getPresetAmounts().map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      onClick={() => setAmountPaidInput(preset.toString())}
                      className="py-5 font-bold text-xs rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
                    >
                      {preset === total ? "Uang Pas" : formatRupiah(preset)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Change/Kembalian calculations */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-500">
                  Uang Kembalian
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatRupiah(changeAmount)}
                </span>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleConfirmTunai}
                disabled={!isValidAmount || isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-6 rounded-xl shadow-lg shadow-primary/10 mt-2"
              >
                {isSubmitting ? (
                  <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Konfirmasi Pembayaran"
                )}
              </Button>
            </TabsContent>

            <TabsContent value="qris" className="m-0 flex flex-col items-center justify-center py-6 text-center space-y-4 focus:outline-none">
              <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                <CreditCard className="size-8 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-heading text-base">QRIS Belum Aktif</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed mx-auto">
                  Metode pembayaran QRIS sedang menunggu integrasi API dari backend. Gunakan metode pembayaran Tunai terlebih dahulu.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
