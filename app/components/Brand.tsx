export function PoweredByMahuPlexus() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-white/5 px-4 py-2 backdrop-blur-xl">
      <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.85)]" />
      <span className="text-[11px] uppercase tracking-[0.28em] text-white/45">
        Powered by
      </span>
      <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-sm font-semibold text-transparent">
        Mahu Plexus
      </span>
    </div>
  )
}

export function MahuPlexusFooter() {
  return (
    <div className="mt-16 text-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 backdrop-blur-xl">
        <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.85)]" />
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/35">
          Powered by
        </span>
        <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-sm font-semibold text-transparent">
          Mahu Plexus
        </span>
      </div>
    </div>
  )
}