import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next.js Middleware — runs on every matched request.
 *
 * Responsibilities:
 * 1. Refresh Supabase auth session tokens (prevents session expiry)
 *
 * Future (Hari 6):
 * 2. Protected route enforcement (/pos → cashier+owner, /dashboard → owner)
 * 3. Redirect unauthenticated users to /auth/login
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (images, SVGs, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
