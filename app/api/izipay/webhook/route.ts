import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { PLAN_AMOUNTS, PLAN_DAYS } from "../../../lib/izipay"

// La validación de firma usa crypto de Node: forzamos runtime Node (no Edge).
export const runtime = "nodejs"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* ──────────────────────────────────────────────────────────────────────────
 * Webhook IPN de Izipay (notificación servidor-a-servidor).
 *
 * Configúralo en el Back Office Vendedor → Reglas de notificación →
 *   "URL de notificación al final del pago": https://TU-DOMINIO/api/izipay/webhook
 *
 * Seguridad aplicada:
 *  - Validación de firma HMAC-SHA256 (clave IZIPAY_PASSWORD), comparación timing-safe.
 *  - Solo activa si orderStatus === "PAID".
 *  - Verificación de monto contra el precio del plan (anti-manipulación).
 *  - Protección anti-replay: ignora IPN repetidos del mismo cargo.
 *  - Extensión de período inteligente (renovaciones se acumulan).
 *  - Soporte de eventos recurrentes (identifica el negocio por subscriptionId).
 * ────────────────────────────────────────────────────────────────────────── */

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

interface KrAnswer {
  orderStatus?: string
  subscription?: string
  metadata?: { business_id?: string; plan?: string }
  orderDetails?: { orderTotalAmount?: number; metadata?: { business_id?: string; plan?: string } }
  transactions?: Array<{
    uuid?: string
    amount?: number
    metadata?: { business_id?: string; plan?: string }
  }>
}

export async function POST(req: NextRequest) {
  try {
    const password = process.env.IZIPAY_PASSWORD
    if (!password) {
      console.error("IZIPAY IPN: falta IZIPAY_PASSWORD")
      return new NextResponse("Configuración Izipay incompleta", { status: 503 })
    }

    const raw = await req.text() // application/x-www-form-urlencoded
    const params = new URLSearchParams(raw)
    const krAnswer = params.get("kr-answer")
    const krHash = params.get("kr-hash")
    if (!krAnswer || !krHash) {
      return new NextResponse("Notificación inválida", { status: 400 })
    }

    // 1) Validación de firma (autenticidad e integridad de la notificación).
    const expected = crypto.createHmac("sha256", password).update(krAnswer).digest("hex")
    if (!safeEqual(expected, krHash)) {
      console.error("IZIPAY IPN: firma inválida")
      return new NextResponse("Firma inválida", { status: 401 })
    }

    const answer = JSON.parse(krAnswer) as KrAnswer
    const orderStatus = answer.orderStatus

    if (orderStatus !== "PAID") {
      console.warn(`IZIPAY IPN: orderStatus=${orderStatus} (sin cambios)`)
      return new NextResponse(`OK! orderStatus=${orderStatus}`, { status: 200 })
    }

    const tx = answer.transactions?.[0]
    const chargeId = tx?.uuid
    const subscriptionId = answer.subscription || null

    // 2) Resolver negocio + plan: por metadata (pago inicial) o por subscriptionId (recurrente).
    let businessId =
      answer.metadata?.business_id ||
      tx?.metadata?.business_id ||
      answer.orderDetails?.metadata?.business_id
    let plan =
      answer.metadata?.plan ||
      tx?.metadata?.plan ||
      answer.orderDetails?.metadata?.plan

    if ((!businessId || !plan) && subscriptionId) {
      // Evento recurrente: ubicar el negocio por su id de suscripción (si la columna existe).
      try {
        const { data } = await supabase
          .from("businesses")
          .select("id, subscription_plan")
          .eq("izipay_subscription_id", subscriptionId)
          .single()
        if (data) {
          businessId = businessId || data.id
          plan = plan || data.subscription_plan || undefined
        }
      } catch { /* columna ausente o sin coincidencia: se ignora */ }
    }

    if (!businessId || !plan || !PLAN_DAYS[plan]) {
      console.error("IZIPAY IPN: no se pudo resolver negocio/plan", { businessId, plan })
      return new NextResponse("Metadata incompleta", { status: 422 })
    }

    // 3) Verificación de monto (anti-manipulación). El monto pagado debe coincidir
    //    con el precio del plan definido en backend.
    const paidAmount = tx?.amount ?? answer.orderDetails?.orderTotalAmount
    if (typeof paidAmount === "number" && paidAmount !== PLAN_AMOUNTS[plan]) {
      console.error(`IZIPAY IPN: monto no coincide (pagado=${paidAmount}, esperado=${PLAN_AMOUNTS[plan]})`)
      return new NextResponse("Monto inválido", { status: 422 })
    }

    // 4) Estado actual del negocio (columnas existentes): replay + extensión de período.
    const { data: current, error: readErr } = await supabase
      .from("businesses")
      .select("current_period_end, last_charge_id")
      .eq("id", businessId)
      .single()

    if (readErr) {
      console.error("IZIPAY IPN: negocio no encontrado", readErr)
      return new NextResponse("Negocio no encontrado", { status: 404 })
    }

    // Anti-replay: si este cargo ya se procesó, acusar recibo sin volver a aplicar.
    if (chargeId && current?.last_charge_id === chargeId) {
      return new NextResponse("OK! Ya procesado", { status: 200 })
    }

    // Extensión inteligente: si el período vigente no ha vencido, se acumula sobre él.
    const now = new Date()
    const base = current?.current_period_end && new Date(current.current_period_end) > now
      ? new Date(current.current_period_end)
      : now
    const periodEnd = new Date(base)
    periodEnd.setDate(periodEnd.getDate() + PLAN_DAYS[plan])

    const { error: updErr } = await supabase
      .from("businesses")
      .update({
        subscription_status: "active",
        subscription_plan: plan,
        current_period_end: periodEnd.toISOString(),
        last_payment_at: now.toISOString(),
        last_charge_id: chargeId || null,
      })
      .eq("id", businessId)

    if (updErr) {
      console.error("IZIPAY IPN: error al actualizar suscripción", updErr)
      return new NextResponse("Error al actualizar suscripción", { status: 500 })
    }

    // Mejor esfuerzo: guardar el id de suscripción recurrente y limpiar cancelación.
    // Se ignora si las columnas opcionales no existen (migración 004 no aplicada).
    if (subscriptionId) {
      try {
        await supabase.from("businesses")
          .update({ izipay_subscription_id: subscriptionId, subscription_canceled_at: null })
          .eq("id", businessId)
      } catch { /* columnas opcionales ausentes */ }
    }

    console.log(`IZIPAY IPN OK: business=${businessId} plan=${plan} charge=${chargeId} sub=${subscriptionId ?? "-"}`)
    return new NextResponse("OK! Pago procesado", { status: 200 })
  } catch (error) {
    console.error("IZIPAY IPN ERROR:", error)
    return new NextResponse("Error interno", { status: 500 })
  }
}

// Health-check simple para verificar que la URL responde.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "izipay-ipn" })
}
