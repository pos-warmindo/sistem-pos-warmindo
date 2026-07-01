import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth/getRole";
import OwnerLayoutClient from "./layout-client";

/**
 * Server Component wrapper — role guard for the entire /owner/* subtree.
 *
 * Layer 1: proxy.ts middleware (runs first, redirects unauthenticated users)
 * Layer 2: This layout (re-verifies role server-side as defense in depth)
 *
 * Uses try/catch so a getRole() failure never cascades to crash other routes.
 */
export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: string | null = null;

  try {
    role = await getRole();
  } catch {
    // getRole() failed (e.g. no session, DB error) — treat as unauthenticated
    redirect("/auth/login");
  }

  if (role !== "owner") {
    redirect(role === "cashier" ? "/cashier/pos" : "/auth/login");
  }

  return <OwnerLayoutClient>{children}</OwnerLayoutClient>;
}
