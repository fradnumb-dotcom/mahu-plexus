/* ──────────────────────────────────────────────────────────────────────────
 * Izipay — utilidades y constantes de pago (SOLO BACKEND, plataforma micuentaweb).
 *
 * Fuente única de precios/planes y de las llamadas a la API REST de Izipay.
 * NUNCA se importa desde el frontend (usa Buffer y secretos de entorno).
 *
 * Credenciales (Back Office Vendedor → Claves de API REST):
 *   IZIPAY_USERNAME               → Usuario / shopId        (privado)
 *   IZIPAY_PASSWORD               → Clave de API REST        (privado, también firma IPN)
 *   NEXT_PUBLIC_IZIPAY_PUBLIC_KEY → Clave pública            (la usa el SDK del navegador)
 *   IZIPAY_API_BASE               → endpoint (def. https://api.micuentaweb.pe)
 * ────────────────────────────────────────────────────────────────────────── */

// Montos en céntimos (PEN). La autoridad sobre el precio vive SIEMPRE en backend:
// el cliente solo envía el id del plan, jamás el monto.
export const PLAN_AMOUNTS: Record<string, number> = {
  daily:   990,   // S/ 9.90
  weekly:  2990,  // S/ 29.90
  monthly: 8990,  // S/ 89.90
}

export const PLAN_DAYS: Record<string, number> = {
  daily:   1,
  weekly:  7,
  monthly: 30,
}

export const PLAN_LABEL: Record<string, string> = {
  daily:   "Diario",
  weekly:  "Semanal",
  monthly: "Mensual",
}

// Regla de recurrencia (RFC 5545) por plan, para suscripciones recurrentes de Izipay.
export const PLAN_RRULE: Record<string, string> = {
  daily:   "RRULE:FREQ=DAILY;INTERVAL=1",
  weekly:  "RRULE:FREQ=WEEKLY;INTERVAL=1",
  monthly: "RRULE:FREQ=MONTHLY;INTERVAL=1",
}

export const IZIPAY_API_BASE = process.env.IZIPAY_API_BASE || "https://api.micuentaweb.pe"

export function isValidPlan(plan: unknown): plan is keyof typeof PLAN_AMOUNTS {
  return typeof plan === "string" && plan in PLAN_AMOUNTS
}

/** Header de autenticación básica para la API REST. Null si faltan credenciales. */
export function izipayAuthHeader(): string | null {
  const u = process.env.IZIPAY_USERNAME
  const p = process.env.IZIPAY_PASSWORD
  if (!u || !p) return null
  return `Basic ${Buffer.from(`${u}:${p}`).toString("base64")}`
}

/** Llamada genérica a la API REST V4 de Izipay. Lanza si no hay credenciales. */
export async function izipayApi<T = Record<string, unknown>>(path: string, body: unknown): Promise<T> {
  const auth = izipayAuthHeader()
  if (!auth) throw new Error("IZIPAY_NOT_CONFIGURED")
  const res = await fetch(`${IZIPAY_API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}
