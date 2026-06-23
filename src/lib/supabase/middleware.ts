import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the user's Supabase auth session on every request and
 * enforces role-based route protection.
 *
 * Route Protection Rules:
 * - /pos/*          → require authenticated (cashier or owner)
 * - /dashboard/*    → require owner role only
 * - /api/*          → require authenticated (except /api/pakasir/webhook)
 * - /auth/login     → redirect to respective panel if already authenticated
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() sends a request to Supabase Auth server every time
  // to revalidate the Auth token. This is critical for security.
  const { data: { user } } = await supabase.auth.getUser();

  const url = new URL(request.url);
  const path = url.pathname;

  const isPosRoute = path.startsWith("/pos");
  const isDashboardRoute = path.startsWith("/dashboard");
  const isApiRoute = path.startsWith("/api");
  const isPakasirWebhook = path === "/api/pakasir/webhook";
  const isLoginRoute = path.startsWith("/auth/login");

  // Route protection logic
  if (isPosRoute || isDashboardRoute || (isApiRoute && !isPakasirWebhook)) {
    if (!user) {
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      const redirectUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Query user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select(`
        roles (
          name
        )
      `)
      .eq("user_id", user.id)
      .single();

    const role = (roleData?.roles as any)?.name;

    // Owner checks
    if (isDashboardRoute && role !== "owner") {
      const redirectUrl = new URL("/pos", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // General cashier/owner checks for POS
    if (isPosRoute && role !== "cashier" && role !== "owner") {
      const redirectUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from the login page
  if (isLoginRoute && user) {
    const { data: roleData } = await supabase
      .from("user_roles")
      .select(`
        roles (
          name
        )
      `)
      .eq("user_id", user.id)
      .single();

    const role = (roleData?.roles as any)?.name;

    if (role === "owner") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else if (role === "cashier") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }
  }

  return supabaseResponse;
}

