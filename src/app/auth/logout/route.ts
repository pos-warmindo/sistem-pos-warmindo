import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /auth/logout
 * Signs out the current user and redirects to login page.
 * Called from the logout button in AppNavbar.
 */
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
  );
}
