"use client"

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>) {
  return (
    <html lang="id">
      <body className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-slate-900">
        <main className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium tracking-widest text-orange-500">
            ERROR
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            Terjadi kesalahan aplikasi
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {error.message ?? "Terjadi kesalahan yang tidak terduga."}
          </p>
          {error.digest && (
            <p className="mt-1 font-mono text-xs text-slate-400">
              ID: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Coba lagi
          </button>
        </main>
      </body>
    </html>
  )
}
