"use client";

import { Product } from "@/lib/mocks/catalog";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  activeCategoryId: string | null;
  onSelectProduct: (product: Product) => void;
  // Map of product availability, e.g. { [product_id]: boolean }
  availabilityMap?: Record<string, boolean>;
}

export default function ProductGrid({
  products,
  activeCategoryId,
  onSelectProduct,
  availabilityMap = {},
}: ProductGridProps) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
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
