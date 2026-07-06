"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "@/lib/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-4">
          <div className="flex max-w-md flex-col items-center justify-center space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Error Fatal Sistem</h2>
            <p className="text-sm text-slate-500">
              Terjadi kesalahan kritikal pada aplikasi. Silakan coba kembali.
            </p>
            <Button
              onClick={() => reset()}
              className="mt-4 bg-primary text-white hover:bg-primary-hover rounded-xl"
            >
              Muat Ulang
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
