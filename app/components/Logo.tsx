"use client"

interface LogoProps {
  size?: number
  showText?: boolean
  className?: string
}

/**
 * Mahu Plexus — MP monogram (pure optimized SVG, no external assets).
 * Full M (4 strokes) + clear P. Reads unambiguously as "MP".
 * viewBox 0-64. M occupies x:11-31, P occupies x:38-54.
 */
function MPMonogram({ size = 40, gid = "" }: { size?: number; gid?: string }) {
  const id = `mpGold-${gid || size}`
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mahu Plexus MP">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8C84A" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#B8960C" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="14" fill="#0B0B0D" />
      <rect x="2" y="2" width="60" height="60" rx="13" fill="none" stroke={`url(#${id})`} strokeWidth="1" opacity="0.35" />
      {/* Full M — 4 strokes */}
      <path d="M11 45V19l10 14 10-14v26" fill="none" stroke={`url(#${id})`} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* P — vertical + bowl */}
      <path d="M38 45V19h8a7 7 0 0 1 0 14h-8" fill="none" stroke={`url(#${id})`} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MahuPlexusLogo({ size = 40, showText = true, className = "" }: LogoProps) {
  if (showText) {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        <MPMonogram size={size} />
        <div className="leading-none">
          <p className="text-sm font-bold tracking-[0.32em] text-[#D4AF37]" style={{ fontFamily: "'Space Grotesk','Poppins',sans-serif" }}>MAHU</p>
          <p className="mt-0.5 text-[10px] font-medium tracking-[0.42em] text-[#D4AF37]/55">PLEXUS</p>
        </div>
      </div>
    )
  }
  return (
    <div className={className}>
      <MPMonogram size={size} />
    </div>
  )
}

export function MahuPlexusIcon({ size = 32 }: { size?: number }) {
  return <MPMonogram size={size} gid="icon" />
}

export function MahuPlexusLogoFull({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <MPMonogram size={72} gid="full" />
      <div className="text-center leading-none">
        <p className="text-lg font-bold tracking-[0.4em] text-[#D4AF37] pl-2" style={{ fontFamily: "'Space Grotesk','Poppins',sans-serif" }}>MAHU</p>
        <p className="mt-1 text-xs font-medium tracking-[0.5em] text-[#D4AF37]/55 pl-2">PLEXUS</p>
      </div>
    </div>
  )
}
