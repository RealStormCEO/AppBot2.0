// middleware.js
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const isAuth = !!token
  const isLoginPage = req.nextUrl.pathname.startsWith("/login")

  if (!isAuth && !isLoginPage) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = "/login"
    return NextResponse.redirect(loginUrl)
  }

  if (isAuth && isLoginPage) {
    const dashboardUrl = req.nextUrl.clone()
    dashboardUrl.pathname = "/dashboard"
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

// ✅ THIS is where the matcher config should live
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
}
