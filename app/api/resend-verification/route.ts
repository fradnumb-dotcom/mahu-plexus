import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

/**
 * POST /api/resend-verification
 * Body: { email: string, redirect_to?: string }
 * Resends the signup confirmation email for an unverified account.
 */
export async function POST(req: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      return json({ error: "Configuración de Supabase incompleta" }, 500)
    }

    const body = await req.json()
    const email = String(body.email || "").trim().toLowerCase()
    const redirectTo = String(body.redirect_to || "").trim()

    if (!email || !email.includes("@")) {
      return json({ error: "Ingresa un correo válido" }, 400)
    }

    // Use anon client to trigger resend (respects Supabase rate limits)
    const supabase = createClient(url, anon)
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    })

    if (error) {
      const m = (error.message || "").toLowerCase()
      // Already confirmed → friendly message
      if (m.includes("already") || m.includes("confirmed")) {
        return json({ error: "Este correo ya está verificado. Puedes iniciar sesión." }, 400)
      }
      if (m.includes("rate") || m.includes("limit") || m.includes("seconds")) {
        return json({ error: "Espera unos segundos antes de solicitar otro correo." }, 429)
      }
      return json({ error: "No se pudo reenviar el correo. Intenta más tarde." }, 400)
    }

    return json({ success: true, message: "Correo de verificación reenviado." })
  } catch {
    return json({ error: "Error interno del servidor" }, 500)
  }
}
