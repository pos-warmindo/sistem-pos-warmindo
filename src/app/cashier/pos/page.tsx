"use client";

import { useState, useEffect } from "react";
import ShiftGate from "@/components/pos/ShiftGate";
import CategoryTabBar from "@/components/pos/CategoryTabBar";
import ProductGrid from "@/components/pos/ProductGrid";
import ModifierSelectionModal from "@/components/pos/ModifierSelectionModal";
import CartPanel from "@/components/pos/CartPanel";
import CartSheet from "@/components/pos/CartSheet";
import PaymentModal from "@/components/pos/PaymentModal";
import {
  Product,
  ProductModifier,
  Category,
} from "@/types/database";
import { useShift } from "@/lib/hooks/useShift";
import { useStockRealtime } from "@/lib/hooks/useStockRealtime";
import { useCart } from "@/lib/hooks/useCart";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search } from "@/lib/icons";

export default function CashierPosPage() {
  const supabase = createClient();
  const { activeShift } = useShift();
  const { isProductAvailable, isLoading: isStockLoading } = useStockRealtime();

  const { addItem, isCheckoutOpen, setCheckoutOpen } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<ProductModifier[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModifiers, setProductModifiers] = useState<ProductModifier[]>([]);
  const [isModifierModalOpen, setIsModifierModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadPOSData() {
      try {
        setIsLoadingData(true);
        // Fetch categories
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true });
        
        if (catError) throw catError;

        // Fetch products
        const { data: prodData, error: prodError } = await supabase
          .from("products")
          .select("*")
          .order("sort_order", { ascending: true });
        
        if (prodError) throw prodError;

        // Fetch modifiers
        const { data: modData, error: modError } = await supabase
          .from("product_modifiers")
          .select("*")
          .order("sort_order", { ascending: true });
        
        if (modError) throw modError;

        setCategories(catData || []);
        setProducts(prodData || []);
        setModifiers(modData || []);
      } catch (error) {
        console.error("Error loading POS data:", error);
        toast.error("Gagal memuat data menu.");
      } finally {
        setIsLoadingData(false);
      }
    }

    loadPOSData();
  }, [supabase]);

  const handleSelectProduct = (product: Product) => {
    if (!activeShift) {
      toast.error("Transaksi tidak diizinkan. Silakan buka shift terlebih dahulu.");
      return;
    }
    const productMods = modifiers.filter(
      (m) => m.product_id === product.id
    );
    if (productMods.length > 0) {
      setSelectedProduct(product);
      setProductModifiers(productMods);
      setIsModifierModalOpen(true);
    } else {
      addItem(product, []);
      toast.success(`${product.name} ditambahkan ke keranjang`);
    }
  };

  // Construct availability map
  const availabilityMap = products.reduce((acc, product) => {
    acc[product.id] = isProductAvailable(product.id);
    return acc;
  }, {} as Record<string, boolean>);

  const filteredProducts = products.filter((product) => {
    const queryWords = searchQuery.toLowerCase().trim().split(/\s+/);
    return queryWords.every((word) =>
      product.name.toLowerCase().includes(word)
    );
  });

  return (
    <ShiftGate>
      {isLoadingData || isStockLoading ? (
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-slate-50/20">
          <div className="flex flex-col items-center space-y-4">
            <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-slate-500">Memuat menu dan stok...</p>
          </div>
        </div>
      ) : (
        <>
          <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-slate-50/20">
            {/* Left Column - Product catalog area */}
            <div className="flex-1 flex flex-col h-full bg-slate-50/30 border-r border-border overflow-hidden">
              <div className="bg-white px-6 pt-4 pb-1 border-b border-slate-100 flex flex-col gap-3 shrink-0">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                    <Search className="size-4" />
                  </span>
                  <Input
                    type="text"
                    placeholder="Cari menu makanan atau minuman..."
                    className="pl-9 pr-4 py-2 h-10 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl focus-visible:ring-primary focus-visible:border-primary w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <CategoryTabBar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={(id) => {
                  setActiveCategoryId(id);
                  setSearchQuery(""); // Reset search query when category changes
                }}
              />
              <div className="flex-1 overflow-y-auto">
                <ProductGrid
                  products={filteredProducts}
                  activeCategoryId={activeCategoryId}
                  onSelectProduct={handleSelectProduct}
                  availabilityMap={availabilityMap}
                />
              </div>
            </div>

            {/* Right Column - Cart Panel */}
            <CartPanel />
          </main>

          {/* Mobile Bottom Sheet Cart */}
          <CartSheet />

          {/* Modifier Selection Modal */}
          {selectedProduct && (
            <ModifierSelectionModal
              isOpen={isModifierModalOpen}
              onOpenChange={setIsModifierModalOpen}
              product={selectedProduct}
              modifiers={productModifiers}
              onConfirm={(prod, mods) => {
                addItem(prod, mods);
                toast.success(`${prod.name} ditambahkan ke keranjang`);
              }}
            />
          )}

          {/* Checkout & Payment Modal */}
          <PaymentModal
            isOpen={isCheckoutOpen}
            onOpenChange={setCheckoutOpen}
          />
        </>
      )}
    </ShiftGate>
  );
}