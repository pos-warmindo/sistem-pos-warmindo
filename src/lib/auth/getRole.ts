import { createClient } from "@/lib/supabase/server";

/**
 * Server-side role detection.
 * Uses get_my_role() RPC which is SECURITY DEFINER — bypasses RLS entirely.
 * Safe to call from Server Components and API routes.
 *
 * Supported roles: 'cashier' | 'owner' | 'admin'
 * - owner:   full access (dashboard, laporan, menu, stok, kelola user)
 * - admin:   partial access (menu, stok, kelola user — no dashboard/laporan)
 * - cashier: POS only
 */
export async function getRole(): Promise<"cashier" | "owner" | "admin" | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data, error } = await supabase.rpc("get_my_role");

    if (error || !data) return null;

    const role = data as string;
    if (role === "cashier" || role === "owner" || role === "admin") return role;

    return null;
  } catch {
    return null;
  }
}
