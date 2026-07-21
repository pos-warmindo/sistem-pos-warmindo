"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/error";
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
import { Plus, Pencil, Trash, AlertTriangle, FolderOpen } from "@/lib/icons";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type FormState = {
  name: string;
  sort_order: number;
  is_active: boolean;
};

const EMPTY_FORM: FormState = { name: "", sort_order: 0, is_active: true };

export default function CategoryManagement() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [hasActiveProducts, setHasActiveProducts] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch categories ──────────────────────────────────────────
  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, sort_order, is_active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error("Gagal memuat kategori: " + error.message);
    } else {
      setCategories(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  // ── Open Tambah dialog ────────────────────────────────────────
  const openAddDialog = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  // ── Open Edit dialog ──────────────────────────────────────────
  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, sort_order: cat.sort_order, is_active: cat.is_active });
    setDialogOpen(true);
  };

  // ── Open Delete dialog ────────────────────────────────────────
  const openDeleteDialog = async (cat: Category) => {
    setDeletingCategory(cat);
    setHasActiveProducts(false);

    // Check if category has active products
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id)
      .eq("is_active", true);

    setHasActiveProducts((count ?? 0) > 0);
    setDeleteDialogOpen(true);
  };

  // ── Save (INSERT or UPDATE) ───────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama kategori tidak boleh kosong.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        // UPDATE
        const { error } = await supabase
          .from("categories")
          .update({
            name: form.name.trim(),
            sort_order: form.sort_order,
            is_active: form.is_active,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success(`Kategori "${form.name}" berhasil diperbarui.`);
      } else {
        // INSERT
        const { error } = await supabase
          .from("categories")
          .insert({
            name: form.name.trim(),
            sort_order: form.sort_order,
            is_active: form.is_active,
          });

        if (error) throw error;
        toast.success(`Kategori "${form.name}" berhasil ditambahkan.`);
      }

      setDialogOpen(false);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("[CategoryManagement] Save error:", err);
      const isUniqueViolation = typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505";
      if (isUniqueViolation) {
        toast.error("Nama kategori sudah digunakan. Gunakan nama lain.");
      } else {
        toast.error("Gagal menyimpan: " + getErrorMessage(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", deletingCategory.id);

      if (error) throw error;
      toast.success(`Kategori "${deletingCategory.name}" dihapus.`);
      setDeleteDialogOpen(false);
      await fetchCategories();
    } catch (err: unknown) {
      console.error("[CategoryManagement] Delete error:", err);
      toast.error("Gagal menghapus: " + getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} kategori terdaftar
        </p>
        <Button
          onClick={openAddDialog}
          className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2"
        >
          <Plus className="size-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {/* Mobile Loading Skeleton */}
            <div className="md:hidden space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-4 border border-slate-100 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-8 w-full rounded-lg" />
                </div>
              ))}
            </div>
            {/* Desktop Loading Skeleton */}
            <div className="hidden md:block space-y-3">
              <div className="flex gap-4 pb-2 border-b border-slate-100">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-20 text-center mx-auto" />
                <Skeleton className="h-4 w-20 text-center" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center py-3 border-b border-slate-50 last:border-0">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                  <Skeleton className="h-6 w-16 rounded-full mx-auto" />
                  <Skeleton className="h-8 w-20 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl">
            <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 mb-4 animate-pulse">
              <FolderOpen className="size-8 text-slate-300 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-heading">Belum Ada Kategori</h3>
            <p className="text-xs text-muted-foreground max-w-[280px] mt-1 leading-relaxed">
              Anda belum menambahkan kategori menu. Buat kategori sekarang untuk mengelompokkan hidangan Anda.
            </p>
            <Button
              onClick={openAddDialog}
              className="mt-5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg gap-2 text-xs py-2 px-4 shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
            >
              <Plus className="size-3.5" />
              Tambah Kategori Pertama
            </Button>
          </div>
        ) : (
          <>
            {/* ── Mobile Layout (Cards) ── */}
            <div className="md:hidden divide-y divide-slate-100">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{cat.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Urutan Tampil: {cat.sort_order}</p>
                    </div>
                    <div>
                      {cat.is_active ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold text-[10px] px-2 py-0.5">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 border-slate-200 font-semibold text-[10px] px-2 py-0.5"
                        >
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-50 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(cat)}
                      className="h-8 w-8 p-0 rounded-lg border-slate-200"
                      title="Edit"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDeleteDialog(cat)}
                      className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      title="Hapus"
                    >
                      <Trash className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop Layout (Traditional Table) ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Urutan</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat, idx) => (
                    <tr
                      key={cat.id}
                      className={`border-b border-slate-100/60 last:border-0 hover:bg-slate-50/70 transition-colors duration-150 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{cat.sort_order}</td>
                      <td className="px-4 py-3 text-center">
                        {cat.is_active ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 border-slate-200 font-semibold">
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(cat)}
                            className="h-8 w-8 p-0 rounded-lg border-slate-200"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(cat)}
                            className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
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
          </>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              {editingCategory ? "Edit Kategori" : "Tambah Kategori"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="contoh: Makanan, Minuman, Topping"
                className="rounded-xl"
                autoFocus
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-order" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Urutan Tampil
              </Label>
              <Input
                id="cat-order"
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))
                }
                className="rounded-xl"
                min={0}
              />
              <p className="text-[11px] text-slate-400">
                Angka lebih kecil tampil lebih awal. Default: 0.
              </p>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Status Aktif</p>
                <p className="text-xs text-slate-400">Kategori ditampilkan di POS</p>
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
              ) : editingCategory ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Kategori"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              Hapus Kategori
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus kategori{" "}
              <span className="font-semibold text-slate-800">
                "{deletingCategory?.name}"
              </span>
              ?
            </p>

            {hasActiveProducts && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  Kategori ini masih memiliki produk aktif. Menghapus kategori akan
                  melepas relasi produk dari kategori ini (category_id menjadi NULL).
                  Produk tidak akan ikut terhapus.
                </p>
              </div>
            )}
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
