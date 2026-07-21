"use client";

import { Product } from "@/types/database";
import { formatRupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Package, Image } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  isAvailable?: boolean;
  onSelect: (product: Product) => void;
}

export default function ProductCard({
  product,
  isAvailable = true,
  onSelect,
}: ProductCardProps) {
  const handleClick = () => {
    if (isAvailable) {
      onSelect(product);
    }
  };

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-disabled={!isAvailable}
      title={isAvailable ? undefined : "Stok bahan habis"}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "group relative flex flex-col h-full rounded-xl border bg-white p-3 transition-all duration-200 select-none",
        isAvailable
          ? "border-slate-100 hover:border-primary/30 hover:shadow-md hover:shadow-slate-100/50 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          : "border-slate-100 bg-slate-50/50 opacity-60 cursor-not-allowed"
      )}
    >
      {/* Stock out indicator badge */}
      {!isAvailable && (
        <div className="absolute top-4 right-4 z-10">
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-slate-100 border-slate-200 text-slate-600 font-bold px-2 py-0.5 text-[9px] tracking-wider rounded-md"
          >
            <Package className="size-3" />
            HABIS
          </Badge>
        </div>
      )}

      {/* Product Image */}
      <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-3 bg-slate-50 border border-slate-100/80 flex items-center justify-center text-slate-400 shrink-0">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Image className="size-6 stroke-[1.2] text-slate-300" />
        )}
      </div>

      {/* Main product info */}
      <div className="flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-slate-800 leading-tight group-hover:text-primary transition-colors text-xs sm:text-sm">
            {product.name}
          </h3>
        </div>

        {/* Pricing info */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <span className="font-bold text-slate-900 text-xs sm:text-sm">
            {formatRupiah(Number(product.base_price))}
          </span>
        </div>
      </div>
    </div>
  );
}
