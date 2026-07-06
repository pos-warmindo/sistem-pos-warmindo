"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "@/lib/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center bg-slate-50 p-4">
      <div className="flex max-w-md flex-col items-center justify-center space-y-4 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="size-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-500">
          Maaf, terjadi kesalahan tak terduga pada sistem. Silakan coba muat ulang halaman.
        </p>
        <Button
          onClick={() => reset()}
          className="mt-4 bg-primary text-white hover:bg-primary-hover rounded-xl"
        >
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
