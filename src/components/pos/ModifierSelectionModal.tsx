"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Product, ProductModifier } from "@/lib/mocks/catalog";
import { formatRupiah } from "@/lib/utils/format";
import { CheckCircle, Plus } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ModifierSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  modifiers: ProductModifier[];
  onConfirm: (product: Product, selectedModifiers: ProductModifier[]) => void;
}

export default function ModifierSelectionModal({
  isOpen,
  onOpenChange,
  product,
  modifiers,
  onConfirm,
}: ModifierSelectionModalProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, ProductModifier[]>
  >({});

  // Helper heuristic to determine if group is single-select (mutually exclusive)
  const isSingleSelectGroup = (groupName: string) => {
    const name = groupName.toLowerCase();
    return (
      name.includes("pedas") ||
      name.includes("level") ||
      name.includes("cabe") ||
      name.includes("ukuran") ||
      name.includes("manis") ||
      name.includes("sweet") ||
      name.includes("porsi")
    );
  };

  // Group modifiers
  const groupedModifiers = modifiers.reduce((acc, mod) => {
    if (!acc[mod.modifier_group]) {
      acc[mod.modifier_group] = [];
    }
    acc[mod.modifier_group].push(mod);
    return acc;
  }, {} as Record<string, ProductModifier[]>);

  // Set default values when modal opens
  useEffect(() => {
    if (isOpen && modifiers.length > 0) {
      const initial: Record<string, ProductModifier[]> = {};

      Object.keys(groupedModifiers).forEach((groupName) => {
        const groupItems = groupedModifiers[groupName];
        if (isSingleSelectGroup(groupName)) {
          // Select first item by sort order
          const sorted = [...groupItems].sort(
            (a, b) => a.sort_order - b.sort_order
          );
          initial[groupName] = [sorted[0]];
        } else {
          initial[groupName] = [];
        }
      });

      setSelectedModifiers(initial);
    }
  }, [isOpen, product]);

  const handleSelectModifier = (groupName: string, modifier: ProductModifier) => {
    const isSingle = isSingleSelectGroup(groupName);

    setSelectedModifiers((prev) => {
      const current = prev[groupName] || [];

      if (isSingle) {
        return {
          ...prev,
          [groupName]: [modifier],
        };
      } else {
        const exists = current.some((m) => m.id === modifier.id);
        const updated = exists
          ? current.filter((m) => m.id !== modifier.id)
          : [...current, modifier];
        return {
          ...prev,
          [groupName]: updated,
        };
      }
    });
  };

  const getIsSelected = (groupName: string, id: string) => {
    return (selectedModifiers[groupName] || []).some((m) => m.id === id);
  };

  // Pricing calculations
  const basePrice = Number(product.base_price);
  const modifiersList = Object.values(selectedModifiers).flat();
  const modifiersPrice = modifiersList.reduce(
    (sum, m) => sum + Number(m.price_delta),
    0
  );
  const totalPrice = basePrice + modifiersPrice;

  const handleConfirmSubmit = () => {
    onConfirm(product, modifiersList);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-bold text-heading">
            Sesuaikan {product.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Pilih variasi rasa dan topping sesuai keinginan pelanggan.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable modifiers list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {Object.keys(groupedModifiers).map((groupName) => {
            const isSingle = isSingleSelectGroup(groupName);
            const groupItems = groupedModifiers[groupName];

            return (
              <div key={groupName} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-heading text-sm uppercase tracking-wider">
                    {groupName}
                  </h4>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      isSingle
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    )}
                  >
                    {isSingle ? "Pilih Satu" : "Bisa Pilih Banyak"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {groupItems
                    .filter((m) => m.is_active)
                    .map((item) => {
                      const isSelected = getIsSelected(groupName, item.id);
                      return (
                        <div
                          key={item.id}
                          role="button"
                          onClick={() =>
                            handleSelectModifier(groupName, item)
                          }
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl border-2 text-left cursor-pointer transition-all duration-200 select-none",
                            isSelected
                              ? "border-primary bg-primary/5 hover:bg-primary/10 shadow-sm"
                              : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-heading leading-tight">
                              {item.modifier_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {Number(item.price_delta) === 0
                                ? "Gratis"
                                : `+${formatRupiah(Number(item.price_delta))}`}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="size-5 text-primary shrink-0 animate-in zoom-in-75 duration-150" />
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        {/* Sticky footer with pricing summary */}
        <DialogFooter className="p-6 bg-slate-50/80 backdrop-blur-sm border-t border-border flex sm:items-center sm:justify-between gap-4">
          <div className="text-left">
            <span className="text-xs text-muted font-semibold block uppercase tracking-wider">
              Total Harga
            </span>
            <span className="text-2xl font-bold text-heading">
              {formatRupiah(totalPrice)}
            </span>
          </div>

          <Button
            onClick={handleConfirmSubmit}
            className="bg-primary hover:bg-primary-hover text-white font-semibold py-6 px-6 gap-2 text-sm shadow-md shadow-primary/10 rounded-xl"
          >
            <Plus className="size-4" />
            Tambahkan ke Keranjang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
