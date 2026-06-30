import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Helper — queries user role using the SECURITY DEFINER function
 * get_my_role() which bypasses RLS and returns the role name directly.
 *
 * Returns 'cashier' | 'owner' | null
 */
async function getUserRole(
  supabase: ReturnType<typeof createServerClient>
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_my_role");
  if (error || !data) return null;
  return data as string;
}

/**
 * Refreshes the Supabase auth session and enforces role-based route protection.
 *
 * Route Protection Rules:
 * - /cashier/pos/*      → require authenticated (cashier OR owner)
 * - /owner/dashboard/*  → require owner role ONLY
 * - /api/*              → require authenticated (except /api/pakasir/webhook)
 * - /auth/login         → redirect away if already authenticated
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

  // Always call getUser() to refresh the session token.
  // Errors here (e.g. refresh_token_not_found) are expected when the session
  // has expired — simply treat as unauthenticated (user = null).
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

  const { pathname } = new URL(request.url);

  const isPosRoute       = pathname.startsWith("/cashier/pos");
  const isDashboardRoute = pathname.startsWith("/owner/dashboard");
  const isApiRoute       = pathname.startsWith("/api");
  const isWebhook        = pathname === "/api/pakasir/webhook";
  const isLoginRoute     = pathname.startsWith("/auth/login");

  // ── Protected routes ───────────────────────────────────────────
  if (isPosRoute || isDashboardRoute || (isApiRoute && !isWebhook)) {
    // Not logged in → redirect to login
    if (!user) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Logged in → check role for routes
    if (isDashboardRoute) {
      const role = await getUserRole(supabase);
      if (role !== "owner") {
        return NextResponse.redirect(new URL("/cashier/pos", request.url));
      }
    }

    if (isPosRoute) {
      const role = await getUserRole(supabase);
      if (role !== "cashier") {
        return NextResponse.redirect(new URL("/owner/dashboard", request.url));
      }
    }
  }

  // ── Redirect already-authenticated users away from login ───────
  // NOTE: We do NOT redirect here anymore — the login page itself
  // shows a "you are already logged in" banner with a logout button.
  // This prevents the loop where user can't switch accounts.
  // The redirect-after-login is handled client-side in the login form.

  return supabaseResponse;
}
