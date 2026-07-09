"use client";

import { Product } from "@/types/database";
import ProductCard from "./ProductCard";

import { Skeleton } from "@/components/ui/skeleton";

interface ProductGridProps {
  products: Product[];
  activeCategoryId: string | null;
  onSelectProduct: (product: Product) => void;
  // Map of product availability, e.g. { [product_id]: boolean }
  availabilityMap?: Record<string, boolean>;
  isLoading?: boolean;
}

export default function ProductGrid({
  products,
  activeCategoryId,
  onSelectProduct,
  availabilityMap = {},
  isLoading = false,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 p-4 w-full max-w-full">
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

  // Filter products by active category ID
  const filteredProducts = products.filter((prod) => {
    if (!prod.is_active) return false;
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
    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-3 p-4 w-full max-w-full">
      {filteredProducts
        .sort((a, b) => a.sort_order - b.sort_order)
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
