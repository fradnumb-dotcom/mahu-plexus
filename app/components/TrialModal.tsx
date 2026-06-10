"use client"

import { useEffect, useState } from "react"

interface TrialModalProps {
  businessName?: string
  trialDays?: number
  onClose: () => void
}

export function TrialModal({ businessName = "tu negocio", trialDays = 3, onClose }: TrialModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  return (
    <div className={`mp-backdrop transition-all duration-280 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className={`relative overflow-hidden rounded-[28px] border border-[#D4AF37]/20 bg-[#141418]/94 w-full max-w-md p-8 text-center shadow-[0_60px_140px_rgba(0,0,0,0.8)] backdrop-blur-3xl transition-all duration-280 ${visible ? "mp-modal" : "opacity-0 scale-90"}`}>
        {/* Glow orb */}
        <div className="mp-pulse-gold pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#D4AF37]/12 blur-3xl" />
        {/* Top line */}
        <div className="absolute left-1/4 right-1/4 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />

        <div className="relative">
          {/* Logo */}
          <div className="flex justify-center mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 52, width: "auto", objectFit: "contain" }} className="mp-logo-glow" />
          </div>

          {/* Days badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-5 py-2 mb-5">
            <span className="text-2xl font-black text-[#D4AF37]">{trialDays}</span>
            <span className="text-sm font-semibold text-[#D4AF37]/80">días gratis</span>
          </div>

          <h2 className="text-2xl font-black text-[#E6E6E6] mb-2">
            ¡Bienvenido a Mahu Plexus!
          </h2>
          <p className="text-sm text-[#E6E6E6]/55 leading-relaxed mb-6">
            Has recibido <strong className="text-[#D4AF37]">{trialDays} días gratuitos</strong> para probar todas las funciones premium de Mahu Plexus.<br/>
            Sin restricciones. Sin tarjeta de crédito.
          </p>

          {/* Features included */}
          <div className="mb-6 rounded-2xl border border-[#2B2B30] bg-[#0B0B0D]/40 p-4 text-left space-y-2.5">
            {[
              "Ventas ilimitadas con recibos PDF",
              "Inventario completo con historial",
              "Múltiples vendedores",
              "Reportes y exportaciones",
              "Soporte prioritario",
            ].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37] text-[10px] font-black shrink-0">✓</div>
                <span className="text-xs text-[#E6E6E6]/65">{f}</span>
              </div>
            ))}
          </div>

          <button onClick={close}
            className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-sm font-black text-[#0B0B0D] shadow-[0_8px_28px_rgba(212,175,55,0.25)] transition hover:shadow-[0_12px_40px_rgba(212,175,55,0.38)] hover:-translate-y-0.5">
            Comenzar ahora →
          </button>

          <p className="mt-3.5 text-[10px] text-[#E6E6E6]/25">
            Al finalizar la prueba podrás elegir un plan. Tus datos nunca se eliminan.
          </p>
        </div>
      </div>
    </div>
  )
}
