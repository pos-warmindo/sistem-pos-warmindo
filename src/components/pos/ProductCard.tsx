"use client";

import { Product } from "@/types/database";
import { formatRupiah } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Package } from "@/lib/icons";
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
        "group relative flex flex-col h-full rounded-2xl border bg-card p-4 transition-all duration-200 select-none",
        isAvailable
          ? "border-slate-100 hover:border-slate-200 hover:shadow-md active:scale-[0.98] cursor-pointer"
          : "border-slate-100 bg-slate-50/60 opacity-60 cursor-not-allowed"
      )}
    >
      {/* Stock out indicator badge */}
      {!isAvailable && (
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant="outline"
            className="flex items-center gap-1 bg-amber-50 border-amber-200 text-amber-600 font-semibold px-2 py-0.5 text-[10px] tracking-wide"
          >
            <Package className="size-3" />
            STOK HABIS
          </Badge>
        </div>
      )}

      {/* Main product info */}
      <div className="flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-heading leading-tight group-hover:text-primary transition-colors text-base">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* Pricing info */}
        <div className="flex items-center justify-between pt-2">
          <span className="font-bold text-slate-900 text-base">
            {formatRupiah(Number(product.base_price))}
          </span>
          {isAvailable && (
            <span className="text-[10px] font-bold text-primary group-hover:translate-x-0.5 transition-transform duration-200">
              Pilih &rarr;
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
