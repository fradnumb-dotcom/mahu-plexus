"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { UsageMeter } from "../components/UsageMeter"
import { PaymentMarks } from "../components/PaymentMarks"
import { toast } from "../components/Toast"
import {
  getSubscriptionInfo, getUsageStats,
  type SubscriptionInfo, PLAN_LIMITS,
} from "../lib/subscription"

type PlanId = "trial" | "daily" | "weekly" | "monthly"

const PLANS: Array<{
  id: PlanId; name: string; price: string; period: string
  days: number; products: number; sellers: number
  badge: string; cardCls: string; ctaCls: string
  features: string[]; popular?: boolean; best?: boolean
}> = [
  {
    id: "daily", name: "Plan Diario", price: "S/ 9.90", period: "/día",
    days: 1, products: 1000, sellers: 2,
    badge: "bg-[#2B2B30] text-[#E6E6E6]/70",
    cardCls: "border-[#2B2B30] bg-[#141418]/60",
    ctaCls: "border border-[#2B2B30] bg-[#2B2B30] text-[#E6E6E6]/80 hover:text-[#E6E6E6]",
    features: ["1,000 productos", "2 usuarios", "Ventas ilimitadas", "Reportes PDF", "Soporte estándar"],
  },
  {
    id: "weekly", name: "Plan Semanal", price: "S/ 29.90", period: "/semana",
    days: 7, products: 5000, sellers: 5,
    badge: "bg-emerald-500/15 text-emerald-300",
    cardCls: "border-emerald-500/22 bg-[#141418]/70",
    ctaCls: "bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,0.22)]",
    features: ["5,000 productos", "5 usuarios", "Ventas ilimitadas", "Reportes PDF y Excel", "Historial completo", "Soporte prioritario"],
    popular: true,
  },
  {
    id: "monthly", name: "Plan Mensual", price: "S/ 89.90", period: "/mes",
    days: 30, products: 99999, sellers: 20,
    badge: "bg-[#D4AF37] text-[#0B0B0D]",
    cardCls: "border-[#D4AF37]/28 bg-gradient-to-b from-[#D4AF37]/7 to-transparent",
    ctaCls: "bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-[#0B0B0D] font-black shadow-[0_8px_32px_rgba(212,175,55,0.28)]",
    features: ["Productos ilimitados", "20 usuarios", "Ventas ilimitadas", "Dashboard ejecutivo", "Analítica completa", "Exportaciones avanzadas", "Soporte VIP 24/7"],
    best: true,
  },
]

