import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryManagement from "@/components/dashboard/CategoryManagement";
import ProductManagement from "@/components/dashboard/ProductManagement";
import ModifierManagement from "@/components/dashboard/ModifierManagement";

export default function MenuPage() {
  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Kelola Menu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur produk, kategori, serta varian/topping tambahan yang tersedia di POS.
        </p>
      </div>

      <Tabs defaultValue="produk">
        <TabsList className="bg-slate-100/80 py-6 rounded-xl mb-4">
          <TabsTrigger value="produk"   className="rounded-lg font-semibold text-md px-5 py-4">
            Produk
          </TabsTrigger>
          <TabsTrigger value="modifier" className="rounded-lg font-semibold text-md px-5 py-4">
            Varian / Topping
          </TabsTrigger>
          <TabsTrigger value="kategori" className="rounded-lg font-semibold text-md px-5 py-4">
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
