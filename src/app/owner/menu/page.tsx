import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryManagement from "@/components/dashboard/CategoryManagement";

export default function MenuPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Kelola Menu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur produk dan kategori yang tersedia di POS.
        </p>
      </div>

      <Tabs defaultValue="produk">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="produk" className="rounded-lg font-semibold text-sm px-5 py-2">
            Produk
          </TabsTrigger>
          <TabsTrigger value="kategori" className="rounded-lg font-semibold text-sm px-5 py-2">
            Kategori
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produk">
          {/* 8B.3 — dikerjakan pada task berikutnya */}
          <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
            Manajemen Produk (coming soon — Section 8B.3)
          </div>
        </TabsContent>

        <TabsContent value="kategori">
          <CategoryManagement />
        </TabsContent>
      </Tabs>
    </main>
  );
}
