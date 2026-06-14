import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { izipayApi, izipayAuthHeader } from "../../../lib/izipay"
import { resolveSession } from "../../../lib/authz"

export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/izipay/cancel  (Cabecera: Authorization: Bearer <token>)
 *
 * Cancela la renovación de la suscripción del negocio del usuario autenticado.
 * El acceso se mantiene hasta `current_period_end` (no se borra nada). Si existe
 * una suscripción recurrente en Izipay, se cancela también allí.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req, supabase)
    if (!session.ok) return NextResponse.json({ error: session.error }, { status: session.status })

    // Mejor esfuerzo: cancelar la suscripción recurrente en Izipay si existe.
    // Se omite silenciosamente si la columna opcional no existe o no hay credenciales.
    try {
      const { data } = await supabase
        .from("businesses")
        .select("izipay_subscription_id")
        .eq("id", session.businessId)
        .single()
      const subId = (data as { izipay_subscription_id?: string } | null)?.izipay_subscription_id
      if (subId && izipayAuthHeader()) {
        await izipayApi("/api-payment/V4/Subscription/Cancel", { subscriptionId: subId })
      }
    } catch { /* columna ausente, sin recurrencia o sin credenciales: continuar */ }

    // Marcar como cancelada (columna existente). El acceso sigue hasta el fin de período.
    const { error } = await supabase
      .from("businesses")
      .update({ subscription_status: "canceled" })
      .eq("id", session.businessId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Mejor esfuerzo: registrar la fecha de cancelación (columna opcional, migración 004).
    try {
      await supabase
        .from("businesses")
        .update({ subscription_canceled_at: new Date().toISOString() })
        .eq("id", session.businessId)
    } catch { /* columna opcional ausente */ }

    return NextResponse.json({ success: true, status: "canceled" })
  } catch (error) {
    console.error("IZIPAY CANCEL ERROR:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
