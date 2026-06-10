import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/subscription
 * Activate trial or update subscription status
 */
export async function POST(req: NextRequest) {
  try {
    const { business_id, action, plan } = await req.json()

    if (!business_id || !action) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    if (action === "activate_trial") {
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 2)

      const { error } = await supabase
        .from("businesses")
        .update({
          subscription_status: "trial",
          subscription_plan: "trial",
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq("id", business_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, status: "trial", trial_ends_at: trialEnd.toISOString() })
    }

    if (action === "suspend") {
      const { error } = await supabase
        .from("businesses")
        .update({ subscription_status: "suspended" })
        .eq("id", business_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true, status: "suspended" })
    }

    if (action === "check_expiry") {
      const { data } = await supabase
        .from("businesses")
        .select("subscription_status, trial_ends_at, current_period_end")
        .eq("id", business_id)
        .single()

      const now = new Date()
      let newStatus = data?.subscription_status

      if (newStatus === "trial" && data?.trial_ends_at && now > new Date(data.trial_ends_at)) {
        newStatus = "expired"
        await supabase.from("businesses").update({ subscription_status: "expired" }).eq("id", business_id)
      }

      if (newStatus === "active" && data?.current_period_end && now > new Date(data.current_period_end)) {
        newStatus = "expired"
        await supabase.from("businesses").update({ subscription_status: "expired" }).eq("id", business_id)
      }

      return NextResponse.json({ status: newStatus, is_active: newStatus === "active" || newStatus === "trial" })
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
  } catch (error) {
    console.error("SUBSCRIPTION ERROR:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
