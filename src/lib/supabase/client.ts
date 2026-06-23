import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in Browser/Client Components.
 *
 * This client automatically handles:
 * - Session management via cookies
 * - Token refresh on expiry
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.from('table').select();
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
