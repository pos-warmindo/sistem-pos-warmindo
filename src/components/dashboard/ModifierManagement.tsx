"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash, X, ChevronLeft, Image as ImageIcon } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────
type Product = { id: string; name: string; image_url: string | null; is_active: boolean };

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

  // ── Fetch ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, image_url, is_active, categories(name)")
      .order("name");

    const filtered = (data ?? [])
      .filter((p: any) => p.categories?.name?.toLowerCase() !== "minuman")
      .map((p: any) => ({ id: p.id, name: p.name, image_url: p.image_url, is_active: p.is_active }));

    setProducts(filtered);
  }, [supabase]);

  const fetchModifiers = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("product_modifiers")
      .select("id, product_id, modifier_group, modifier_name, price_delta, is_active, sort_order, products(name)")
      .order("product_id")
      .order("modifier_group")
      .order("sort_order");

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
      modifier_group: "", // User explicitly wants this empty on edit
      modifier_name: "",  // User explicitly wants this empty on edit
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

          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3 mt-2">
            {isLoading ? (
              <div className="col-span-full p-8 text-center text-sm text-slate-400">
                Memuat daftar menu...
              </div>
            ) : productStats.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 bg-white">
                Belum ada menu makanan.
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProduct(null)}
              className="flex items-center justify-center size-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors shadow-sm"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800">Detail Varian Menu</h2>
          </div>

          {/* Product Header */}
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="relative size-16 sm:size-20 bg-slate-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-slate-100">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-6 text-slate-400 stroke-[1.5]" />
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left h-full py-1">
              <h3 className="font-bold text-base text-slate-800">{selectedProduct.name}</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto sm:mx-0">
                Kelola daftar pilihan, level pedas, atau topping tambahan khusus untuk menu ini.
              </p>
            </div>
            <div className="shrink-0 flex items-center h-full pt-2 sm:pt-0">
              <Button
                onClick={openAddDialog}
                className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2 shadow-sm shadow-primary/20"
              >
                <Plus className="size-4" />
                Tambah Topping / Varian
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(grouped).length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 bg-white shadow-sm">
                Belum ada pilihan varian & topping untuk produk ini.
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

                  {/* Card grid */}
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map((m) => (
                      <div
                        key={m.id}
                        className={`relative rounded-xl border p-3 flex flex-col gap-1.5 transition-colors ${
                          m.is_active
                            ? "border-slate-200 bg-white hover:border-slate-300"
                            : "border-slate-100 bg-slate-50 opacity-60"
                        }`}
                      >
                        {/* Status dot */}
                        <span
                          className={`absolute top-2.5 right-2.5 size-2 rounded-full ${
                            m.is_active ? "bg-green-500" : "bg-slate-300"
                          }`}
                          title={m.is_active ? "Aktif" : "Nonaktif"}
                        />

                        <p className="text-sm font-semibold text-slate-800 pr-4 leading-snug">
                          {m.modifier_name}
                        </p>

                        <p className={`text-xs font-bold ${
                          m.price_delta === 0
                            ? "text-slate-400"
                            : m.price_delta > 0
                              ? "text-green-600"
                              : "text-red-500"
                        }`}>
                          {m.price_delta === 0
                            ? "Gratis"
                            : m.price_delta > 0
                              ? `+${formatRupiah(m.price_delta)}`
                              : `-${formatRupiah(Math.abs(m.price_delta))}`}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-1.5 mt-auto pt-2 border-t border-slate-100">
                          <button
                            onClick={() => openEditDialog(m)}
                            className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(m)}
                            className="flex-1 flex items-center justify-center py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                            title="Hapus"
                          >
                            <Trash className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
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
              <select
                id="mod-product"
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                disabled={!!selectedProduct}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:bg-slate-50"
              >
                <option value="">— Pilih Produk —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modifier Group */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-group" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kategori Pilihan (Grup) <span className="text-red-500">*</span>
              </Label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="mod-group"
                    value={form.modifier_group}
                    onChange={(e) => setForm((f) => ({ ...f, modifier_group: e.target.value }))}
                    onFocus={() => setShowGroupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
                    placeholder="contoh: Tingkat Pedas"
                    className="rounded-xl"
                    autoComplete="off"
                  />
                  {/* Suggestions dropdown */}
                  {showGroupSuggestions && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                      {GROUP_SUGGESTIONS.filter((s) =>
                        s.toLowerCase().includes(form.modifier_group.toLowerCase())
                      ).map((s) => (
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
