export default function CashierPosPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium tracking-[0.25em] text-primary">
          CASHIER
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-heading">POS Kasir</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Halaman ini adalah tujuan login untuk role kasir. Konten POS utama bisa
          diisi pada tahap berikutnya.
        </p>
      </section>
    </main>
  )
}