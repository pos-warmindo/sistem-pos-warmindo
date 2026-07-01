import UserManagement from "@/components/dashboard/UserManagement";

export const metadata = {
  title: "Kelola User | WP2 POS Owner",
  description: "Buat akun baru dan atur hak akses pengguna.",
};

export default function UsersPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Kelola User</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buat akun baru dan atur hak akses pengguna.
        </p>
      </div>

      <UserManagement />
    </main>
  );
}
