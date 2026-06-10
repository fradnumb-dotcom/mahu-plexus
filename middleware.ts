import { NextResponse, type NextRequest } from "next/server"

/**
 * Lightweight route protection middleware.
 *
 * Supabase auth tokens live in the browser (localStorage) for this client-side
 * app, so the actual session check happens inside each protected page via
 * supabase.auth.getUser(). This middleware adds an extra layer:
 *  - Security headers on every response
 *  - Basic in-memory rate limiting for API routes
 *
 * It intentionally does NOT redirect based on cookies, because that would
 * conflict with the existing client-side auth flow and could break access.
 */

// ── Simple in-memory rate limiter (per IP, per window) ──────────────
const RATE_LIMIT_WINDOW_MS = 60_000        // 1 minute
const RATE_LIMIT_MAX = 120                 // 120 requests/min per IP for API
const hits = new Map<string, { count: number; reset: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  entry.count++
  if (entry.count > RATE_LIMIT_MAX) return true
  return false
}

// Periodic cleanup to avoid unbounded growth
function cleanup() {
  const now = Date.now()
  for (const [ip, e] of hits) if (now > e.reset) hits.delete(ip)
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit API routes only
  if (pathname.startsWith("/api/")) {
    if (Math.random() < 0.05) cleanup()
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"

    if (rateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en un momento." }),
        { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
      )
    }
  }

  // Security headers for all responses
  const res = NextResponse.next()
  res.headers.set("X-Frame-Options", "SAMEORIGIN")
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("X-DNS-Prefetch-Control", "on")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  return res
}

export const config = {
  // Run on app routes and API, skip static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|apple-icon.png|favicon.svg).*)"],
}
