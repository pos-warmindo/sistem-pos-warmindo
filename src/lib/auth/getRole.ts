import { createClient } from "@/lib/supabase/server";

/**
 * Server-side role detection.
 * Uses get_my_role() RPC which is SECURITY DEFINER — bypasses RLS entirely.
 * Safe to call from Server Components and API routes.
 */
export async function getRole(): Promise<"cashier" | "owner" | "admin" | null> {
  try {
    const supabase = await createClient();

    // First verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    // Use SECURITY DEFINER RPC — bypasses RLS, no circular dependency
    const { data, error } = await supabase.rpc("get_my_role");

    if (error || !data) return null;

    const role = data as string;
    if (role === "cashier" || role === "owner" || role === "admin") return role;

    return null;
  } catch {
    return null;
  }
}
