import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Culqi configuration (set these in .env.local when ready)
// CULQI_PUBLIC_KEY=pk_live_...
// CULQI_SECRET_KEY=sk_live_...

const PLAN_AMOUNTS: Record<string, number> = {
  weekly: 2990,   // S/ 29.90 in centavos
  monthly: 8990,  // S/ 89.90 in centavos
}

const PLAN_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
}

/**
 * POST /api/culqi
 * Body: { token: string, plan: "weekly" | "monthly", business_id: string, email: string }
 *
 * This route is ready to connect to Culqi's charge API.
 * Activate by adding CULQI_SECRET_KEY to your .env.local.
 */
export async function POST(req: NextRequest) {
  try {
    const { token, plan, business_id, email } = await req.json()

    if (!token || !plan || !business_id || !email) {
      return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 })
    }

    if (!PLAN_AMOUNTS[plan]) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
    }

    const culqiKey = process.env.CULQI_SECRET_KEY
    if (!culqiKey) {
      return NextResponse.json(
        { error: "Integración Culqi no configurada. Agrega CULQI_SECRET_KEY a tu .env.local" },
        { status: 503 }
      )
    }

    // Charge via Culqi API
    const chargePayload = {
      amount: PLAN_AMOUNTS[plan],
      currency_code: "PEN",
      description: `Mahu Plexus - Plan ${plan === "weekly" ? "Semanal" : "Mensual"}`,
      email,
      source_id: token,
      metadata: {
        business_id,
        plan,
      },
    }

    const culqiResponse = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${culqiKey}`,
      },
      body: JSON.stringify(chargePayload),
    })

    const chargeData = await culqiResponse.json()

    if (!culqiResponse.ok || chargeData.object === "error") {
      return NextResponse.json(
        { error: chargeData.user_message || chargeData.merchant_message || "Error al procesar el pago" },
        { status: 400 }
      )
    }

    // Payment successful — update subscription
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + PLAN_DAYS[plan])

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        subscription_status: "active",
        subscription_plan: plan,
        current_period_end: periodEnd.toISOString(),
        last_payment_at: now.toISOString(),
        last_charge_id: chargeData.id,
      })
      .eq("id", business_id)

    if (updateError) {
      console.error("Subscription update error:", updateError)
      return NextResponse.json(
        { error: "Pago procesado pero error al actualizar suscripción. Contacta soporte." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      charge_id: chargeData.id,
      plan,
      period_end: periodEnd.toISOString(),
      message: `Plan ${plan === "weekly" ? "Semanal" : "Mensual"} activado correctamente`,
    })
  } catch (error) {
    console.error("CULQI ERROR:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

/**
 * GET /api/culqi?business_id=...
 * Returns subscription status for a business
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const business_id = searchParams.get("business_id")

    if (!business_id) {
      return NextResponse.json({ error: "Falta business_id" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("businesses")
      .select("subscription_status, subscription_plan, trial_ends_at, current_period_end, last_payment_at")
      .eq("id", business_id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const now = new Date()
    let status = data?.subscription_status || "none"

    // Auto-expire check
    if (status === "trial" && data?.trial_ends_at) {
      const trialEnd = new Date(data.trial_ends_at)
      if (now > trialEnd) {
        status = "expired"
        await supabase.from("businesses").update({ subscription_status: "expired" }).eq("id", business_id)
      }
    }

    if (status === "active" && data?.current_period_end) {
      const periodEnd = new Date(data.current_period_end)
      if (now > periodEnd) {
        status = "expired"
        await supabase.from("businesses").update({ subscription_status: "expired" }).eq("id", business_id)
      }
    }

    return NextResponse.json({
      status,
      plan: data?.subscription_plan || null,
      trial_ends_at: data?.trial_ends_at || null,
      current_period_end: data?.current_period_end || null,
      last_payment_at: data?.last_payment_at || null,
      is_active: status === "active" || status === "trial",
    })
  } catch (error) {
    console.error("CULQI GET ERROR:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
