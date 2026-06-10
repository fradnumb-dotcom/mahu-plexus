"use client"

import { useRouter } from "next/navigation"

interface MobileNavProps {
  active: "dashboard" | "sales" | "sellers" | "settings" | "subscription"
  role?: "owner" | "seller" | null
}

function Icon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none" } as const
  switch (name) {
    case "dashboard": return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg>
    case "sales": return <svg {...common}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case "sellers": return <svg {...common}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>
    case "subscription": return <svg {...common}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
    case "settings": return <svg {...common}><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg>
    default: return null
  }
}

const OWNER = [
  { id: "dashboard", href: "/dashboard", label: "Inicio" },
  { id: "sales", href: "/sales", label: "Ventas" },
  { id: "sellers", href: "/sellers", label: "Equipo" },
  { id: "subscription", href: "/subscription", label: "Plan" },
  { id: "settings", href: "/settings", label: "Ajustes" },
] as const

const SELLER = [
  { id: "sales", href: "/sales", label: "Ventas" },
] as const

/**
 * Bottom tab navigation for mobile/tablet (hidden on xl where the Sidebar shows).
 * Ensures navigation is always reachable below 1280px.
 */
export function MobileNav({ active, role }: MobileNavProps) {
  const router = useRouter()
  const items = role === "seller" ? SELLER : OWNER

  return (
    <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#D4AF37]/12 bg-[#0B0B0D]/95 backdrop-blur-2xl">
      <div className="flex items-stretch justify-around px-1 py-1.5" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {items.map(it => {
          const isActive = active === it.id
          return (
            <button
              key={it.id}
              onClick={() => router.push(it.href)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition ${isActive ? "text-[#D4AF37]" : "text-[#E6E6E6]/45"}`}
            >
              <Icon name={it.id} />
              <span className="text-[9px] font-medium tracking-wide">{it.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
