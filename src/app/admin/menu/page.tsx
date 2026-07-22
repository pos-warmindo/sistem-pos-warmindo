import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryManagement from "@/components/dashboard/CategoryManagement";
import ProductManagement from "@/components/dashboard/ProductManagement";
import ModifierManagement from "@/components/dashboard/ModifierManagement";

export default function AdminMenuPage() {
  return (
    // [KUSTOMISASI KONTAINER HALAMAN ADMIN MENU] padding, lebar, dan overflow
    <main className="p-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="mb-6">
        {/* [KUSTOMISASI JUDUL HALAMAN] text-heading = warna judul halaman */}
        <h1 className="text-2xl font-bold text-heading">Kelola Menu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur produk, kategori, serta varian/topping tambahan yang tersedia di POS.
        </p>
      </div>

      <Tabs defaultValue="produk" className="w-full">
        {/* [KUSTOMISASI TABS MENU] */}
        <TabsList variant="line" className="w-full justify-start md:justify-center border-b border-slate-200/60 pb-0 rounded-none h-auto gap-8 px-2 bg-transparent mb-6">
          <TabsTrigger
            value="produk"
            className="pb-3 pt-2 px-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all rounded-none bg-transparent data-active:!bg-transparent data-active:!text-primary data-active:after:!bg-primary data-active:shadow-none"
          >
            Produk
          </TabsTrigger>
          <TabsTrigger
            value="modifier"
            className="pb-3 pt-2 px-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all rounded-none bg-transparent data-active:!bg-transparent data-active:!text-primary data-active:after:!bg-primary data-active:shadow-none"
          >
            Varian / Topping
          </TabsTrigger>
          <TabsTrigger
            value="kategori"
            className="pb-3 pt-2 px-1 text-sm font-bold text-slate-500 hover:text-slate-800 transition-all rounded-none bg-transparent data-active:!bg-transparent data-active:!text-primary data-active:after:!bg-primary data-active:shadow-none"
          >
            Kategori
          </TabsTrigger>
        </TabsList>

        <TabsContent value="produk">
          <ProductManagement />
        </TabsContent>

        <TabsContent value="modifier">
          <ModifierManagement />
        </TabsContent>

        <TabsContent value="kategori">
          <CategoryManagement />
        </TabsContent>
      </Tabs>
    </main>
  );
}
