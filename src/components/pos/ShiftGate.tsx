"use client";

import { useShift } from "@/lib/hooks/useShift";
import ShiftOpenModal from "./ShiftOpenModal";
import { Skeleton } from "@/components/ui/skeleton";

interface ShiftGateProps {
  children: React.ReactNode;
}

export default function ShiftGate({ children }: ShiftGateProps) {
  const { activeShift, isLoading, openShift } = useShift();

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

  if (!activeShift) {
    return (
      <ShiftOpenModal
        isOpen={true}
        onOpenShift={async (modalAwal) => {
          await openShift(modalAwal);
        }}
      />
    );
  }

  return <>{children}</>;
}
