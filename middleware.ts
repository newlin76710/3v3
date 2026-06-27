import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth.js v5 session cookie (HTTP: authjs.session-token, HTTPS: __Secure-authjs.session-token)
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionToken;

  if (!isLoggedIn) {
    if (
      pathname.startsWith("/member") ||
      pathname.startsWith("/admin") ||
      pathname.includes("/register")
    ) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/member/:path*", "/admin/:path*", "/events/:path*/register"],
};
