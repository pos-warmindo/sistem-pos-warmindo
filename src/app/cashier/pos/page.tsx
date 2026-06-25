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
} from "@/lib/mocks/catalog";
import { useShift } from "@/lib/hooks/useShift";
import { useStockRealtime } from "@/lib/hooks/useStockRealtime";
import { useCart } from "@/lib/hooks/useCart";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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
              <CategoryTabBar
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={setActiveCategoryId}
              />
              <div className="flex-1 overflow-y-auto">
                <ProductGrid
                  products={products}
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