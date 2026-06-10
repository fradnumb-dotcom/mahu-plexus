import { MahuPlexusIcon } from "./components/Logo"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0D]">
      <div className="flex flex-col items-center gap-5">
        <div className="mp-logo-glow">
          <MahuPlexusIcon size={56} />
        </div>
        <div className="h-0.5 w-40 overflow-hidden rounded-full bg-[#2B2B30]">
          <div className="mp-shimmer h-full w-1/2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        </div>
      </div>
    </div>
  )
}
