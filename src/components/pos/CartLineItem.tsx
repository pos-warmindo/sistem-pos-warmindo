"use client";

import { useCart, CartItem } from "@/lib/hooks/useCart";
import { formatRupiah } from "@/lib/utils/format";
import { Trash2, Plus, Minus } from "@/lib/icons";
import { Button } from "@/components/ui/button";

interface CartLineItemProps {
  item: CartItem;
}

export default function CartLineItem({ item }: CartLineItemProps) {
  const { updateQuantity, removeItem } = useCart();

  const handleMinus = () => {
    updateQuantity(item.itemKey, -1);
  };

  const handlePlus = () => {
    updateQuantity(item.itemKey, 1);
  };

  const handleRemove = () => {
    removeItem(item.itemKey);
  };

  // Combine modifier names into a comma-separated string
  const modifierText = item.modifiers
    .map((m) => m.modifier_name)
    .join(", ");

  return (
    <div className="flex items-start justify-between py-4 border-b border-slate-100 last:border-0 gap-4">
      {/* Left section: Name and modifier tags */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-900 truncate text-sm sm:text-base">
          {item.product.name}
        </h4>
        {modifierText && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {modifierText}
          </p>
        )}
        
        {/* Quantity Controls (32px touch targets) */}
        <div className="flex items-center gap-1.5 mt-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleMinus}
            disabled={item.quantity <= 1}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            aria-label="Kurangi jumlah"
          >
            <Minus className="size-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-semibold text-slate-900 select-none">
            {item.quantity}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePlus}
            className="w-8 h-8 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Tambah jumlah"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Right section: Price and remove button */}
      <div className="flex flex-col items-end gap-3 text-right">
        <span className="font-semibold text-slate-900 text-sm sm:text-base">
          {formatRupiah(item.lineTotal)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          className="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-lg transition-colors"
          aria-label={`Hapus ${item.product.name} dari keranjang`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
