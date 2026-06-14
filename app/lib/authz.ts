import type { SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

/* Autorización server-side para rutas de pago. La identidad y el negocio se
 * derivan SIEMPRE de la sesión autenticada de Supabase (Bearer token), nunca
 * de datos enviados por el cliente. */

export type SessionResult =
  | { ok: false; status: number; error: string }
  | { ok: true; userId: string; email: string; businessId: string }

export async function resolveSession(req: NextRequest, supabase: SupabaseClient): Promise<SessionResult> {
  const authHeader = req.headers.get("authorization") || ""
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!token) return { ok: false, status: 401, error: "No autenticado" }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { ok: false, status: 401, error: "Sesión inválida o expirada" }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("business_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.business_id) {
    return { ok: false, status: 403, error: "El usuario no tiene un negocio asociado" }
  }
  return { ok: true, userId: user.id, email: user.email || "", businessId: profile.business_id }
}
