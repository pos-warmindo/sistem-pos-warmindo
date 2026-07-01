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
import { Plus, Pencil, Trash } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────
type Product = { id: string; name: string };

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

  const [modifiers, setModifiers]   = useState<Modifier[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [filterProductId, setFilterProductId] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen]             = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModifier, setEditingModifier]   = useState<Modifier | null>(null);
  const [deletingModifier, setDeletingModifier] = useState<Modifier | null>(null);
  const [form, setForm]                         = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving]                 = useState(false);
  const [isDeleting, setIsDeleting]             = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("is_active", true)
      .order("name");
    setProducts(data ?? []);
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
      toast.error("Gagal memuat modifier: " + error.message);
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
  const filteredModifiers =
    filterProductId === "all"
      ? modifiers
      : modifiers.filter((m) => m.product_id === filterProductId);

  // ── Group by modifier_group for display ──────────────────────
  const grouped = filteredModifiers.reduce<Record<string, Modifier[]>>((acc, m) => {
    const key = `${m.product_id}||${m.modifier_group}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // ── Dialog helpers ───────────────────────────────────────────
  const openAddDialog = () => {
    setEditingModifier(null);
    setForm({
      ...EMPTY_FORM,
      product_id: filterProductId !== "all" ? filterProductId : "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (m: Modifier) => {
    setEditingModifier(m);
    setForm({
      product_id:     m.product_id,
      modifier_group: m.modifier_group,
      modifier_name:  m.modifier_name,
      price_delta:    String(m.price_delta),
      is_active:      m.is_active,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (m: Modifier) => {
    setDeletingModifier(m);
    setDeleteDialogOpen(true);
  };

  // ── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimName  = form.modifier_name.trim();
    const trimGroup = form.modifier_group.trim();
    const delta     = parseFloat(form.price_delta);

    if (!form.product_id) {
      toast.error("Pilih produk terlebih dahulu.");
      return;
    }
    if (!trimName) {
      toast.error("Nama modifier tidak boleh kosong.");
      return;
    }
    if (!trimGroup) {
      toast.error("Grup modifier tidak boleh kosong.");
      return;
    }
    if (isNaN(delta)) {
      toast.error("Harga tambahan harus berupa angka.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        product_id:     form.product_id,
        modifier_group: trimGroup,
        modifier_name:  trimName,
        price_delta:    delta,
        is_active:      form.is_active,
      };

      if (editingModifier) {
        const { error } = await supabase
          .from("product_modifiers")
          .update(payload)
          .eq("id", editingModifier.id);
        if (error) throw error;
        toast.success(`Modifier "${trimName}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase
          .from("product_modifiers")
          .insert(payload);
        if (error) throw error;
        toast.success(`Modifier "${trimName}" berhasil ditambahkan.`);
      }

      setDialogOpen(false);
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
      {/* Header + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {/* Product filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterProductId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filterProductId === "all"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua Produk
          </button>
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterProductId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterProductId === p.id
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2 shrink-0"
        >
          <Plus className="size-4" />
          Tambah Modifier
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredModifiers.length} modifier
        {filterProductId !== "all" && " untuk produk ini"}
      </p>

      {/* Grouped table */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Memuat modifier...
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-200">
            Belum ada modifier.{" "}
            {filterProductId !== "all"
              ? "Tambahkan modifier untuk produk ini."
              : "Pilih produk atau tambahkan modifier baru."}
          </div>
        ) : (
          Object.entries(grouped).map(([key, items]) => {
            const [, groupName] = key.split("||");
            const productName   = items[0]?.products?.name ?? "—";

            return (
              <div
                key={key}
                className="rounded-xl border border-slate-200 overflow-hidden bg-white"
              >
                {/* Group header */}
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {productName}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {groupName}
                  </span>
                  <Badge className="ml-auto bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                    {items.length} opsi
                  </Badge>
                </div>

                {/* Modifier rows */}
                <table className="w-full text-sm">
                  <tbody>
                    {items.map((m, idx) => (
                      <tr
                        key={m.id}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                      >
                        {/* Nama modifier */}
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {m.modifier_name}
                        </td>

                        {/* Price delta */}
                        <td className="px-4 py-2.5 text-sm">
                          {m.price_delta === 0 ? (
                            <span className="text-slate-400 text-xs">Gratis</span>
                          ) : m.price_delta > 0 ? (
                            <span className="text-green-600 font-semibold text-xs">
                              +{formatRupiah(m.price_delta)}
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold text-xs">
                              -{formatRupiah(Math.abs(m.price_delta))}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-2.5">
                          {m.is_active ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold text-[10px]">
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-slate-400 border-slate-200 font-semibold text-[10px]"
                            >
                              Nonaktif
                            </Badge>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(m)}
                              className="h-7 w-7 p-0 rounded-lg border-slate-200"
                              title="Edit modifier"
                              aria-label="Edit modifier"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDialog(m)}
                              className="h-7 w-7 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50"
                              title="Hapus modifier"
                              aria-label="Hapus modifier"
                            >
                              <Trash className="size-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              {editingModifier ? "Edit Modifier" : "Tambah Modifier"}
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                Grup Modifier <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
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
              <p className="text-[11px] text-slate-400">
                Modifier dalam grup yang sama akan tampil sebagai pilihan radio.
              </p>
            </div>

            {/* Modifier Name */}
            <div className="space-y-1.5">
              <Label htmlFor="mod-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama Modifier <span className="text-red-500">*</span>
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
                <p className="text-xs text-slate-400">Modifier tersedia di POS</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.is_active ? "bg-orange-500" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.is_active ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
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
                "Tambah Modifier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">Hapus Modifier</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus modifier{" "}
              <span className="font-semibold text-slate-800">
                "{deletingModifier?.modifier_name}"
              </span>{" "}
              dari grup{" "}
              <span className="font-semibold text-slate-800">
                "{deletingModifier?.modifier_group}"
              </span>
              ?
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Riwayat transaksi yang sudah menggunakan modifier ini tidak akan terpengaruh.
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
