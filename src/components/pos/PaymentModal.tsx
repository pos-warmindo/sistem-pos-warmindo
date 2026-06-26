"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Banknote, CreditCard, Clock, X } from "@/lib/icons";
import { QRCodeSVG } from "qrcode.react";

interface PaymentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type QrData = {
  qr_string: string;
  trx_id: string;
  order_id: string;
  expires_at: string;
};

export default function PaymentModal({ isOpen, onOpenChange }: PaymentModalProps) {
  const { cartItems, total, subtotal, clearCart } = useCart();
  const { activeShift } = useShift();
  const supabase = createClient();

  // ── Tunai state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("tunai");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ── QRIS state ───────────────────────────────────────────────
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [qrisTimeLeft, setQrisTimeLeft] = useState<number>(300);

  // Use refs for values accessed inside intervals to avoid stale closures
  const qrDataRef = useRef<QrData | null>(null);
  const totalRef = useRef<number>(total);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { qrDataRef.current = qrData; }, [qrData]);
  useEffect(() => { totalRef.current = total; }, [total]);

  // ── Derived tunai values ─────────────────────────────────────
  const numericPaid = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, numericPaid - total);
  const isValidAmount = numericPaid >= total;

  // ── Interval helpers ─────────────────────────────────────────
  const stopAllTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAllTimers();
  }, [stopAllTimers]);

  // Reset all state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmountPaidInput("");
      setActiveTab("tunai");
      setIsSubmitting(false);
      setQrData(null);
      setQrisTimeLeft(300);
      qrDataRef.current = null;
    } else {
      stopAllTimers();
    }
  }, [isOpen, stopAllTimers]);

  // ── QRIS expired handler (reads from ref — always fresh) ─────
  const handleQrisExpired = useCallback(async () => {
    stopAllTimers();
    const current = qrDataRef.current;
    if (!current) return;

    try {
      await supabase
        .from("orders")
        .update({ status: "EXPIRED" })
        .eq("id", current.order_id);
    } catch (err) {
      console.error("[QRIS] Expire DB update failed:", err);
    }

    toast.error("QRIS kadaluarsa. Buat pesanan baru.");
    clearCart();
    onOpenChange(false);
  }, [stopAllTimers, supabase, clearCart, onOpenChange]);

  // ── Start timers when qrData is set ─────────────────────────
  useEffect(() => {
    if (!qrData) return;

    // Guard: don't spawn a second pair of intervals
    if (countdownIntervalRef.current || pollIntervalRef.current) return;

    // Countdown timer (1 second tick)
    countdownIntervalRef.current = setInterval(() => {
      setQrisTimeLeft((prev) => {
        if (prev <= 1) {
          // Call via ref so we always have the latest qrData
          handleQrisExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling (every 10 seconds)
    pollIntervalRef.current = setInterval(async () => {
      const current = qrDataRef.current;
      if (!current) return;

      try {
        const res = await fetch(`/api/pakasir/status/${current.trx_id}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "PAID") {
          stopAllTimers();
          toast.success("Pembayaran QRIS Berhasil!");
          clearCart();
          onOpenChange(false);
        }
      } catch (err) {
        console.error("[QRIS] Poll error:", err);
      }
    }, 10000);

    return () => stopAllTimers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrData]); // Only re-run when qrData changes (i.e., new QR generated)

  // ── Tunai helpers ─────────────────────────────────────────────
  const getPresetAmounts = () => {
    const presets = new Set<number>([total]);
    [10000, 20000, 50000, 100000].forEach((note) => {
      if (note > total) presets.add(note);
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Pengguna tidak terautentikasi.");

      // INSERT order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          shift_id: activeShift.id,
          cashier_id: user.id,
          subtotal,
          total_amount: total,
          status: "PENDING",
          payment_method: "TUNAI",
        })
        .select()
        .single();
      if (orderError) throw orderError;

      // INSERT order_items
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

      // INSERT order_item_modifiers
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

      // UPDATE → PAID (fires stock deduction trigger)
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "PAID", amount_paid: numericPaid, paid_at: new Date().toISOString() })
        .eq("id", orderData.id);
      if (updateError) throw updateError;

      // INSERT payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({ order_id: orderData.id, amount: total, method: "TUNAI" });
      if (paymentError) throw paymentError;

      toast.success("Transaksi Tunai Berhasil!");
      clearCart();
      onOpenChange(false);
    } catch (error: any) {
      console.error("[Tunai] Transaction failed:", error);
      const msg: string = error?.message ?? "";
      if (msg.includes("P0001") || msg.includes("insufficient") || error?.code === "P0001") {
        toast.error(msg.replace(/internal error: |exception: /g, "") || "Stok bahan baku tidak mencukupi!");
      } else {
        toast.error("Gagal memproses pembayaran: " + msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── QRIS handlers ─────────────────────────────────────────────
  const handleGenerateQRIS = async () => {
    if (!activeShift) {
      toast.error("Transaksi ditolak. Tidak ada shift aktif.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pakasir/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift_id: activeShift.id,
          total_amount: total,
          subtotal,
          cart_items: cartItems,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal membuat QRIS");
      }

      const data: QrData = await res.json();
      setQrData(data); // triggers useEffect above to start timers

      // Derive accurate countdown from Pakasir's expires_at
      const secsLeft = Math.max(
        0,
        Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
      );
      setQrisTimeLeft(secsLeft || 300);

      toast.success("QR Code berhasil dibuat. Silakan scan untuk membayar.");
    } catch (error: any) {
      console.error("[QRIS] Generate error:", error);
      toast.error("Gagal membuat QR Code: " + (error?.message ?? ""));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelQris = async () => {
    if (!qrData) return;
    stopAllTimers();

    try {
      // Cancel on Pakasir side (fire-and-forget, non-fatal)
      fetch("/api/pakasir/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: qrData.trx_id, amount: total }),
      }).catch(console.error);

      // Mark VOIDED in our DB
      await supabase
        .from("orders")
        .update({ status: "VOIDED" })
        .eq("id", qrData.order_id);
    } catch (err) {
      console.error("[QRIS] Cancel error:", err);
    }

    toast.info("Pembayaran QRIS dibatalkan.");
    clearCart();
    onOpenChange(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-heading">
            Pembayaran
          </DialogTitle>
        </DialogHeader>

        {/* Total summary */}
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
            <TabsList className="flex w-full bg-slate-100/80 p-1.5 rounded-2xl">
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
            {/* ── TUNAI TAB ── */}
            <TabsContent value="tunai" className="m-0 space-y-5 focus:outline-none">
              <div className="space-y-2">
                <Label htmlFor="amount-paid" className="text-xs font-bold text-heading uppercase tracking-wider">
                  Jumlah Dibayar (Rp)
                </Label>
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

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-sm font-semibold text-slate-500">Uang Kembalian</span>
                <span className="text-lg font-bold text-primary">{formatRupiah(changeAmount)}</span>
              </div>

              <Button
                onClick={handleConfirmTunai}
                disabled={!isValidAmount || isSubmitting}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-6 rounded-xl shadow-lg shadow-primary/10 mt-2"
              >
                {isSubmitting
                  ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : "Konfirmasi Pembayaran"
                }
              </Button>
            </TabsContent>

            {/* ── QRIS TAB ── */}
            <TabsContent value="qris" className="m-0 space-y-4 focus:outline-none">
              {!qrData ? (
                /* ── Generate button state ── */
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                    <CreditCard className="size-8 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-heading text-base">Pembayaran QRIS</h3>
                    <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed mx-auto">
                      Klik tombol di bawah untuk membuat QR Code. Berlaku 5 menit.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateQRIS}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-6 px-8 rounded-xl shadow-lg shadow-primary/10"
                  >
                    {isSubmitting
                      ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : "Generate QR Code"
                    }
                  </Button>
                </div>
              ) : (
                /* ── QR active state ── */
                <div className="space-y-4">
                  {/* QR Code */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-md">
                      <QRCodeSVG
                        value={qrData.qr_string}
                        size={200}
                        level="M"
                        includeMargin
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 max-w-[260px] text-center leading-relaxed">
                      Scan QR Code di atas dengan aplikasi pembayaran Anda
                    </p>
                    {/* Dev helper: show trx_id for sandbox simulation */}
                    {process.env.NODE_ENV === "development" && (
                      <p className="text-[10px] text-slate-400 mt-2 font-mono break-all max-w-[260px] text-center">
                        ID: {qrData.trx_id}
                      </p>
                    )}
                  </div>

                  {/* Countdown */}
                  <div className={`flex items-center justify-center gap-2 p-4 rounded-xl border ${
                    qrisTimeLeft <= 60
                      ? "bg-red-50 border-red-200"
                      : "bg-amber-50 border-amber-200"
                  }`}>
                    <Clock className={`size-5 ${qrisTimeLeft <= 60 ? "text-red-600" : "text-amber-600"}`} />
                    <span className={`text-sm font-bold ${qrisTimeLeft <= 60 ? "text-red-900" : "text-amber-900"}`}>
                      Berlaku: {formatTime(qrisTimeLeft)}
                    </span>
                  </div>

                  {/* Polling indicator */}
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-200">
                      <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-semibold text-blue-900">
                        Menunggu pembayaran...
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Cancel */}
                  <Button
                    onClick={handleCancelQris}
                    variant="outline"
                    className="w-full py-6 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                  >
                    <X className="size-5 mr-2" />
                    Batalkan QRIS
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
