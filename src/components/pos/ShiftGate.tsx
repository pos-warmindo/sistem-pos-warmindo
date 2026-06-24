"use client";

import { useState, useEffect } from "react";
import { useShift } from "@/lib/hooks/useShift";
import ShiftOpenModal from "./ShiftOpenModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ShiftGateProps {
  children: React.ReactNode;
}

export default function ShiftGate({ children }: ShiftGateProps) {
  const { activeShift, isLoading, openShift } = useShift();
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);

  useEffect(() => {
    if (!activeShift && !isLoading) {
      const hasClosedShift = sessionStorage.getItem("shiftClosedThisSession");
      if (!hasClosedShift) {
        setIsOpenModalOpen(true);
      }
    } else {
      setIsOpenModalOpen(false);
    }
  }, [activeShift, isLoading]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 relative">
      {!activeShift && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-sm z-30 relative shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-amber-850 dark:text-amber-300">
                Shift Kasir Ditutup
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                Buka shift baru untuk mulai melayani pesanan dan memproses pembayaran.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
              onClick={() => setIsOpenModalOpen(true)}
            >
              Buka Shift Baru
            </Button>
          </div>
        </div>
      )}
      {children}
      <ShiftOpenModal
        isOpen={isOpenModalOpen}
        onOpenChange={setIsOpenModalOpen}
        onOpenShift={async (modalAwal) => {
          await openShift(modalAwal);
          sessionStorage.removeItem("shiftClosedThisSession");
          setIsOpenModalOpen(false);
        }}
      />
    </div>
  );
}
