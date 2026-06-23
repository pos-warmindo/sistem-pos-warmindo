import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — runs on every matched request.
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session tokens (prevents session expiry)
 * 2. Protected route enforcement:
 *    - /cashier/pos  → require authenticated (cashier or owner)
 *    - /owner/dashboard → require owner role only
 *    - /api/*        → require authenticated (except /api/pakasir/webhook)
 *    - /auth/login   → redirect away if already authenticated
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public assets (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
