"use client";

import { useState } from "react";
import ShiftGate from "@/components/pos/ShiftGate";
import CategoryTabBar from "@/components/pos/CategoryTabBar";
import ProductGrid from "@/components/pos/ProductGrid";
import ModifierSelectionModal from "@/components/pos/ModifierSelectionModal";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  MOCK_MODIFIERS,
  Product,
  ProductModifier,
} from "@/lib/mocks/catalog";
import { useShift } from "@/lib/hooks/useShift";
import { formatRupiah } from "@/lib/utils/format";
import { toast } from "sonner";
import { Trash2, Plus, Minus, ShoppingCart } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface LocalCartItem {
  id: string;
  product: Product;
  selectedModifiers: ProductModifier[];
  quantity: number;
}

export default function CashierPosPage() {
  const { activeShift } = useShift();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModifiers, setProductModifiers] = useState<ProductModifier[]>([]);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);

  // Local cart state for Section 4 preview/interaction
  const [cartItems, setCartItems] = useState<LocalCartItem[]>([]);

  const handleSelectProduct = (product: Product) => {
    const productMods = MOCK_MODIFIERS.filter(
      (m) => m.product_id === product.id
    );
    if (productMods.length > 0) {
      setSelectedProduct(product);
      setProductModifiers(productMods);
      setIsModifierModalOpen(true);
    } else {
      addToCart(product, []);
      toast.success(`${product.name} ditambahkan ke keranjang`);
    }
  };

  const addToCart = (product: Product, selectedModifiers: ProductModifier[]) => {
    const modifierIdsKey = selectedModifiers
      .map((m) => m.id)
      .sort()
      .join(",");
    const itemKey = `${product.id}-${modifierIdsKey}`;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.id === itemKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { id: itemKey, product, selectedModifiers, quantity: 1 },
      ];
    });
  };

  const handleIncrementQty = (id: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecrementQty = (id: string) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    toast.info("Menu dihapus dari keranjang");
  };

  const handleClearCart = () => {
    setCartItems([]);
    toast.info("Keranjang belanja dibersihkan");
  };

  // Calculations
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = cartItems.reduce((sum, item) => {
    const base = Number(item.product.base_price);
    const mods = item.selectedModifiers.reduce(
      (acc, m) => acc + Number(m.price_delta),
      0
    );
    return sum + (base + mods) * item.quantity;
  }, 0);

  return (
    <ShiftGate>
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/20">
        {/* Left Column - Product catalog area */}
        <div className="flex-1 flex flex-col h-full bg-slate-50/30 border-r border-border overflow-hidden">
          <CategoryTabBar
            categories={MOCK_CATEGORIES}
            activeCategoryId={activeCategoryId}
            onSelectCategory={setActiveCategoryId}
          />
          <div className="flex-1 overflow-y-auto">
            <ProductGrid
              products={MOCK_PRODUCTS}
              activeCategoryId={activeCategoryId}
              onSelectProduct={handleSelectProduct}
            />
          </div>
        </div>

        {/* Right Column - Cart Panel preview */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col h-full bg-white shadow-xl shadow-slate-100 z-10">
          {/* Cart Header */}
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" />
              <h2 className="font-bold text-heading text-lg">Keranjang Belanja</h2>
            </div>
            {totalItemCount > 0 && (
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">
                {totalItemCount} Menu
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
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const base = Number(item.product.base_price);
                  const modsPrice = item.selectedModifiers.reduce(
                    (acc, m) => acc + Number(m.price_delta),
                    0
                  );
                  const unitPrice = base + modsPrice;
                  const lineTotal = unitPrice * item.quantity;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-heading text-sm truncate leading-snug">
                          {item.product.name}
                        </p>
                        {item.selectedModifiers.length > 0 && (
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 line-clamp-2">
                            {item.selectedModifiers
                              .map((m) => m.modifier_name)
                              .join(", ")}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-primary mt-2">
                          {formatRupiah(lineTotal)}
                        </p>
                      </div>

                      {/* Qty and delete controls */}
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-muted hover:text-red-500 p-1 transition-colors"
                          title="Hapus menu"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-0.5 bg-white shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleDecrementQty(item.id)}
                            className="size-6 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 rounded-md"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="text-xs font-bold text-heading w-4 text-center select-none">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrementQty(item.id)}
                            className="size-6 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 rounded-md"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  className="font-semibold text-xs py-5 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                  onClick={handleClearCart}
                >
                  Batal Semua
                </Button>
                <Button
                  type="button"
                  className="bg-primary hover:bg-primary-hover text-white font-semibold text-xs py-5"
                  onClick={() => {
                    if (!activeShift) {
                      toast.error("Transaksi tidak diizinkan. Silakan buka shift terlebih dahulu.");
                      return;
                    }
                    toast.info(
                      "Fitur pembayaran & pembuatan pesanan akan diaktifkan di Section 6."
                    );
                  }}
                >
                  Bayar Sekarang
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modifier Selection Modal */}
      {selectedProduct && (
        <ModifierSelectionModal
          isOpen={isModifierModalOpen}
          onOpenChange={setIsModifierModalOpen}
          product={selectedProduct}
          modifiers={productModifiers}
          onConfirm={(prod, mods) => {
            addToCart(prod, mods);
            toast.success(`${prod.name} ditambahkan ke keranjang`);
          }}
        />
      )}
    </ShiftGate>
  );
}