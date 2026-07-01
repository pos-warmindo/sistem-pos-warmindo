import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-medium tracking-[0.25em] text-primary">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-heading">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Route yang kamu buka tidak tersedia di aplikasi ini.
        </p>
        <div className="mt-6">
          <Link
            href="/auth/login"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Ke Login
          </Link>
        </div>
      </section>
    </main>
  )
}