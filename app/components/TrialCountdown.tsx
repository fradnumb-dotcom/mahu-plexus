"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

interface TrialCountdownProps {
  endsAt: string    // ISO string
  status: string
}

function pad(n: number) { return String(n).padStart(2, "0") }

export function TrialCountdown({ endsAt, status }: TrialCountdownProps) {
  const router = useRouter()
  const [d, setD] = useState(0)
  const [h, setH] = useState(0)
  const [m, setM] = useState(0)
  const [s, setS] = useState(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const calc = () => {
      const ms = Math.max(0, new Date(endsAt).getTime() - Date.now())
      if (ms === 0) { setExpired(true); return }
      setD(Math.floor(ms / 86400000))
      setH(Math.floor((ms % 86400000) / 3600000))
      setM(Math.floor((ms % 3600000) / 60000))
      setS(Math.floor((ms % 60000) / 1000))
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (status !== "trial") return null

  const isLow = d === 0 && h < 12  // less than 12 hours → red

  return (
    <div className={`mx-4 mb-4 rounded-2xl border p-3.5 ${isLow ? "border-rose-500/25 bg-rose-500/7" : "border-[#D4AF37]/18 bg-[#D4AF37]/6"}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${isLow ? "text-rose-300/80" : "text-[#D4AF37]/75"}`}>
        {expired ? "⏰ Trial expirado" : "⏳ Trial gratuito"}
      </p>

      {!expired ? (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {[["D", d], ["H", h], ["M", m], ["S", s]].map(([label, val]) => (
              <div key={label as string} className={`rounded-xl border py-2 text-center ${isLow ? "border-rose-500/20 bg-rose-500/10" : "border-[#D4AF37]/15 bg-[#D4AF37]/8"}`}>
                <p className={`text-base font-black tabular-nums ${isLow ? "text-rose-300" : "text-[#D4AF37]"}`}>
                  {pad(val as number)}
                </p>
                <p className={`text-[8px] uppercase tracking-widest ${isLow ? "text-rose-300/55" : "text-[#D4AF37]/50"}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
          {isLow && (
            <p className="text-[10px] text-rose-300/70 mb-2 text-center">
              ¡Tiempo casi agotado!
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-rose-300/70 mb-2">Tu prueba ha finalizado.</p>
      )}

      <button
        onClick={() => router.push("/subscription")}
        className={`w-full rounded-lg py-1.5 text-[11px] font-bold transition ${
          isLow || expired
            ? "bg-rose-500 text-white hover:bg-rose-400"
            : "border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/18"
        }`}
      >
        {expired ? "Elige un plan →" : "Actualizar plan →"}
      </button>
    </div>
  )
}
