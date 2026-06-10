"use client"

import { useEffect, useState } from "react"

/**
 * Elegant MP monogram intro animation shown once when entering the dashboard.
 * Self-draws the M and P strokes, then fades out. Performance-optimized with CSS.
 */
export function LogoIntro({ onDone }: { onDone?: () => void }) {
  const [phase, setPhase] = useState<"draw" | "hold" | "out">("draw")

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 1100)
    const t2 = setTimeout(() => setPhase("out"), 1900)
    const t3 = setTimeout(() => { onDone?.() }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#0B0B0D] transition-opacity duration-500 ${phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/10 blur-[100px] mp-pulse-gold" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Animated MP monogram */}
        <svg width="120" height="120" viewBox="0 0 64 64" className={phase === "hold" ? "logo-intro-glow" : ""}>
          <defs>
            <linearGradient id="introGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E8C84A" />
              <stop offset="50%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#B8960C" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="62" height="62" rx="13" fill="none" stroke="url(#introGold)" strokeWidth="0.8" opacity="0.25" />
          {/* M */}
          <path
            d="M11 45V19l10 14 10-14v26"
            fill="none" stroke="url(#introGold)" strokeWidth="4.2"
            strokeLinecap="round" strokeLinejoin="round"
            className="logo-intro-path"
            style={{ strokeDasharray: 120, strokeDashoffset: 120, animationDelay: "0ms" }}
          />
          {/* P */}
          <path
            d="M38 45V19h8a7 7 0 0 1 0 14h-8"
            fill="none" stroke="url(#introGold)" strokeWidth="4.2"
            strokeLinecap="round" strokeLinejoin="round"
            className="logo-intro-path"
            style={{ strokeDasharray: 90, strokeDashoffset: 90, animationDelay: "350ms" }}
          />
        </svg>

        {/* Word mark */}
        <div className={`flex flex-col items-center transition-all duration-500 ${phase === "draw" ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          <p className="text-sm font-bold tracking-[0.5em] text-[#D4AF37] pl-2">MAHU</p>
          <p className="text-[10px] font-medium tracking-[0.55em] text-[#D4AF37]/55 pl-2 mt-1">PLEXUS</p>
        </div>

        {/* Loading line */}
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-[#2B2B30]">
          <div className="mp-shimmer h-full w-1/2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </div>
    </div>
  )
}
