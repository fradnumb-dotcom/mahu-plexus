import { supabase } from "./supabase"

export type SubscriptionStatus = "trial" | "active" | "canceled" | "expired" | "suspended" | "none"
export type SubscriptionPlan  = "trial" | "daily" | "weekly" | "monthly" | null

export interface SubscriptionInfo {
  status:           SubscriptionStatus
  plan:             SubscriptionPlan
  trialEndsAt:      string | null
  currentPeriodEnd: string | null
  daysLeft:         number
  hoursLeft:        number
  minutesLeft:      number
  isValid:          boolean
  isExpired:        boolean
  isBlockedPage:    boolean
}

// ── Plan limits ───────────────────────────────────────────────────
export const PLAN_LIMITS: Record<string, { products: number; sellers: number; label: string; days: number }> = {
  trial:   { products: 500,    sellers: 3,   label: "Trial 3 días",  days: 3  },
  daily:   { products: 1000,   sellers: 2,   label: "Plan Diario",   days: 1  },
  weekly:  { products: 5000,   sellers: 5,   label: "Plan Semanal",  days: 7  },
  monthly: { products: 99999,  sellers: 20,  label: "Plan Mensual",  days: 30 },
  active:  { products: 99999,  sellers: 99,  label: "Activo",        days: 999},
}

// ── Main getter ───────────────────────────────────────────────────
export async function getSubscriptionInfo(businessId: string): Promise<SubscriptionInfo> {
  const fallback: SubscriptionInfo = {
    status: "active", plan: null, trialEndsAt: null,
    currentPeriodEnd: null, daysLeft: 999, hoursLeft: 0, minutesLeft: 0,
    isValid: true, isExpired: false, isBlockedPage: false,
  }

  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("subscription_status, subscription_plan, trial_ends_at, current_period_end, trial_started_at")
      .eq("id", businessId)
      .single()

    if (error || !data) return fallback

    const now      = new Date()
    let status     = (data.subscription_status as SubscriptionStatus) || "none"
    const plan     = (data.subscription_plan as SubscriptionPlan) || null
    const endDate  = data.current_period_end || data.trial_ends_at

    // Auto-detect expiry (incluye canceladas: el acceso se mantiene hasta el fin de período)
    if ((status === "trial" || status === "active" || status === "canceled") && endDate) {
      if (now > new Date(endDate)) {
        status = "expired"
        // Fire-and-forget update
        supabase.from("businesses")
          .update({ subscription_status: "expired" })
          .eq("id", businessId)
          .then(() => {})
      }
    }

    let msLeft     = 0
    if (endDate) msLeft = Math.max(0, new Date(endDate).getTime() - now.getTime())

    const daysLeft    = Math.floor(msLeft / 86400000)
    const hoursLeft   = Math.floor((msLeft % 86400000) / 3600000)
    const minutesLeft = Math.floor((msLeft % 3600000) / 60000)
    const isValid     = status === "active" || status === "trial" || status === "canceled"

    return {
      status,
      plan,
      trialEndsAt:      data.trial_ends_at || null,
      currentPeriodEnd: data.current_period_end || null,
      daysLeft,
      hoursLeft,
      minutesLeft,
      isValid,
      isExpired:     status === "expired" || status === "suspended",
      isBlockedPage: status === "expired" || status === "suspended",
    }
  } catch {
    return fallback
  }
}

// ── Auto-activate trial for new businesses ────────────────────────
export async function activateTrialIfNew(businessId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("businesses")
      .select("subscription_status, trial_started_at")
      .eq("id", businessId)
      .single()

    if (!data) return false

    // Already has a status → do nothing
    if (data.subscription_status && data.subscription_status !== "none" && data.subscription_status !== null) {
      return false
    }

    const now      = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 3)

    await supabase.from("businesses").update({
      subscription_status:  "trial",
      subscription_plan:    "trial",
      trial_started_at:     now.toISOString(),
      trial_ends_at:        trialEnd.toISOString(),
    }).eq("id", businessId)

    return true // newly activated → show welcome modal
  } catch {
    return false
  }
}

// ── Usage stats ───────────────────────────────────────────────────
export async function getUsageStats(businessId: string, plan: SubscriptionPlan) {
  const limits = PLAN_LIMITS[plan || "trial"] || PLAN_LIMITS["trial"]

  const [{ count: productCount }, { count: sellerCount }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("role", "seller"),
  ])

  const products = productCount ?? 0
  const sellers  = sellerCount  ?? 0

  return {
    products: { used: products, limit: limits.products, pct: Math.min(100, Math.round((products / limits.products) * 100)) },
    sellers:  { used: sellers,  limit: limits.sellers,  pct: Math.min(100, Math.round((sellers  / limits.sellers)  * 100)) },
  }
}

export function isSubscriptionValid(info: SubscriptionInfo): boolean {
  return info.isValid
}
