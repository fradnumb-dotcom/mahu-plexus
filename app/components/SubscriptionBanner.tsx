"use client"

import { useRouter } from "next/navigation"

interface SubscriptionBannerProps {
  status: "trial" | "expired" | "suspended"
  daysLeft?: number
  plan?: string | null
}

export function SubscriptionBanner({ status, daysLeft, plan }: SubscriptionBannerProps) {
  const router = useRouter()

  if (status === "expired" || status === "suspended") {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-rose-500/25 bg-rose-500/8 p-3.5">
        <p className="text-xs font-bold text-rose-300">
          {status === "suspended" ? "⏸ Cuenta suspendida" : "⏰ Prueba finalizada"}
        </p>
        <p className="mt-0.5 text-[10px] text-rose-300/65 leading-relaxed">
          {status === "suspended"
            ? "Tu cuenta está suspendida. Reactiva tu plan para continuar."
            : "Tu período de prueba ha finalizado. Elige un plan para continuar."}
        </p>
        <button onClick={() => router.push("/subscription")}
          className="mt-2.5 w-full rounded-lg bg-rose-500 py-1.5 text-[11px] font-bold text-white transition hover:bg-rose-400">
          Ver planes →
        </button>
      </div>
    )
  }

  if (status === "trial" && daysLeft !== undefined) {
    const pct = Math.max(0, Math.min(100, (daysLeft / 3) * 100))
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-[#D4AF37]/18 bg-[#D4AF37]/6 p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]/70">Trial gratuito</p>
          <span className="text-[11px] font-black text-[#D4AF37]">{daysLeft}d</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#2B2B30] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#B8960C] transition-all"
            style={{ width: `${pct}%` }} />
        </div>
        <button onClick={() => router.push("/subscription")}
          className="mt-2 text-[10px] text-[#D4AF37]/60 hover:text-[#D4AF37] transition underline-offset-2 hover:underline">
          Ver planes →
        </button>
      </div>
    )
  }

  return null
}
