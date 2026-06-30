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
import { Plus, Pencil, Trash, AlertTriangle } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────
type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  is_active: boolean;
  category_id: string | null;
  sort_order: number;
  categories: { name: string } | null;
};

type FormState = {
  name: string;
  base_price: string;          // string for input, parsed on save
  description: string;
  category_id: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  base_price: "",
  description: "",
  category_id: "",
  is_active: true,
};

// ── Component ─────────────────────────────────────────────────
export default function ProductManagement() {
  const supabase = createClient();

  const [products, setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen]           = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct]   = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [form, setForm]                       = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving]               = useState(false);
  const [isDeleting, setIsDeleting]           = useState(false);
  const [togglingId, setTogglingId]           = useState<string | null>(null);

  // ── Fetch data ───────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order");
    setCategories(data ?? []);
  }, [supabase]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    const query = supabase
      .from("products")
      .select("id, name, description, base_price, is_active, category_id, sort_order, categories(name)")
      .order("sort_order")
      .order("name");

    const { data, error } = await query;
    if (error) {
      toast.error("Gagal memuat produk: " + error.message);
    } else {
      setProducts((data as unknown as Product[]) ?? []);
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // ── Filter produk ────────────────────────────────────────────
  const filteredProducts =
    filterCategoryId === "all"
      ? products
      : products.filter((p) => p.category_id === filterCategoryId);

  // ── Dialog helpers ───────────────────────────────────────────
  const openAddDialog = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name:        p.name,
      base_price:  String(p.base_price),
      description: p.description ?? "",
      category_id: p.category_id ?? "",
      is_active:   p.is_active,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (p: Product) => {
    setDeletingProduct(p);
    setDeleteDialogOpen(true);
  };

  // ── Save (INSERT / UPDATE) ───────────────────────────────────
  const handleSave = async () => {
    const trimmedName = form.name.trim();
    const price = parseFloat(form.base_price);

    if (!trimmedName) {
      toast.error("Nama produk tidak boleh kosong.");
      return;
    }
    if (isNaN(price) || price < 0) {
      toast.error("Harga harus berupa angka yang valid.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name:        trimmedName,
        base_price:  price,
        description: form.description.trim() || null,
        category_id: form.category_id || null,
        is_active:   form.is_active,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success(`Produk "${trimmedName}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload);
        if (error) throw error;
        toast.success(`Produk "${trimmedName}" berhasil ditambahkan.`);
      }

      setDialogOpen(false);
      await fetchProducts();
    } catch (err: any) {
      console.error("[ProductManagement] Save error:", err);
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Toggle is_active langsung (tanpa dialog) ─────────────────
  const handleToggleActive = async (p: Product) => {
    setTogglingId(p.id);
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;

      // Optimistic update
      setProducts((prev) =>
        prev.map((item) =>
          item.id === p.id ? { ...item, is_active: !p.is_active } : item
        )
      );
      toast.success(
        `${p.name} ${!p.is_active ? "diaktifkan" : "dinonaktifkan"}.`
      );
    } catch (err: any) {
      toast.error("Gagal mengubah status: " + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete (soft: set is_active=false) ───────────────────────
  const handleDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      // Soft-delete: set is_active = false (preserves order history)
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", deletingProduct.id);
      if (error) throw error;
      toast.success(`Produk "${deletingProduct.name}" dinonaktifkan.`);
      setDeleteDialogOpen(false);
      await fetchProducts();
    } catch (err: any) {
      console.error("[ProductManagement] Delete error:", err);
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
        {/* Category filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategoryId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filterCategoryId === "all"
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategoryId(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filterCategoryId === cat.id
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2 shrink-0"
        >
          <Plus className="size-4" />
          Tambah Produk
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredProducts.length} produk
        {filterCategoryId !== "all" && ` dalam kategori ini`}
      </p>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Memuat produk...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Belum ada produk. Tambahkan produk pertama.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Harga</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    {/* Nama */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </td>

                    {/* Kategori */}
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {p.categories?.name ?? (
                        <span className="italic text-slate-300">—</span>
                      )}
                    </td>

                    {/* Harga */}
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {formatRupiah(p.base_price)}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      {p.is_active ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 border-slate-200 font-semibold"
                        >
                          Nonaktif
                        </Badge>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle aktif/nonaktif */}
                        <button
                          onClick={() => handleToggleActive(p)}
                          disabled={togglingId === p.id}
                          title={p.is_active ? "Nonaktifkan" : "Aktifkan"}
                          aria-label={p.is_active ? "Nonaktifkan produk" : "Aktifkan produk"}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                            p.is_active ? "bg-orange-500" : "bg-slate-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              p.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                          />
                        </button>

                        {/* Edit */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(p)}
                          className="h-8 w-8 p-0 rounded-lg border-slate-200"
                          title="Edit produk"
                          aria-label="Edit produk"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        {/* Hapus */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDeleteDialog(p)}
                          className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="Nonaktifkan/hapus produk"
                          aria-label="Hapus produk"
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              {editingProduct ? "Edit Produk" : "Tambah Produk"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nama */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama Produk <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="contoh: Indomie Goreng Spesial"
                className="rounded-xl"
                autoFocus
              />
            </div>

            {/* Harga */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-price" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Harga (Rp) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="prod-price"
                type="number"
                value={form.base_price}
                onChange={(e) => setForm((f) => ({ ...f, base_price: e.target.value }))}
                placeholder="contoh: 15000"
                className="rounded-xl"
                min={0}
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-cat" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kategori
              </Label>
              <select
                id="prod-cat"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">— Tanpa Kategori —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deskripsi */}
            <div className="space-y-1.5">
              <Label htmlFor="prod-desc" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Deskripsi <span className="text-slate-300 font-normal normal-case">(opsional)</span>
              </Label>
              <textarea
                id="prod-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Deskripsi singkat produk..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Status Aktif</p>
                <p className="text-xs text-slate-400">Produk ditampilkan di POS</p>
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
              ) : editingProduct ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Produk"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">Hapus Produk</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Produk{" "}
              <span className="font-semibold text-slate-800">
                "{deletingProduct?.name}"
              </span>{" "}
              akan dinonaktifkan sehingga tidak muncul di POS.
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Data produk tidak dihapus permanen agar riwayat transaksi tetap
                terjaga. Anda bisa mengaktifkan kembali produk kapan saja.
              </p>
            </div>
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
                "Ya, Nonaktifkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