export default function SubscriptionPage() {
  const router = useRouter()

  const [loading,    setLoading]    = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [role,       setRole]       = useState<string | null>(null)
  const [subInfo,    setSubInfo]    = useState<SubscriptionInfo | null>(null)
  const [usage,      setUsage]      = useState<{ products: { used:number; limit:number; pct:number }; sellers: { used:number; limit:number; pct:number } } | null>(null)
  const [isMounted,  setIsMounted]  = useState(false)

  useEffect(() => {
    setIsMounted(true)
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: p } = await supabase.from("profiles").select("business_id, role").eq("id", user.id).single()
      if (!p) { router.push("/login"); return }

      setRole(p.role)
      setBusinessId(p.business_id)

      if (p.business_id) {
        const [info, usageData] = await Promise.all([
          getSubscriptionInfo(p.business_id),
          getUsageStats(p.business_id, null),
        ])
        setSubInfo(info)
        setUsage(usageData)
      }
      setTimeout(() => setLoading(false), 350)
    })()
  }, [router])

  const handleSelectPlan = async (planId: PlanId) => {
    if (!businessId) return

    if (planId === "trial") {
      try {
        const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 3)
        const { error } = await supabase.from("businesses").update({
          subscription_status: "trial",
          subscription_plan:   "trial",
          trial_started_at:    new Date().toISOString(),
          trial_ends_at:       trialEnd.toISOString(),
        }).eq("id", businessId)

        if (error) { toast.error("Error al activar prueba: " + error.message); return }
        toast.subscription("¡Prueba de 3 días activada!")
        const info = await getSubscriptionInfo(businessId)
        setSubInfo(info)
      } catch { toast.error("Error al activar prueba") }
      return
    }

    // Culqi integration — ready when CULQI_SECRET_KEY is set
    toast.info("Integración Culqi lista. Agrega CULQI_SECRET_KEY para activar pagos reales.")
  }

  const fmt = (d: string | null) => {
    if (!d || !isMounted) return "--"
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
  }

  const statusCfg: Record<string, { label: string; cls: string; dot: string }> = {
    trial:     { label: "Prueba activa",  cls: "border-[#D4AF37]/25 bg-[#D4AF37]/8 text-[#D4AF37]",      dot: "bg-[#D4AF37]" },
    active:    { label: "Plan activo",    cls: "border-emerald-500/25 bg-emerald-500/8 text-emerald-300", dot: "bg-emerald-400" },
    expired:   { label: "Expirado",       cls: "border-rose-500/25 bg-rose-500/8 text-rose-300",          dot: "bg-rose-400" },
    suspended: { label: "Suspendido",     cls: "border-orange-500/25 bg-orange-500/8 text-orange-300",    dot: "bg-orange-400" },
    none:      { label: "Sin plan",       cls: "border-[#2B2B30] bg-[#141418] text-[#E6E6E6]/40",        dot: "bg-[#E6E6E6]/20" },
  }

  const sc = statusCfg[subInfo?.status || "none"]

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/4 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#D4AF37]/3 blur-[160px]" />
      </div>

      <Sidebar
        activePage="subscription"
        role={role as "owner" | "seller" | null}
        subStatus={subInfo?.status}
        subEndsAt={subInfo?.trialEndsAt || subInfo?.currentPeriodEnd}
      />

      <div className="relative z-10 xl:ml-64">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/90 px-5 py-4 backdrop-blur-2xl md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#E6E6E6]">Suscripción</h1>
              <p className="mt-0.5 text-xs text-[#E6E6E6]/40">Gestiona tu plan Mahu Plexus</p>
            </div>
            {subInfo && (
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${sc.cls}`}>
                <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                <span className="text-xs font-semibold">{sc.label}</span>
              </div>
            )}
          </div>
        </header>

        <div className="px-5 py-6 md:px-8 space-y-6 pb-28 xl:pb-6">

          {/* Current subscription card */}
          {subInfo && (
            <div className="mp-fade-up rounded-2xl border border-[#D4AF37]/14 bg-[#141418]/60 p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#E6E6E6]/38 mb-4">Estado actual</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl border text-base ${sc.cls}`}>
                      {subInfo.status === "trial" ? "⏳" : subInfo.status === "active" ? "✓" : subInfo.status === "expired" ? "⏰" : "⏸"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#E6E6E6]">{sc.label}</p>
                      <p className="text-xs text-[#E6E6E6]/40">
                        Plan: {PLAN_LIMITS[subInfo.plan || "trial"]?.label || "Sin plan"}
                      </p>
                    </div>
                  </div>

                  {subInfo.isValid && (subInfo.trialEndsAt || subInfo.currentPeriodEnd) && (
                    <div className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3.5 py-2.5">
                      <p className="text-[10px] text-[#E6E6E6]/35 mb-1">Vence el</p>
                      <p className="text-sm font-bold text-[#E6E6E6]">
                        {fmt(subInfo.currentPeriodEnd || subInfo.trialEndsAt)}
                      </p>
                      {subInfo.isValid && (
                        <p className="text-xs text-[#D4AF37] mt-0.5 font-semibold">
                          {subInfo.daysLeft}d {subInfo.hoursLeft}h {subInfo.minutesLeft}m restantes
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Usage meters */}
                {usage && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-[#E6E6E6]/35">Uso del plan</p>
                    <UsageMeter label="Productos" used={usage.products.used} limit={usage.products.limit} pct={usage.products.pct} icon="◈" />
                    <UsageMeter label="Vendedores" used={usage.sellers.used} limit={usage.sellers.limit} pct={usage.sellers.pct} icon="◉" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans grid */}
          <div className="mp-fade-up delay-100">
            <p className="text-sm font-semibold text-[#E6E6E6] mb-4">Planes disponibles</p>
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map(plan => (
                <div key={plan.id} className={`relative overflow-hidden rounded-2xl border p-5 transition hover:-translate-y-1 ${plan.cardCls} ${plan.best ? "ring-1 ring-[#D4AF37]/22" : ""}`}>
                  {plan.popular && <div className="absolute right-3 top-3"><span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-white">POPULAR</span></div>}
                  {plan.best && <div className="absolute right-3 top-3"><span className="rounded-full bg-[#D4AF37] px-2.5 py-0.5 text-[10px] font-black text-[#0B0B0D]">RECOMENDADO</span></div>}

                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-3 ${plan.badge}`}>{plan.period}</span>
                  <p className="text-base font-bold text-[#E6E6E6] mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-black text-[#D4AF37]">{plan.price}</span>
                    <span className="text-xs text-[#E6E6E6]/40">{plan.period}</span>
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-[#E6E6E6]/55">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#D4AF37]/18 bg-[#D4AF37]/8 text-[#D4AF37] text-[9px] shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={subInfo?.plan === plan.id && subInfo?.isValid}
                    className={`w-full rounded-xl py-2.5 text-sm font-bold transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed ${plan.ctaCls}`}
                  >
                    {subInfo?.plan === plan.id && subInfo?.isValid ? "Plan actual ✓" : "Contratar"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trial activation (if no subscription) */}
          {(!subInfo?.status || subInfo.status === "none") && (
            <div className="mp-fade-up delay-150 rounded-2xl border border-[#D4AF37]/18 bg-[#D4AF37]/5 p-5 text-center">
              <p className="text-sm font-bold text-[#D4AF37] mb-1">¿Primera vez? Empieza gratis</p>
              <p className="text-xs text-[#E6E6E6]/50 mb-4">3 días de acceso completo. Sin tarjeta de crédito.</p>
              <button onClick={() => handleSelectPlan("trial")}
                className="rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-6 py-2.5 text-sm font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/18">
                Activar prueba gratuita
              </button>
            </div>
          )}

          {/* Culqi payment notice */}
          <div className="mp-fade-up delay-200 rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 text-lg">💳</div>
              <div>
                <p className="text-sm font-bold text-[#E6E6E6]">Pagos con Culqi Online</p>
                <p className="mt-1 text-xs text-[#E6E6E6]/45 leading-relaxed">
                  Integración Culqi preparada y lista. Visa, Mastercard, American Express y Yape disponibles próximamente. Agrega <code className="rounded bg-[#2B2B30] px-1.5 py-0.5 font-mono text-[11px] text-[#D4AF37]">CULQI_SECRET_KEY</code> en .env.local para activar cobros reales.
                </p>
                <div className="mt-3">
                  <PaymentMarks />
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mp-fade-up delay-250 rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
            <p className="text-sm font-bold text-[#E6E6E6] mb-4">Preguntas frecuentes</p>
            <div className="space-y-4">
              {[
                { q: "¿Qué pasa con mis datos al expirar?", a: "Nunca eliminamos tus datos. Solo se bloquea el acceso. Al renovar, todo vuelve exactamente como lo dejaste." },
                { q: "¿Puedo cambiar de plan?",             a: "Sí, en cualquier momento. El nuevo período inicia desde el momento del pago." },
                { q: "¿Cómo funciona la prueba de 3 días?", a: "Acceso completo sin restricciones. Sin tarjeta de crédito. Al vencer, elige el plan que prefieras." },
                { q: "¿Qué pasa si supero el límite?",      a: "Recibirás alertas cuando te acerques al límite. Se bloquea la creación de nuevos registros, los existentes permanecen intactos." },
              ].map(faq => (
                <div key={faq.q} className="border-b border-[#2B2B30] pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-[#E6E6E6]">{faq.q}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#E6E6E6]/45">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/18">Mahu Plexus · Conectamos ideas, creamos soluciones</p>
          </div>
        </div>
      </div>

      {loading && <LoadingScreen message="Cargando suscripción..." />}
          <MobileNav active="subscription" role={role as "owner" | "seller" | null} />

    </main>
  )
}
