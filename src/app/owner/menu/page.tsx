import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CategoryManagement from "@/components/dashboard/CategoryManagement";
import ProductManagement from "@/components/dashboard/ProductManagement";
import ModifierManagement from "@/components/dashboard/ModifierManagement";

export default function MenuPage() {
  return (
    <main className="p-4 md:p-6 w-full max-w-full overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Kelola Menu</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur produk, kategori, serta varian/topping tambahan yang tersedia di POS.
        </p>
      </div>

      <Tabs defaultValue="produk" className="w-full">
        <TabsList className="bg-slate-100/80 p-2 md:py-6 rounded-xl mb-4 flex w-full overflow-x-auto justify-start md:justify-center [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value="produk" className="rounded-lg font-semibold text-base px-4 py-3 md:px-5 md:py-4 whitespace-nowrap shrink-0">
            Produk
          </TabsTrigger>
          <TabsTrigger value="modifier" className="rounded-lg font-semibold text-base px-4 py-3 md:px-5 md:py-4 whitespace-nowrap shrink-0">
            Varian / Topping
          </TabsTrigger>
          <TabsTrigger value="kategori" className="rounded-lg font-semibold text-base px-4 py-3 md:px-5 md:py-4 whitespace-nowrap shrink-0">
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
