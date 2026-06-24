"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database";

export type Shift = Database["public"]["Tables"]["shifts"]["Row"];

interface ShiftContextType {
  activeShift: Shift | null;
  isLoading: boolean;
  openShift: (modalAwal: number) => Promise<Shift>;
  closeShift: (cashCounted: number, notes?: string | null) => Promise<Shift>;
  refreshShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveShift = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setActiveShift(null);
        return;
      }

      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("opened_by", user.id)
        .eq("status", "OPEN")
        .maybeSingle();

      if (error) {
        console.error("[useShift] Error fetching active shift:", error);
        setActiveShift(null);
      } else {
        setActiveShift(data);
      }
    } catch (err) {
      console.error("[useShift] Unexpected error:", err);
      setActiveShift(null);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const openShift = useCallback(
    async (modalAwal: number) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Pengguna tidak terautentikasi.");
      }

      const { data, error } = await supabase
        .from("shifts")
        .insert({
          opened_by: user.id,
          modal_awal: modalAwal,
          status: "OPEN",
        })
        .select()
        .single();

      if (error) {
        console.error("[useShift] Error opening shift:", error);
        throw error;
      }

      setActiveShift(data);
      return data;
    },
    [supabase]
  );

  const closeShift = useCallback(
    async (cashCounted: number, notes: string | null = null) => {
      if (!activeShift) {
        throw new Error("Tidak ada shift aktif yang bisa ditutup.");
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Pengguna tidak terautentikasi.");
      }

      const { data, error } = await supabase
        .from("shifts")
        .update({
          status: "CLOSED",
          cash_counted: cashCounted,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          notes: notes,
        })
        .eq("id", activeShift.id)
        .select()
        .single();

      if (error) {
        console.error("[useShift] Error closing shift:", error);
        throw error;
      }

      setActiveShift(null);
      return data;
    },
    [activeShift, supabase]
  );

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        isLoading,
        openShift,
        closeShift,
        refreshShift: fetchActiveShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
}
