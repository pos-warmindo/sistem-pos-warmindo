import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Admin Supabase client — uses SERVICE_ROLE_KEY.
 * ONLY use in server-side API routes.
 * ⛔ NEVER expose to client-side or browser bundles.
 *
 * Bypasses RLS — use only for privileged operations like
 * creating/deleting auth users.
 */
export function createAdminClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}
