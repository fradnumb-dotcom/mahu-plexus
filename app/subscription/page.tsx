"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { UsageMeter } from "../components/UsageMeter"
import { PaymentMarks } from "../components/PaymentMarks"
import { IzipayCheckout } from "../components/IzipayCheckout"
import { toast } from "../components/Toast"
import {
  getSubscriptionInfo, getUsageStats,
  type SubscriptionInfo, PLAN_LIMITS,
} from "../lib/subscription"

type PlanId = "trial" | "daily" | "weekly" | "monthly"

const PLANS: Array<{
  id: PlanId; name: string; price: string; period: string
  days: number; features: string[]; recommended?: boolean
}> = [
  {
    id: "daily", name: "Diario", price: "S/ 9.90", period: "por día", days: 1,
    features: ["1,000 productos", "2 usuarios", "Ventas ilimitadas", "Reportes PDF", "Soporte estándar"],
  },
  {
    id: "weekly", name: "Semanal", price: "S/ 29.90", period: "por semana", days: 7,
    features: ["5,000 productos", "5 usuarios", "Ventas ilimitadas", "Reportes PDF y Excel", "Historial completo", "Soporte prioritario"],
  },
  {
    id: "monthly", name: "Mensual", price: "S/ 89.90", period: "por mes", days: 30,
    features: ["Productos ilimitados", "20 usuarios", "Ventas ilimitadas", "Dashboard ejecutivo", "Analítica completa", "Exportaciones avanzadas", "Soporte 24/7"],
    recommended: true,
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
  const [paying,     setPaying]     = useState<PlanId | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [checkout,   setCheckout]   = useState<{ formToken: string; publicKey: string } | null>(null)

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

  const refreshSub = async () => {
    if (!businessId) return
    const info = await getSubscriptionInfo(businessId)
    setSubInfo(info)
  }

  const handleCancel = async () => {
    if (cancelling) return
    setCancelling(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { toast.error("Sesión expirada. Vuelve a iniciar sesión."); return }
      const res = await fetch("/api/izipay/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "No se pudo cancelar la suscripción"); return }
      toast.info("Suscripción cancelada. Conservas el acceso hasta el fin del período.")
      await refreshSub()
    } catch {
      toast.error("Error de conexión al cancelar")
    } finally {
      setCancelling(false)
    }
  }

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
        await refreshSub()
      } catch { toast.error("Error al activar prueba") }
      return
    }

    // Planes de pago → Izipay. El backend genera el formToken; el cobro lo
    // confirma el IPN. El frontend nunca ve ni maneja llaves privadas.
    setPaying(planId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error("Sesión expirada. Vuelve a iniciar sesión.")
        return
      }
      const res = await fetch("/api/izipay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()

      if (!res.ok) { toast.error(data.error || "No se pudo iniciar el pago"); return }
      if (!data.formToken || !data.publicKey) {
        toast.info("Configura las llaves de Izipay para activar el cobro en línea.")
        return
      }
      setCheckout({ formToken: data.formToken, publicKey: data.publicKey })
    } catch {
      toast.error("Error de conexión al iniciar el pago")
    } finally {
      setPaying(null)
    }
  }

  const fmt = (d: string | null) => {
    if (!d || !isMounted) return "--"
    return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(d))
  }

  const statusCfg: Record<string, { label: string; cls: string; dot: string }> = {
    trial:     { label: "Prueba activa", cls: "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]",  dot: "bg-[#D4AF37]" },
    active:    { label: "Plan activo",   cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
    canceled:  { label: "Cancelada",     cls: "border-amber-500/25 bg-amber-500/10 text-amber-300",   dot: "bg-amber-400" },
    expired:   { label: "Expirado",      cls: "border-rose-500/25 bg-rose-500/10 text-rose-300",     dot: "bg-rose-400" },
    suspended: { label: "Suspendido",    cls: "border-orange-500/25 bg-orange-500/10 text-orange-300", dot: "bg-orange-400" },
    none:      { label: "Sin plan",      cls: "border-white/10 bg-white/[0.03] text-[#E6E6E6]/50",   dot: "bg-[#E6E6E6]/25" },
  }

  const sc = statusCfg[subInfo?.status || "none"]

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <Sidebar
        activePage="subscription"
        role={role as "owner" | "seller" | null}
        subStatus={subInfo?.status}
        subEndsAt={subInfo?.trialEndsAt || subInfo?.currentPeriodEnd}
      />

      <div className="xl:ml-64">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0B0B0D]/95 px-5 py-4 backdrop-blur md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#E6E6E6]">Suscripción</h1>
              <p className="mt-0.5 text-xs text-[#E6E6E6]/45">Gestiona tu plan de Mahu Plexus</p>
            </div>
            {subInfo && (
              <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${sc.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                <span className="text-xs font-medium">{sc.label}</span>
              </div>
            )}
          </div>
        </header>

        <div className="space-y-6 px-5 py-6 pb-28 md:px-8 xl:pb-6">

          {/* Estado actual */}
          {subInfo && (
            <section className="rounded-xl border border-white/8 bg-[#141418] p-5">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-[#E6E6E6]/40">Estado actual</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-[#E6E6E6]">{sc.label}</p>
                    <p className="text-xs text-[#E6E6E6]/45">
                      Plan: {PLAN_LIMITS[subInfo.plan || "trial"]?.label || "Sin plan"}
                    </p>
                  </div>

                  {subInfo.isValid && (subInfo.trialEndsAt || subInfo.currentPeriodEnd) && (
                    <div className="rounded-lg border border-white/8 bg-[#0B0B0D] px-3.5 py-2.5">
                      <p className="mb-1 text-[11px] text-[#E6E6E6]/40">Vence el</p>
                      <p className="text-sm font-medium text-[#E6E6E6]">
                        {fmt(subInfo.currentPeriodEnd || subInfo.trialEndsAt)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#E6E6E6]/55">
                        {subInfo.daysLeft}d {subInfo.hoursLeft}h {subInfo.minutesLeft}m restantes
                      </p>
                    </div>
                  )}

                  {(subInfo.status === "active" || subInfo.status === "canceled") &&
                   subInfo.plan && subInfo.plan !== "trial" && (
                    subInfo.status === "canceled" ? (
                      <p className="text-xs text-amber-300/80">
                        Renovación cancelada. Conservas el acceso hasta el fin del período.
                      </p>
                    ) : (
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="text-xs font-medium text-[#E6E6E6]/45 underline-offset-2 transition hover:text-rose-300 hover:underline disabled:opacity-50"
                      >
                        {cancelling ? "Cancelando…" : "Cancelar renovación"}
                      </button>
                    )
                  )}
                </div>

                {usage && (
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-[#E6E6E6]/40">Uso del plan</p>
                    <UsageMeter label="Productos" used={usage.products.used} limit={usage.products.limit} pct={usage.products.pct} icon="◈" />
                    <UsageMeter label="Vendedores" used={usage.sellers.used} limit={usage.sellers.limit} pct={usage.sellers.pct} icon="◉" />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Planes */}
          <section>
            <p className="mb-4 text-sm font-medium text-[#E6E6E6]">Planes disponibles</p>
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map(plan => {
                const isCurrent = subInfo?.plan === plan.id && subInfo?.isValid
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-xl border bg-[#141418] p-5 ${
                      plan.recommended ? "border-[#D4AF37]/40" : "border-white/8"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-medium text-[#E6E6E6]">{plan.name}</p>
                      {plan.recommended && (
                        <span className="rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#D4AF37]">
                          Recomendado
                        </span>
                      )}
                    </div>

                    <div className="mb-5 flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-[#E6E6E6]">{plan.price}</span>
                      <span className="text-xs text-[#E6E6E6]/45">{plan.period}</span>
                    </div>

                    <ul className="mb-6 flex-1 space-y-2.5">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-xs text-[#E6E6E6]/60">
                          <span className="mt-0.5 text-[#D4AF37]">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent || paying === plan.id}
                      className={`w-full rounded-lg py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        plan.recommended
                          ? "bg-[#D4AF37] text-[#0B0B0D] hover:bg-[#C9A227]"
                          : "border border-white/12 bg-white/[0.03] text-[#E6E6E6] hover:bg-white/[0.06]"
                      }`}
                    >
                      {isCurrent ? "Plan actual" : paying === plan.id ? "Procesando…" : "Contratar"}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Prueba gratuita (si no hay suscripción) */}
          {(!subInfo?.status || subInfo.status === "none") && (
            <section className="rounded-xl border border-white/8 bg-[#141418] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[#E6E6E6]">¿Primera vez? Empieza gratis</p>
                  <p className="mt-0.5 text-xs text-[#E6E6E6]/45">3 días de acceso completo. Sin tarjeta de crédito.</p>
                </div>
                <button
                  onClick={() => handleSelectPlan("trial")}
                  className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-5 py-2.5 text-sm font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/15"
                >
                  Activar prueba
                </button>
              </div>
            </section>
          )}

          {/* Pagos seguros — Izipay */}
          <section className="rounded-xl border border-white/8 bg-[#141418] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#E6E6E6]">Pagos procesados por Izipay</p>
                <p className="mt-1 text-xs leading-relaxed text-[#E6E6E6]/50">
                  Tus datos de tarjeta nunca pasan por nuestros servidores. La confirmación del
                  pago se valida de forma segura en el servidor.
                </p>
              </div>
              <PaymentMarks />
            </div>
          </section>

          {/* FAQ */}
          <section className="rounded-xl border border-white/8 bg-[#141418] p-5">
            <p className="mb-4 text-sm font-medium text-[#E6E6E6]">Preguntas frecuentes</p>
            <div className="space-y-4">
              {[
                { q: "¿Qué pasa con mis datos al expirar?", a: "Nunca eliminamos tus datos. Solo se bloquea el acceso. Al renovar, todo vuelve exactamente como lo dejaste." },
                { q: "¿Puedo cambiar de plan?",             a: "Sí, en cualquier momento. El nuevo período inicia desde el momento del pago." },
                { q: "¿Cómo funciona la prueba de 3 días?", a: "Acceso completo sin restricciones. Sin tarjeta de crédito. Al vencer, elige el plan que prefieras." },
                { q: "¿Qué pasa si supero el límite?",      a: "Recibirás alertas cuando te acerques al límite. Se bloquea la creación de nuevos registros; los existentes permanecen intactos." },
              ].map(faq => (
                <div key={faq.q} className="border-b border-white/8 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-[#E6E6E6]">{faq.q}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#E6E6E6]/50">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="py-2 text-center">
            <p className="text-[11px] uppercase tracking-widest text-[#E6E6E6]/20">Mahu Plexus · Conectamos ideas, creamos soluciones</p>
          </div>
        </div>
      </div>

      {checkout && (
        <IzipayCheckout
          formToken={checkout.formToken}
          publicKey={checkout.publicKey}
          onClose={() => setCheckout(null)}
          onSuccess={() => {
            setCheckout(null)
            toast.subscription("Pago recibido. Tu plan se activará al confirmarse.")
            refreshSub()
          }}
        />
      )}

      {loading && <LoadingScreen message="Cargando suscripción..." />}
      <MobileNav active="subscription" role={role as "owner" | "seller" | null} />
    </main>
  )
}
