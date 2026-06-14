import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { PLAN_AMOUNTS, PLAN_LABEL, isValidPlan, izipayApi, izipayAuthHeader } from "../../lib/izipay"
import { resolveSession } from "../../lib/authz"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* ──────────────────────────────────────────────────────────────────────────
 * Integración Izipay — modelo FormToken (plataforma micuentaweb / Lyra).
 * Identidad y negocio se derivan SIEMPRE de la sesión autenticada de Supabase,
 * nunca del cliente. Las llaves privadas viven solo en variables de entorno.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/izipay
 * Cabecera: Authorization: Bearer <access_token de Supabase>
 * Body: { plan: "daily" | "weekly" | "monthly" }
 *
 * Genera un formToken (CreatePayment). El cobro real lo confirma el IPN.
 */
export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json()

    if (!isValidPlan(plan)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const session = await resolveSession(req, supabase)
    if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })
    if (!session.email) {
      return NextResponse.json({ error: "El usuario no tiene correo asociado" }, { status: 400 })
    }

    if (!izipayAuthHeader()) {
      return NextResponse.json(
        { error: "Integración Izipay no configurada. Agrega IZIPAY_USERNAME e IZIPAY_PASSWORD a tu entorno." },
        { status: 503 }
      )
    }

    // orderId único y trazable. business_id + plan viajan en metadata (van firmados
    // dentro del kr-answer del IPN), así el webhook no necesita consultas extra.
    const orderId = `MP-${session.businessId.slice(0, 8)}-${Date.now()}`

    // formAction REGISTER_PAY: cobra el período y tokeniza la tarjeta, dejando lista
    // la base para activar recurrencia automática (CreateSubscription) más adelante.
    const data = await izipayApi<{ status?: string; answer?: Record<string, unknown> }>(
      "/api-payment/V4/Charge/CreatePayment",
      {
        amount: PLAN_AMOUNTS[plan],
        currency: "PEN",
        orderId,
        formAction: "REGISTER_PAY",
        customer: { email: session.email },
        metadata: { business_id: session.businessId, plan },
      }
    )

    const formToken = (data.answer as { formToken?: string } | undefined)?.formToken
    if (data.status !== "SUCCESS" || !formToken) {
      const a = data.answer as { errorMessage?: string; detailedErrorMessage?: string } | undefined
      return NextResponse.json(
        { error: a?.errorMessage || a?.detailedErrorMessage || "No se pudo iniciar el pago. Inténtalo nuevamente." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      formToken,
      publicKey: process.env.NEXT_PUBLIC_IZIPAY_PUBLIC_KEY || "",
      orderId,
      plan,
      label: PLAN_LABEL[plan],
    })
  } catch (error) {
    console.error("IZIPAY ERROR:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * GET /api/izipay  (Cabecera: Authorization: Bearer <token>)
 * Devuelve el estado de suscripción del negocio del usuario autenticado.
 * El business_id se deriva de la sesión; no se acepta desde el cliente.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req, supabase)
    if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })

    const { data, error } = await supabase
      .from("businesses")
      .select("subscription_status, subscription_plan, trial_ends_at, current_period_end, last_payment_at")
      .eq("id", session.businessId)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const now = new Date()
    let status = data?.subscription_status || "none"

    const endDate = data?.current_period_end || data?.trial_ends_at
    if ((status === "trial" || status === "active" || status === "canceled") && endDate && now > new Date(endDate)) {
      status = "expired"
      await supabase.from("businesses").update({ subscription_status: "expired" }).eq("id", session.businessId)
    }

    return NextResponse.json({
      status,
      plan: data?.subscription_plan || null,
      trial_ends_at: data?.trial_ends_at || null,
      current_period_end: data?.current_period_end || null,
      last_payment_at: data?.last_payment_at || null,
      is_active: status === "active" || status === "trial" || status === "canceled",
    })
  } catch (error) {
    console.error("IZIPAY GET ERROR:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
