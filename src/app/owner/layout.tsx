import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth/getRole";
import OwnerLayoutClient from "./layout-client";

/**
 * Server Component wrapper — role guard for the entire /owner/* subtree.
 *
 * Middleware (src/lib/supabase/middleware.ts) is the FIRST layer:
 *   → redirects unauthenticated users to /auth/login
 *   → redirects non-owner roles to /cashier/pos
 *
 * This Server Component is the SECOND layer (defense in depth):
 *   → re-verifies the role server-side before rendering any owner UI
 *   → protects against middleware bypass (e.g., direct fetch, misconfigured matcher)
 */
export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getRole();

  if (role !== "owner") {
    // Not owner: middleware should have caught this, but guard here too
    redirect(role === "cashier" ? "/cashier/pos" : "/auth/login");
  }

  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
