/**
 * Returns the canonical application URL for building auth redirect links.
 *
 * Priority:
 *  1. NEXT_PUBLIC_APP_URL (set this in production / Vercel)
 *  2. window.location.origin (browser fallback)
 *  3. "" (server fallback — Supabase will use its configured Site URL)
 *
 * This guarantees verification & password-reset links never point to localhost
 * in production, as long as NEXT_PUBLIC_APP_URL is configured.
 */
export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL
  if (envUrl && envUrl.trim()) return envUrl.trim().replace(/\/+$/, "")
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  return ""
}

/** Build an absolute redirect URL for an auth flow path (e.g. "/login"). */
export function authRedirect(path = "/login"): string {
  const base = getAppUrl()
  const clean = path.startsWith("/") ? path : `/${path}`
  return base ? `${base}${clean}` : clean
}
