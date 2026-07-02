import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper — queries user role using the SECURITY DEFINER function
 * get_my_role() which bypasses RLS and returns the role name directly.
 *
 * Returns 'cashier' | 'owner' | 'admin' | null
 */
async function getUserRole(
  supabase: ReturnType<typeof createServerClient>
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error || !data) return null;
  return data as string;
}

/**
 * Route Protection Rules:
 *
 * /cashier/pos          → cashier only
 * /owner/dashboard      → owner only
 * /owner/laporan        → owner only
 * /owner/menu           → owner + admin
 * /owner/stok           → owner + admin
 * /owner/users          → owner + admin
 * /api/*                → authenticated (except /api/pakasir/webhook)
 *
 * Login redirect after auth:
 *   owner   → /owner/dashboard
 *   admin   → /owner/menu
 *   cashier → /cashier/pos
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const { pathname } = new URL(request.url);

  const isPosRoute       = pathname.startsWith("/cashier/pos");
  const isOwnerRoute     = pathname.startsWith("/owner");
  const isDashboardRoute = pathname.startsWith("/owner/dashboard");
  const isLaporanRoute   = pathname.startsWith("/owner/laporan");
  // Routes accessible by both owner AND admin
  const isSharedOwnerRoute =
    pathname.startsWith("/owner/menu") ||
    pathname.startsWith("/owner/stok") ||
    pathname.startsWith("/owner/users");
  const isApiRoute  = pathname.startsWith("/api");
  const isWebhook   = pathname === "/api/pakasir/webhook";

  const isProtected = isPosRoute || isOwnerRoute || (isApiRoute && !isWebhook);

  if (!isProtected) return supabaseResponse;

  // Not logged in
  if (!user) {
    if (isApiRoute) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Logged in — check role
  const role = await getUserRole(supabase);

  // /owner/dashboard — owner only
  if (isDashboardRoute) {
    if (role === "owner") return supabaseResponse;
    if (role === "admin") return NextResponse.redirect(new URL("/owner/menu", request.url));
    return NextResponse.redirect(new URL("/cashier/pos", request.url));
  }

  // /owner/laporan — owner only
  if (isLaporanRoute) {
    if (role === "owner") return supabaseResponse;
    if (role === "admin") return NextResponse.redirect(new URL("/owner/menu", request.url));
    return NextResponse.redirect(new URL("/cashier/pos", request.url));
  }

  // /owner/menu, /owner/stok, /owner/users — owner + admin
  if (isSharedOwnerRoute) {
    if (role === "owner" || role === "admin") return supabaseResponse;
    return NextResponse.redirect(new URL("/cashier/pos", request.url));
  }

  // Any other /owner/* — owner only
  if (isOwnerRoute) {
    if (role === "owner") return supabaseResponse;
    if (role === "admin") return NextResponse.redirect(new URL("/owner/menu", request.url));
    return NextResponse.redirect(new URL("/cashier/pos", request.url));
  }

  // /cashier/pos — cashier only
  if (isPosRoute) {
    if (role === "cashier") return supabaseResponse;
    if (role === "admin") return NextResponse.redirect(new URL("/owner/menu", request.url));
    return NextResponse.redirect(new URL("/owner/dashboard", request.url));
  }

  return supabaseResponse;
}
