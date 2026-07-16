"use client";

import { Category } from "@/types/database";
import { cn } from "@/lib/utils";

interface CategoryTabBarProps {
  categories: Category[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export default function CategoryTabBar({
  categories,
  activeCategoryId,
  onSelectCategory,
}: CategoryTabBarProps) {
  return (
    <div className="w-full bg-white border-b border-border px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mb-1">
        {/* 'Semua Menu' Tab */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={cn(
            "px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border transition-all duration-150 whitespace-nowrap",
            activeCategoryId === null
              ? "bg-primary border-primary text-white"
              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
          )}
        >
          Semua Menu
        </button>

        {/* Categories Tab */}
        {categories
          .filter((cat) => cat.is_active && cat.name.toLowerCase() !== "topping")
          .map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  "px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-lg border transition-all duration-150 whitespace-nowrap",
                  isActive
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                )}
              >
                {category.name}
              </button>
            );
          })}
      </div>
    </div>
  );
}
