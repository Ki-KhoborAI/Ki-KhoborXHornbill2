import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAdminSessionFromCookieHeader } from "./lib/admin/auth/guard";

/**
 * Coarse access gate for admin UI routes.
 * Not the security boundary — protected layouts and every /api/admin handler
 * must independently verify the session before sensitive work.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  const cookieHeader = request.headers.get("cookie");
  const session = await getAdminSessionFromCookieHeader(cookieHeader);

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
