"use client";

import { Product } from "@/types/database";
import ProductCard from "./ProductCard";

import { Skeleton } from "@/components/ui/skeleton";

interface ProductWithCatOrder extends Product {
  categories?: { is_active: boolean; sort_order: number } | null;
}

interface ProductGridProps {
  products: ProductWithCatOrder[];
  categories?: { id: string; sort_order: number; is_active: boolean }[];
  activeCategoryId: string | null;
  onSelectProduct: (product: Product) => void;
  // Map of product availability, e.g. { [product_id]: boolean }
  availabilityMap?: Record<string, boolean>;
  isLoading?: boolean;
}

export default function ProductGrid({
  products,
  categories = [],
  activeCategoryId,
  onSelectProduct,
  availabilityMap = {},
  isLoading = false,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4 w-full max-w-full">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  // Map category id to its details for fast lookup
  const activeCategorySet = new Set(categories.map((c) => c.id));
  const categoryOrderMap: Record<string, number> = {};
  categories.forEach((cat) => {
    categoryOrderMap[cat.id] = cat.sort_order;
  });

  // Filter products by active category ID and category status
  const filteredProducts = products.filter((prod) => {
    if (!prod.is_active) return false;
    // If product belongs to a category, ensure that category is active
    if (prod.category_id) {
      const isCatActive = prod.categories ? prod.categories.is_active : activeCategorySet.has(prod.category_id);
      if (!isCatActive) return false;
    }

    if (activeCategoryId === null) return true;
    return prod.category_id === activeCategoryId;
  });

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-slate-400 font-medium text-sm">
          Tidak ada menu yang tersedia di kategori ini.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4 w-full max-w-full">
      {filteredProducts
        .sort((a, b) => {
          // If viewing "Semua Menu" (activeCategoryId === null), group/sort by category sort_order first
          if (activeCategoryId === null) {
            const catOrderA = a.categories?.sort_order ?? (a.category_id ? categoryOrderMap[a.category_id] ?? 999 : 999);
            const catOrderB = b.categories?.sort_order ?? (b.category_id ? categoryOrderMap[b.category_id] ?? 999 : 999);
            if (catOrderA !== catOrderB) {
              return catOrderA - catOrderB;
            }
          }
          return a.sort_order - b.sort_order;
        })
        .map((product) => {
          // If product is in the availability map, use it. Otherwise default to true.
          const isAvailable = availabilityMap[product.id] !== false;

          return (
            <ProductCard
              key={product.id}
              product={product}
              isAvailable={isAvailable}
              onSelect={onSelectProduct}
            />
          );
        })}
    </div>
  );
}
