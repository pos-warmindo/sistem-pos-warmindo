"use client";

import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash, AlertTriangle, Shield, UserPlus } from "@/lib/icons";

interface ManagedUser {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  role: "cashier" | "owner" | null;
  created_at: string;
}

const EMPTY_FORM = {
  display_name: "",
  email: "",
  password: "",
  phone: "",
  role: "cashier" as "cashier" | "owner",
};

export default function UserManagement() {
  const supabase = createClient();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Logged in User session
  useEffect(() => {
    async function loadCurrentUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    loadCurrentUser();
  }, [supabase]);

  // Load All Users list
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        toast.error("Gagal memuat pengguna: " + (data.error || "Terjadi kesalahan."));
      }
    } catch (error: any) {
      console.error("[UserManagement] Fetch users error:", error);
      toast.error("Gagal memuat daftar pengguna.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddDialog = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (user: ManagedUser) => {
    setEditingUser(user);
    setForm({
      display_name: user.display_name,
      email: user.email || "",
      password: "", // password is not editable
      phone: user.phone || "",
      role: (user.role as "cashier" | "owner") || "cashier",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (user: ManagedUser) => {
    if (currentUser && user.id === currentUser.id) {
      toast.error("Anda tidak dapat menghapus akun Anda sendiri.");
      return;
    }
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      toast.error("Nama wajib diisi.");
      return;
    }

    if (!editingUser) {
      if (!form.email.trim()) {
        toast.error("Email wajib diisi.");
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        toast.error("Format email tidak valid.");
        return;
      }
      if (!form.password || form.password.length < 6) {
        toast.error("Password minimal 6 karakter.");
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingUser) {
        // Update User Profile/Role
        const res = await fetch("/api/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: editingUser.id,
            display_name: form.display_name.trim(),
            phone: form.phone.trim() || undefined,
            role: form.role,
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(`Pengguna "${form.display_name}" berhasil diperbarui.`);
          setDialogOpen(false);
          await fetchUsers();
        } else {
          toast.error(data.error || "Gagal memperbarui pengguna.");
        }
      } else {
        // Create New User Account
        const res = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: form.display_name.trim(),
            email: form.email.trim(),
            password: form.password,
            phone: form.phone.trim() || undefined,
            role: form.role,
          }),
        });

        const data = await res.json();
        if (data.success) {
          toast.success(`Pengguna "${form.display_name}" berhasil dibuat.`);
          setDialogOpen(false);
          await fetchUsers();
        } else {
          toast.error(data.error || "Gagal membuat pengguna.");
        }
      }
    } catch (err: any) {
      console.error("[UserManagement] Save error:", err);
      toast.error("Gagal menyimpan pengguna.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: deletingUser.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Pengguna "${deletingUser.display_name}" berhasil dihapus.`);
        setDeleteDialogOpen(false);
        await fetchUsers();
      } else {
        toast.error(data.error || "Gagal menghapus pengguna.");
      }
    } catch (err: any) {
      console.error("[UserManagement] Delete error:", err);
      toast.error("Gagal menghapus pengguna.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Info & Add Button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {users.length} pengguna terdaftar
        </p>
        <Button
          onClick={openAddDialog}
          className="bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl gap-2"
        >
          <UserPlus className="size-4" />
          Tambah User
        </Button>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p>Memuat daftar pengguna...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Belum ada user terdaftar.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">No. Telepon</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Role</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Tanggal Dibuat</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr
                  key={user.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {user.display_name}
                    {currentUser && user.id === currentUser.id && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 ml-2 font-normal">
                        Anda
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.email || "-"}</td>
                  <td className="px-4 py-3 text-center text-slate-500 font-mono text-xs">{user.phone || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {user.role === "owner" ? (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 font-semibold gap-1">
                        Owner
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 font-semibold">
                        Cashier
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                        className="h-8 w-8 p-0 rounded-lg border-slate-200"
                        title="Edit User"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDeleteDialog(user)}
                        disabled={currentUser && user.id === currentUser.id}
                        className="h-8 w-8 p-0 rounded-lg border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Hapus User"
                      >
                        <Trash className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading">
              {editingUser ? "Edit Akses User" : "Tambah Akun User Baru"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Display Name */}
            <div className="space-y-1.5">
              <Label htmlFor="display-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="display-name"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
                className="rounded-xl"
                autoFocus
              />
            </div>

            {/* Email (Disabled when editing) */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Email {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@domain.com"
                className="rounded-xl"
                disabled={!!editingUser}
              />
              {editingUser && (
                <p className="text-[10px] text-slate-400">Email tidak dapat diubah setelah pendaftaran.</p>
              )}
            </div>

            {/* Password (Only when adding) */}
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimal 6 karakter"
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                No. Telepon / WhatsApp
              </Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="contoh: 081234567890"
                className="rounded-xl"
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hak Akses / Role
              </Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "cashier" | "owner" }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="cashier">Cashier (Kasir)</option>
                <option value="owner">Owner (Pemilik)</option>
              </select>
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
              ) : editingUser ? (
                "Simpan Perubahan"
              ) : (
                "Tambah User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-heading flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Hapus Akun User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus akun <strong>{deletingUser?.display_name}</strong>?
            </p>
            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
              Tindakan ini permanen dan akan menghapus akses masuk (email: {deletingUser?.email}) dari aplikasi POS.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl"
              disabled={isDeleting}
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
                "Hapus Akun"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
