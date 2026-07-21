"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash, X, ChevronLeft, ChevronDown, Image as ImageIcon, Inbox } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────
type Product = { id: string; name: string; image_url: string | null; is_active: boolean; category_name?: string };

type Modifier = {
  id: string;
  product_id: string;
  modifier_group: string;
  modifier_name: string;
  price_delta: number;
  is_active: boolean;
  sort_order: number;
  products: { name: string } | null;
};

type FormState = {
  product_id: string;
  modifier_group: string;
  modifier_name: string;
  price_delta: string;   // string for input
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  product_id: "",
  modifier_group: "",
  modifier_name: "",
  price_delta: "0",
  is_active: true,
};

// Common modifier group suggestions
const GROUP_SUGGESTIONS = [
  "Tingkat Pedas",
  "Tingkat Manis",
  "Topping Tambahan",
  "Ukuran Porsi",
  "Pilihan Mie",
];

// ── Component ─────────────────────────────────────────────────
export default function ModifierManagement() {
  const supabase = createClient();

  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [deletingModifier, setDeletingModifier] = useState<Modifier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, image_url, is_active, categories(name)")
      .order("name");

    const filtered = (data ?? [])
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url,
        is_active: p.is_active,
        category_name: p.categories?.name ?? ""
      }));

    setProducts(filtered);
  }, [supabase]);

  const fetchModifiers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("product_modifiers")
      .select("id, product_id, modifier_group, modifier_name, price_delta, is_active, sort_order, products(name)")
      .order("product_id")
      .order("modifier_group")
      .order("modifier_name");

    if (error) {
      toast.error("Gagal memuat pilihan: " + error.message);
    } else {
      setModifiers((data as unknown as Modifier[]) ?? []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();
    fetchModifiers();
  }, [fetchProducts, fetchModifiers]);

  // ── Filtered list ────────────────────────────────────────────
  const filteredModifiers = selectedProduct
    ? modifiers.filter((m) => m.product_id === selectedProduct.id)
    : [];

  // ── Group by modifier_group for display ──────────────────────
  const grouped = filteredModifiers.reduce<Record<string, Modifier[]>>((acc, m) => {
    const key = m.modifier_group;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // ── Calculate Stats for Level 1 ──────────────────────────────
  const productStats = products.map((p) => {
    const productMods = modifiers.filter((m) => m.product_id === p.id);
    const groups = new Set(productMods.map((m) => m.modifier_group));
    return {
      ...p,
      groupCount: groups.size,
      modifierCount: productMods.length,
    };
  });

  // ── Dialog helpers ───────────────────────────────────────────
  const openAddDialog = () => {
    setEditingModifier(null);
    setForm({
      ...EMPTY_FORM,
      product_id: selectedProduct ? selectedProduct.id : "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (m: Modifier) => {
    setEditingModifier(m);
    setForm({
      product_id: m.product_id,
      modifier_group: m.modifier_group,
      modifier_name: m.modifier_name,
      price_delta: String(m.price_delta),
      is_active: m.is_active,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (m: Modifier) => {
    setDeletingModifier(m);
    setDeleteDialogOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimName = form.modifier_name.trim();
    const trimGroup = form.modifier_group.trim();
    const delta = parseFloat(form.price_delta);

    if (!form.product_id) {
      toast.error("Pilih produk terlebih dahulu.");
      return;
    }
    if (!trimName) {
      toast.error("Nama pilihan tidak boleh kosong.");
      return;
    }
    if (!trimGroup) {
      toast.error("Kategori pilihan tidak boleh kosong.");
      return;
    }
    if (isNaN(delta)) {
      toast.error("Harga tambahan harus berupa angka.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        product_id: form.product_id,
        modifier_group: trimGroup,
        modifier_name: trimName,
        price_delta: delta,
        is_active: form.is_active,
      };

      if (editingModifier) {
        const { error } = await supabase
          .from("product_modifiers")
          .update(payload)
          .eq("id", editingModifier.id);
        if (error) throw error;
        toast.success(`Pilihan "${trimName}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase
          .from("product_modifiers")
          .insert([payload]);
        if (error) throw error;
        toast.success(`Pilihan "${trimName}" berhasil ditambahkan.`);
      }

      setDialogOpen(false);
      setEditingModifier(null);
      setForm(EMPTY_FORM);
      await fetchModifiers();
    } catch (err: any) {
      console.error("[ModifierManagement] Save error:", err);
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingModifier) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("product_modifiers")
        .delete()
        .eq("id", deletingModifier.id);
      if (error) throw error;
      toast.success(`Modifier "${deletingModifier.modifier_name}" dihapus.`);
      setDeleteDialogOpen(false);
      await fetchModifiers();
    } catch (err: any) {
      console.error("[ModifierManagement] Delete error:", err);
      toast.error("Gagal menghapus: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {selectedProduct === null ? (
        // ── LEVEL 1: GRID VIEW ──
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daftar Menu Varian & Topping</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pilih menu di bawah ini untuk mengatur varian, level pedas, atau topping.
              </p>
            </div>
            <Button
              onClick={openAddDialog}
              className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2 shrink-0"
            >
              <Plus className="size-4" />
              Tambah Varian Manual
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-6 gap-3 mt-2">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2 p-2.5 border border-slate-100 rounded-xl bg-white">
                  <Skeleton className="w-full aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-3/4 animate-pulse" />
                  <Skeleton className="h-3 w-1/2 animate-pulse" />
                </div>
              ))
            ) : productStats.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-4 animate-pulse">
                  <Inbox className="size-8 text-slate-300 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-heading">Belum Ada Menu</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-relaxed">
                  Tidak ada menu makanan atau produk terdaftar di sistem POS Anda saat ini.
                </p>
              </div>
            ) : (
              productStats.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="group relative flex flex-col h-full rounded-xl border bg-white p-2.5 transition-all duration-200 select-none border-slate-100 hover:border-slate-200 hover:shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2 bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <ImageIcon className="size-5 stroke-[1.5]" />
                    )}
                    {!p.is_active && (
                      <Badge className="absolute top-1.5 right-1.5 bg-slate-800 text-white font-semibold px-1.5 py-0.5 text-[8px]">
                        Nonaktif
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between space-y-1.5">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-slate-800 leading-tight group-hover:text-primary transition-colors text-[16px] sm:text-xs">
                        {p.name}
                      </h3>
                      <p className="text-[12px] text-muted-foreground leading-tight">
                        {p.groupCount} Grup &bull; {p.modifierCount} Opsi
                      </p>
                    </div>
                    <div className="flex items-center justify-end pt-1">
                      <span className="text-[12px] font-bold text-primary group-hover:translate-x-0.5 transition-transform duration-200">
                        Kelola &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // ── LEVEL 2: DETAIL VIEW ──
        <div className="space-y-6">
          {/* Product Header Compact */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex items-center justify-center size-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors shrink-0"
                title="Kembali"
                aria-label="Kembali ke daftar menu"
              >
                <ChevronLeft className="size-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative size-12 bg-slate-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="size-full object-cover" />
                  ) : (
                    <ImageIcon className="size-5 text-slate-400 stroke-[1.5]" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">{selectedProduct.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {productStats.find((p) => p.id === selectedProduct.id)?.groupCount ?? 0} Grup &bull; {productStats.find((p) => p.id === selectedProduct.id)?.modifierCount ?? 0} Opsi
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={openAddDialog}
              size="sm"
              className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg gap-2 w-full sm:w-auto shadow-sm shadow-primary/20"
            >
              <Plus className="size-3.5" />
              Tambah Opsi
            </Button>
          </div>

          <div className="space-y-4">
            {Object.keys(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
                <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-4 animate-pulse">
                  <Inbox className="size-8 text-slate-300 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-heading">Belum Ada Varian & Topping</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-relaxed">
                  Belum ada pilihan varian & topping untuk produk ini. Tambahkan grup atau opsi baru sekarang.
                </p>
                <Button
                  onClick={openAddDialog}
                  className="mt-5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg gap-2 text-xs py-2 px-4 shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
                >
                  <Plus className="size-3.5" />
                  Tambah Opsi Pertama
                </Button>
              </div>
            ) : (
              Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Group header */}
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      {groupName}
                    </span>
                    <Badge className="ml-auto bg-white text-slate-500 border-slate-200 text-[10px] shadow-sm shadow-slate-100">
                      {items.length} opsi
                    </Badge>
                  </div>

                  {/* Mobile Layout (Cards) */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {items.map((m) => (
                      <div key={m.id} className="p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">{m.modifier_name}</h4>
                            <p className={`text-xs font-bold mt-1 ${m.price_delta === 0 ? "text-slate-400" : m.price_delta > 0 ? "text-green-600" : "text-red-500"}`}>
                              {m.price_delta === 0 ? "Gratis" : m.price_delta > 0 ? `+${formatRupiah(m.price_delta)}` : `-${formatRupiah(Math.abs(m.price_delta))}`}
                            </p>
                          </div>
                          <div>
                            <Badge className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-0 ${m.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {m.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1 border-t border-slate-50 pt-2">
                          <button
                            onClick={() => openEditDialog(m)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Edit"
                            aria-label={`Edit ${m.modifier_name}`}
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(m)}
                            className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Hapus"
                            aria-label={`Hapus ${m.modifier_name}`}
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Layout (Table) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 w-1/2">Nama Opsi</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">Harga</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500">Status</th>
                          <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((m) => (
                          <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-2.5">
                              <p className={`text-sm font-semibold ${m.is_active ? "text-slate-800" : "text-slate-500"}`}>
                                {m.modifier_name}
                              </p>
                            </td>
                            <td className="px-4 py-2.5">
                              <p className={`text-xs font-bold whitespace-nowrap ${m.price_delta === 0 ? "text-slate-400" : m.price_delta > 0 ? "text-green-600" : "text-red-500"}`}>
                                {m.price_delta === 0 ? "Gratis" : m.price_delta > 0 ? `+${formatRupiah(m.price_delta)}` : `-${formatRupiah(Math.abs(m.price_delta))}`}
                              </p>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge className={`text-[10px] px-2 py-0.5 whitespace-nowrap border-0 ${m.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}`}>
                                {m.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditDialog(m)}
                                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Edit"
                                  aria-label={`Edit ${m.modifier_name}`}
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => openDeleteDialog(m)}
                                  className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                  title="Hapus"
                                  aria-label={`Hapus ${m.modifier_name}`}
                                >
                                  <Trash className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingModifier(null);
          setForm(EMPTY_FORM);
          setShowGroupSuggestions(false);
          setShowProductDropdown(false);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              {editingModifier ? "Edit Varian / Topping" : "Tambah Varian / Topping"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Produk */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-product" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Produk <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProductDropdown(!showProductDropdown)}
                  onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                  disabled={!!selectedProduct}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all disabled:opacity-50 disabled:bg-slate-50"
                >
                  <span className={form.product_id ? "text-slate-800" : "text-slate-400"}>
                    {form.product_id 
                      ? products.find((p) => p.id === form.product_id)?.name 
                      : "— Pilih Produk —"}
                  </span>
                  <ChevronDown className="size-4 text-slate-400 shrink-0" />
                </button>
                {showProductDropdown && !selectedProduct && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {products.length === 0 ? (
                      <div className="px-4 py-3 text-center text-xs text-slate-400 italic bg-white">
                        Belum ada produk terdaftar
                      </div>
                    ) : (
                      products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, product_id: p.id }));
                            setShowProductDropdown(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors text-slate-700 border-b border-slate-100 last:border-0"
                        >
                          {p.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modifier Group */}
            {(() => {
              const currentProduct = products.find((p) => p.id === form.product_id);
              const isMinuman = currentProduct?.category_name?.toLowerCase() === "minuman";
              const groupSuggestionsForProduct = isMinuman
                ? ["Tingkat Manis", "Topping Tambahan", "Ukuran Porsi"]
                : ["Tingkat Pedas", "Topping Tambahan", "Ukuran Porsi", "Pilihan Mie"];

              return (
                <div className="space-y-1.5">
                  <Label htmlFor="mod-group" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Kategori Pilihan (Grup) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="mod-group"
                        value={form.modifier_group}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, modifier_group: e.target.value }));
                          setShowGroupSuggestions(true); // hanya buka saat user mengetik
                        }}
                        onFocus={() => {
                          setShowGroupSuggestions(true);
                        }}
                        onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
                        placeholder={isMinuman ? "contoh: Tingkat Manis" : "contoh: Tingkat Pedas"}
                        className="rounded-xl pr-9"
                        autoComplete="off"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown className="size-4 text-slate-400" />
                      </div>
                      {/* Suggestions dropdown */}
                      {showGroupSuggestions && (
                        <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                          {groupSuggestionsForProduct
                            .filter((s) =>
                              s.toLowerCase().includes(form.modifier_group.toLowerCase())
                            )
                            .map((s) => (
                              <button
                                key={s}
                                type="button"
                                onMouseDown={() => setForm((f) => ({ ...f, modifier_group: s }))}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    {/* Reset/Batal button */}
                    {form.modifier_group && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, modifier_group: "" }))}
                        title="Batal / Kosongkan kategori"
                        className="px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shrink-0"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pilihan dalam kategori yang sama akan tampil sebagai opsi pilihan radio.
                  </p>
                </div>
              );
            })()}

            {/* Modifier Name */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama Pilihan (Topping/Level) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="mod-name"
                value={form.modifier_name}
                onChange={(e) => setForm((f) => ({ ...f, modifier_name: e.target.value }))}
                placeholder="contoh: Level 3, Tambah Keju"
                className="rounded-xl"
              />
            </div>

            {/* Price Delta */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-price" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Harga Tambahan (Rp)
              </Label>
              <Input
                id="mod-price"
                type="number"
                value={form.price_delta}
                onChange={(e) => setForm((f) => ({ ...f, price_delta: e.target.value }))}
                placeholder="0"
                className="rounded-xl"
              />
              <p className="text-[11px] text-slate-400">
                0 = gratis, angka positif = tambah harga, negatif = diskon.
              </p>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Status Aktif</p>
                <p className="text-xs text-slate-400">Pilihan tersedia di POS</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-orange-500" : "bg-slate-200"
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setEditingModifier(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary hover:bg-primary-hover text-white rounded-xl"
            >
              {isSaving ? (
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : editingModifier ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Pilihan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">Hapus Pilihan</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus pilihan{" "}
              <span className="font-semibold text-slate-800">
                "{deletingModifier?.modifier_name}"
              </span>{" "}
              dari kategori{" "}
              <span className="font-semibold text-slate-800">
                "{deletingModifier?.modifier_group}"
              </span>
              ?
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Riwayat transaksi yang sudah menggunakan pilihan ini tidak akan terpengaruh.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
            >
              {isDeleting ? (
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Ya, Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
