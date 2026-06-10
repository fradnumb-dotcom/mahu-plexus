"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { MahuPlexusLogo } from "./Logo"
import { TrialCountdown } from "./TrialCountdown"
import { ThemeToggle } from "./ThemeToggle"

interface SidebarProps {
  activePage:  "dashboard" | "sales" | "sellers" | "settings" | "subscription"
  role?:       "owner" | "seller" | null
  subStatus?:  string | null
  subEndsAt?:  string | null
}

function IconDashboard()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8"/></svg> }
function IconSales()        { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8"/><path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function IconSellers()      { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function IconSubscription() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg> }
function IconSettings()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06-.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="currentColor" strokeWidth="1.8"/></svg> }
function IconSignOut()      { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> }

type NavLink = {
  href:  string
  id:    "dashboard" | "sales" | "sellers" | "settings" | "subscription"
  label: string
  icon:  React.ReactNode
}

const OWNER_LINKS: NavLink[] = [
  { href: "/dashboard",    id: "dashboard",    label: "Dashboard",     icon: <IconDashboard /> },
  { href: "/sales",        id: "sales",        label: "Ventas",        icon: <IconSales /> },
  { href: "/sellers",      id: "sellers",      label: "Vendedores",    icon: <IconSellers /> },
  { href: "/subscription", id: "subscription", label: "Suscripción",   icon: <IconSubscription /> },
  { href: "/settings",     id: "settings",     label: "Configuración", icon: <IconSettings /> },
]

const SELLER_LINKS: NavLink[] = [
  { href: "/sales", id: "sales", label: "Ventas", icon: <IconSales /> },
]

export function Sidebar({ activePage, role, subStatus, subEndsAt }: SidebarProps) {
  const router = useRouter()
  const links  = role === "seller" ? SELLER_LINKS : OWNER_LINKS

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const showCountdown = subStatus === "trial" && subEndsAt

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 xl:flex flex-col border-r border-[#D4AF37]/10 bg-[#0B0B0D]/96 backdrop-blur-2xl">
      {/* Logo */}
      <div className="px-5 py-5">
        <a href="/dashboard" className="flex items-center gap-3 p-3 rounded-2xl border border-[#D4AF37]/10 bg-[#D4AF37]/5 transition hover:border-[#D4AF37]/18 hover:bg-[#D4AF37]/8">
          <MahuPlexusLogo size={34} showText />
        </a>
      </div>

      {/* System status */}
      <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-[#D4AF37]/10 bg-[#141418] px-3 py-2">
        <span className="relative flex h-2 w-2">
          <span className="mp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#E6E6E6]/38">Sistema activo</span>
      </div>

      {/* Trial countdown */}
      {showCountdown && <TrialCountdown endsAt={subEndsAt!} status={subStatus!} />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-1 pb-2">
        {links.map(link => {
          const isActive = activePage === link.id
          return (
            <a key={link.href} href={link.href} className={`mp-sidebar-link ${isActive ? "active" : ""}`}>
              <span className={`grid h-7 w-7 place-items-center rounded-lg transition ${isActive ? "bg-[#D4AF37]/14 text-[#D4AF37]" : "bg-[#141418] text-[#E6E6E6]/38"}`}>
                {link.icon}
              </span>
              {link.label}
              {/* Subscription alert dot */}
              {link.id === "subscription" && (subStatus === "trial") && (
                <span className="ml-auto h-2 w-2 rounded-full bg-[#D4AF37] mp-pulse-gold" />
              )}
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-[#D4AF37]/10 bg-[#141418] px-3 py-2.5 text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#E6E6E6]/22">Powered by</p>
            <p className="mt-0.5 text-xs font-semibold text-[#D4AF37]/65">Mahu Plexus</p>
          </div>
          <ThemeToggle />
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E6E6E6]/10 bg-[#141418] px-4 py-2.5 text-sm font-medium text-[#E6E6E6]/55 transition hover:bg-[#2B2B30] hover:text-[#E6E6E6]">
          <IconSignOut />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
