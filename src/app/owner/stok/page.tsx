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
import { Plus, Pencil, Trash, AlertTriangle, Package } from "@/lib/icons";
import { formatRupiah } from "@/lib/utils/format";

// ── Types ─────────────────────────────────────────────────────
type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock_threshold: number;
  cost_per_unit: number;
  is_active: boolean;
};

type MaterialForm = {
  name: string;
  unit: string;
  current_stock: string;
  min_stock_threshold: string;
  cost_per_unit: string;
  is_active: boolean;
};

type RestockForm = {
  quantity: string;
  cost_per_unit: string;
};

const EMPTY_FORM: MaterialForm = {
  name: "", unit: "gram", current_stock: "0",
  min_stock_threshold: "100", cost_per_unit: "0", is_active: true,
};

const EMPTY_RESTOCK: RestockForm = { quantity: "", cost_per_unit: "" };
const UNIT_OPTIONS = ["gram", "ml", "pcs", "liter", "kg", "botol", "sachet"];

// ── Component ─────────────────────────────────────────────────
export default function StokPage() {
  const supabase = createClient();

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // CRUD dialog state
  const [dialogOpen, setDialogOpen]             = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial]   = useState<RawMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);
  const [form, setForm]                         = useState<MaterialForm>(EMPTY_FORM);
  const [isSaving, setIsSaving]                 = useState(false);
  const [isDeleting, setIsDeleting]             = useState(false);

  // Restock dialog state
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [restockTarget, setRestockTarget]         = useState<RawMaterial | null>(null);
  const [restockForm, setRestockForm]             = useState<RestockForm>(EMPTY_RESTOCK);
  const [isRestocking, setIsRestocking]           = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("raw_materials")
      .select("id, name, unit, current_stock, min_stock_threshold, cost_per_unit, is_active")
      .order("name");
    if (error) toast.error("Gagal memuat bahan baku: " + error.message);
    else setMaterials(data ?? []);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  // ── Stock status helper ────────────────────────────────────
  const getStockStatus = (m: RawMaterial) => {
    if (m.current_stock <= 0)                    return "empty";
    if (m.current_stock <= m.min_stock_threshold) return "low";
    return "ok";
  };

  // ── CRUD helpers ──────────────────────────────────────────
  const openAddDialog = () => {
    setEditingMaterial(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (m: RawMaterial) => {
    setEditingMaterial(m);
    setForm({
      name: m.name, unit: m.unit,
      current_stock: String(m.current_stock),
      min_stock_threshold: String(m.min_stock_threshold),
      cost_per_unit: String(m.cost_per_unit),
      is_active: m.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nama bahan baku tidak boleh kosong."); return; }
    if (!form.unit.trim()) { toast.error("Satuan tidak boleh kosong."); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(), unit: form.unit.trim(),
        current_stock: parseFloat(form.current_stock) || 0,
        min_stock_threshold: parseFloat(form.min_stock_threshold) || 0,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        is_active: form.is_active,
      };
      if (editingMaterial) {
        const { error } = await supabase.from("raw_materials").update(payload).eq("id", editingMaterial.id);
        if (error) throw error;
        toast.success(`"${form.name}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase.from("raw_materials").insert(payload);
        if (error) throw error;
        toast.success(`"${form.name}" berhasil ditambahkan.`);
      }
      setDialogOpen(false);
      await fetchMaterials();
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("raw_materials")
        .update({ is_active: false }).eq("id", deletingMaterial.id);
      if (error) throw error;
      toast.success(`"${deletingMaterial.name}" dinonaktifkan.`);
      setDeleteDialogOpen(false);
      await fetchMaterials();
    } catch (err: any) {
      toast.error("Gagal menghapus: " + err.message);
    } finally { setIsDeleting(false); }
  };

  // ── Restock ────────────────────────────────────────────────
  const openRestockDialog = (m: RawMaterial) => {
    setRestockTarget(m);
    setRestockForm({ quantity: "", cost_per_unit: String(m.cost_per_unit) });
    setRestockDialogOpen(true);
  };

  const handleRestock = async () => {
    if (!restockTarget) return;
    const qty = parseFloat(restockForm.quantity);
    if (!restockForm.quantity || isNaN(qty) || qty <= 0) {
      toast.error("Jumlah restock harus lebih dari 0.");
      return;
    }
    setIsRestocking(true);
    try {
      const costPerUnit = parseFloat(restockForm.cost_per_unit) || undefined;
      const { data, error } = await supabase.rpc("restock_raw_material", {
        p_material_id:   restockTarget.id,
        p_quantity:      qty,
        p_cost_per_unit: costPerUnit ?? null,
        p_owner_id:      null,
      });
      if (error) throw error;
      const result = data as any;
      toast.success(
        `Restock berhasil! Stok ${result.material_name}: ${result.stock_before} → ${result.stock_after} ${restockTarget.unit}`
      );
      setRestockDialogOpen(false);
      await fetchMaterials();
    } catch (err: any) {
      console.error("[Restock] Error:", err);
      toast.error("Gagal restock: " + (err.message ?? "Terjadi kesalahan."));
    } finally { setIsRestocking(false); }
  };

  // ── Summary counts ─────────────────────────────────────────
  const emptyCount = materials.filter((m) => m.is_active && m.current_stock <= 0).length;
  const lowCount   = materials.filter((m) => m.is_active && m.current_stock > 0 && m.current_stock <= m.min_stock_threshold).length;
  const okCount    = materials.filter((m) => m.is_active && m.current_stock > m.min_stock_threshold).length;

  // ── Render ─────────────────────────────────────────────────
  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-heading">Kelola Stok Bahan Baku</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor stok dan lakukan restock bahan baku.
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2">
          <Plus className="size-4" /> Tambah Bahan Baku
        </Button>
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{emptyCount}</p>
          <p className="text-xs font-semibold text-red-500 mt-1">Stok Habis</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{lowCount}</p>
          <p className="text-xs font-semibold text-amber-500 mt-1">Stok Rendah</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{okCount}</p>
          <p className="text-xs font-semibold text-green-500 mt-1">Stok Aman</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Memuat data stok...</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Package className="size-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-400">Belum ada bahan baku. Tambahkan bahan baku pertama.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Stok</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Min</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Satuan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Biaya/Unit</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, idx) => {
                  const status = getStockStatus(m);
                  return (
                    <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                      <td className={`px-4 py-3 text-center font-bold ${
                        status === "empty" ? "text-red-600" :
                        status === "low"   ? "text-amber-600" : "text-green-600"
                      }`}>
                        {m.current_stock}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{m.min_stock_threshold}</td>
                      <td className="px-4 py-3 text-center text-slate-500">{m.unit}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatRupiah(m.cost_per_unit)}</td>
                      <td className="px-4 py-3 text-center">
                        {status === "empty" ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold text-[10px]">Habis</Badge>
                        ) : status === "low" ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold text-[10px]">Rendah</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold text-[10px]">Aman</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openRestockDialog(m)}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
                            title="Restock">
                            Restock
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(m)}
                            className="h-8 w-8 p-0 rounded-lg border-slate-200" title="Edit">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setDeletingMaterial(m); setDeleteDialogOpen(true); }}
                            className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50" title="Hapus">
                            <Trash className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
              {editingMaterial ? "Edit Bahan Baku" : "Tambah Bahan Baku"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama <span className="text-red-500">*</span>
              </Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="contoh: Tepung Terigu" className="rounded-xl" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Satuan <span className="text-red-500">*</span>
                </Label>
                <select value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Biaya/Unit (Rp)</Label>
                <Input type="number" value={form.cost_per_unit} min={0}
                  onChange={(e) => setForm((f) => ({ ...f, cost_per_unit: e.target.value }))}
                  className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Stok Awal</Label>
                <Input type="number" value={form.current_stock} min={0}
                  onChange={(e) => setForm((f) => ({ ...f, current_stock: e.target.value }))}
                  className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Batas Minimum</Label>
                <Input type="number" value={form.min_stock_threshold} min={0}
                  onChange={(e) => setForm((f) => ({ ...f, min_stock_threshold: e.target.value }))}
                  className="rounded-xl" />
                <p className="text-[11px] text-slate-400">Alert muncul jika stok ≤ nilai ini.</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Status Aktif</p>
                <p className="text-xs text-slate-400">Bahan baku digunakan dalam resep</p>
              </div>
              <button type="button" role="switch" aria-checked={form.is_active}
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? "bg-orange-500" : "bg-slate-200"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary-hover text-white rounded-xl">
              {isSaving ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : editingMaterial ? "Simpan Perubahan" : "Tambah Bahan Baku"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-bold text-heading">Hapus Bahan Baku</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Bahan baku <span className="font-semibold">"{deletingMaterial?.name}"</span> akan dinonaktifkan.
            </p>
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
              <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Data tidak dihapus permanen agar resep dan riwayat stok tetap terjaga.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600 text-white rounded-xl">
              {isDeleting ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Ya, Nonaktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restock Dialog ── */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-bold text-heading">Restock Bahan Baku</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {restockTarget && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Bahan</p>
                <p className="font-bold text-slate-800 mt-0.5">{restockTarget.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  Stok saat ini:{" "}
                  <span className={`font-semibold ${getStockStatus(restockTarget) === "ok" ? "text-green-600" : getStockStatus(restockTarget) === "low" ? "text-amber-600" : "text-red-600"}`}>
                    {restockTarget.current_stock} {restockTarget.unit}
                  </span>
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Jumlah Restock ({restockTarget?.unit}) <span className="text-red-500">*</span>
              </Label>
              <Input type="number" value={restockForm.quantity} min={0.01} step="0.01" autoFocus
                onChange={(e) => setRestockForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder={`contoh: 500`} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Biaya/Unit (Rp) <span className="text-slate-300 font-normal normal-case">(opsional, perbarui harga)</span>
              </Label>
              <Input type="number" value={restockForm.cost_per_unit} min={0}
                onChange={(e) => setRestockForm((f) => ({ ...f, cost_per_unit: e.target.value }))}
                placeholder="0" className="rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRestockDialogOpen(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleRestock} disabled={isRestocking} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {isRestocking ? <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Konfirmasi Restock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
