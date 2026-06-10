"use client"

import { MahuPlexusIcon } from "./Logo"

interface LoadingScreenProps {
  message?: string
}

/**
 * Global reusable loader with the MP monogram.
 * Works in both light and dark mode (uses theme-aware surfaces).
 */
export function LoadingScreen({ message = "Cargando sistema..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0B0B0D]/97 backdrop-blur-2xl">
      <div className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-[#D4AF37]/15 bg-[#141418]/90 p-8 text-center shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
        {/* Glow */}
        <div className="mp-pulse-gold absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-3xl" />

        <div className="relative">
          {/* MP monogram (crisp SVG, theme-independent) */}
          <div className="flex justify-center mb-5">
            <div className="mp-logo-glow">
              <MahuPlexusIcon size={56} />
            </div>
          </div>

          {/* Spinner */}
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
            <div className="mp-spin h-12 w-12 rounded-full border-2 border-[#D4AF37]/15 border-t-[#D4AF37]" />
          </div>

          <p className="text-sm font-semibold text-[#E6E6E6]">{message}</p>
          <p className="mt-1.5 text-xs text-[#E6E6E6]/38">Conectando con Mahu Plexus</p>

          {/* Shimmer bar */}
          <div className="relative mt-5 h-1 overflow-hidden rounded-full bg-[#2B2B30]">
            <div className="mp-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}
