import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  // 保護會員中心
  if (pathname.startsWith("/member") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 保護後台 - 只有 ADMIN 和 STAFF
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (userRole !== "ADMIN" && userRole !== "STAFF") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/member/:path*", "/admin/:path*", "/events/:path*/register"],
};
