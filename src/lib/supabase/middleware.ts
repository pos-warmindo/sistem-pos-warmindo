import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the user's Supabase auth session on every request.
 *
 * This function is called by the Next.js middleware to ensure
 * that expired sessions are automatically refreshed, keeping
 * users logged in without interruption.
 *
 * It reads auth cookies, calls supabase.auth.getUser() to
 * trigger a token refresh if needed, and writes updated
 * cookies back to the response.
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

  // IMPORTANT: Do NOT use supabase.auth.getSession() here.
  // getUser() sends a request to Supabase Auth server every time
  // to revalidate the Auth token, while getSession() does not.
  // This is critical for security in server-side contexts.
  await supabase.auth.getUser();

  return supabaseResponse;
}
