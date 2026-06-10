"use client"

import { memo } from "react"

interface UsageMeterProps {
  label:    string
  used:     number
  limit:    number
  pct:      number
  icon?:    string
}

function UsageMeterBase({ label, used, limit, pct, icon = "◉" }: UsageMeterProps) {
  const isWarning  = pct >= 70 && pct < 90
  const isCritical = pct >= 90

  const barColor = isCritical
    ? "bg-gradient-to-r from-rose-500 to-rose-400"
    : isWarning
    ? "bg-gradient-to-r from-amber-500 to-amber-400"
    : "bg-gradient-to-r from-[#D4AF37] to-[#E8C84A]"

  const textColor = isCritical ? "text-rose-300" : isWarning ? "text-amber-300" : "text-[#D4AF37]"

  return (
    <div className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3.5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#E6E6E6]/40 flex items-center gap-1.5">
          <span className={textColor}>{icon}</span>
          {label}
        </span>
        <span className={`text-[11px] font-black ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#2B2B30] overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-[#E6E6E6]/30 tabular-nums">
        {used.toLocaleString()} / {limit >= 99999 ? "∞" : limit.toLocaleString()}
        {isCritical && <span className="ml-1.5 text-rose-300/80 font-semibold">¡Límite próximo!</span>}
        {isWarning && !isCritical && <span className="ml-1.5 text-amber-300/80">Advertencia</span>}
      </p>
    </div>
  )
}

export const UsageMeter = memo(UsageMeterBase)
