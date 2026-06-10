"use client"

import { useRouter } from "next/navigation"

interface ExpiredWallProps {
  status: "expired" | "suspended"
  businessName?: string
}

const PLANS = [
  { id: "daily",   name: "Plan Diario",  price: "S/ 9.90",  period: "/día",   badge: "bg-[#2B2B30] text-[#E6E6E6]/70",    cta: "Contratar", color: "border-[#2B2B30]" },
  { id: "weekly",  name: "Plan Semanal", price: "S/ 29.90", period: "/semana", badge: "bg-emerald-500/15 text-emerald-300", cta: "Contratar", color: "border-emerald-500/25", popular: true },
  { id: "monthly", name: "Plan Mensual", price: "S/ 89.90", period: "/mes",    badge: "bg-[#D4AF37] text-[#0B0B0D]",       cta: "Contratar", color: "border-[#D4AF37]/30", best: true },
]

export function ExpiredWall({ status, businessName }: ExpiredWallProps) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0B0B0D]/97 px-4 py-8 backdrop-blur-xl">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[120px]" />

      <div className="relative w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 48, width: "auto", objectFit: "contain" }} />
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-4 ${status === "suspended" ? "border border-orange-500/25 bg-orange-500/10 text-orange-300" : "border border-rose-500/25 bg-rose-500/10 text-rose-300"}`}>
            <span className="text-sm">{status === "suspended" ? "⏸" : "⏰"}</span>
            <span className="text-xs font-semibold uppercase tracking-widest">
              {status === "suspended" ? "Cuenta suspendida" : "Prueba finalizada"}
            </span>
          </div>

          <h1 className="text-3xl font-black text-[#E6E6E6] mb-3">
            {status === "suspended"
              ? "Tu cuenta está suspendida"
              : "Tu prueba gratuita ha finalizado"}
          </h1>
          <p className="text-sm text-[#E6E6E6]/50 max-w-md mx-auto leading-relaxed">
            {businessName && <span className="text-[#D4AF37] font-semibold">{businessName} — </span>}
            {status === "suspended"
              ? "Tu cuenta está temporalmente suspendida. Elige un plan para reactivar el acceso completo. Tus datos están seguros y no se han eliminado."
              : "Esperamos que hayas disfrutado la prueba. Elige el plan que mejor se adapte a tu negocio para continuar. Todos tus datos están intactos."}
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative rounded-2xl border p-5 transition hover:-translate-y-1 ${plan.color} ${plan.best ? "bg-gradient-to-b from-[#D4AF37]/8 to-transparent" : "bg-[#141418]/70"}`}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-black text-white">
                  MÁS POPULAR
                </span>
              )}
              {plan.best && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-3 py-0.5 text-[10px] font-black text-[#0B0B0D]">
                  MEJOR VALOR
                </span>
              )}
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold mb-3 ${plan.badge}`}>
                {plan.name}
              </span>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-black text-[#E6E6E6]">{plan.price}</span>
                <span className="text-xs text-[#E6E6E6]/40">{plan.period}</span>
              </div>
              <button
                onClick={() => router.push("/subscription")}
                className={`w-full rounded-xl py-2.5 text-sm font-bold transition hover:-translate-y-0.5 ${
                  plan.best
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-[#0B0B0D] shadow-[0_8px_24px_rgba(212,175,55,0.25)]"
                    : plan.popular
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "border border-[#2B2B30] bg-[#2B2B30] text-[#E6E6E6]/70 hover:text-[#E6E6E6]"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Data safe notice */}
        <div className="rounded-2xl border border-emerald-500/18 bg-emerald-500/6 px-5 py-3.5 text-center">
          <p className="text-xs text-emerald-300/80">
            <span className="font-bold">✓ Tus datos están 100% seguros.</span>{" "}
            Productos, ventas e historial se conservan íntegros sin importar el plan que elijas.
          </p>
        </div>
      </div>
    </div>
  )
}
