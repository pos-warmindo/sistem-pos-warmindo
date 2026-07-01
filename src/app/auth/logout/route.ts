import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /auth/logout
 * Signs out the current user and redirects to login page.
 * Called from the logout button in AppNavbar.
 */
export async function GET() {
  const supabase = await createClient();

  // Get current user session
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // 1. Fetch active shift for the user
    const { data: activeShift } = await supabase
      .from("shifts")
      .select("id, modal_awal, total_cash_sales")
      .eq("opened_by", user.id)
      .eq("status", "OPEN")
      .maybeSingle();

    if (activeShift) {
      // 2. Compute expected cash to close shift cleanly (0 variance)
      const expected = Number(activeShift.modal_awal) + Number(activeShift.total_cash_sales);
      
      await supabase
        .from("shifts")
        .update({
          status: "CLOSED",
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          cash_counted: expected,
          notes: "Sistem: Auto-tutup saat logout",
        })
        .eq("id", activeShift.id);
    }
  }

  // 3. Clear auth session and redirect
  await supabase.auth.signOut();
  return NextResponse.redirect(
    new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
  );
}
