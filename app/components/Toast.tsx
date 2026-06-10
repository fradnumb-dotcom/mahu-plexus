"use client"

import { useEffect, useState, useCallback } from "react"

export type ToastType =
  | "create" | "update" | "edit" | "delete" | "export"
  | "error" | "success" | "sale" | "info" | "subscription" | "warning"

export type ToastItem = {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// ── Global event bus ──────────────────────────────────────────────
const listeners: ((t: ToastItem) => void)[] = []

export function toast(message: string, type: ToastType = "success", duration = 2600) {
  const item: ToastItem = { id: Math.random().toString(36).slice(2), message, type, duration }
  listeners.forEach(fn => fn(item))
}

// Convenience wrappers
toast.create       = (m: string) => toast(m, "create")
toast.update       = (m: string) => toast(m, "update")
toast.edit         = (m: string) => toast(m, "edit")
toast.delete       = (m: string) => toast(m, "delete")
toast.export       = (m: string) => toast(m, "export")
toast.error        = (m: string) => toast(m, "error", 3500)
toast.sale         = (m: string) => toast(m, "sale")
toast.info         = (m: string) => toast(m, "info")
toast.subscription = (m: string) => toast(m, "subscription")
toast.warning      = (m: string) => toast(m, "warning")

// ── Config ────────────────────────────────────────────────────────
type Cfg = { icon: string; accent: string; bg: string; border: string; bar: string }

const CFG: Record<ToastType, Cfg> = {
  create:       { icon: "✦", accent: "#D4AF37", bg: "rgba(212,175,55,0.08)", border: "rgba(212,175,55,0.22)", bar: "#D4AF37" },
  update:       { icon: "↻", accent: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.22)", bar: "#F59E0B" },
  edit:         { icon: "✎", accent: "#F59E0B", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.18)", bar: "#F59E0B" },
  delete:       { icon: "✕", accent: "#EF4444", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.22)",  bar: "#EF4444" },
  export:       { icon: "↓", accent: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.22)", bar: "#3B82F6" },
  error:        { icon: "!",  accent: "#EF4444", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.28)",  bar: "#EF4444" },
  success:      { icon: "✓", accent: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)", bar: "#10B981" },
  sale:         { icon: "◈", accent: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.22)", bar: "#10B981" },
  info:         { icon: "i",  accent: "#60A5FA", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.22)", bar: "#60A5FA" },
  subscription: { icon: "★", accent: "#D4AF37", bg: "rgba(212,175,55,0.10)", border: "rgba(212,175,55,0.28)", bar: "#D4AF37" },
  warning:      { icon: "⚠", accent: "#F59E0B", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)", bar: "#F59E0B" },
}

// ── Single toast card ─────────────────────────────────────────────
function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false)
  const cfg = CFG[item.type]
  const dur = item.duration ?? 2600

  const remove = useCallback(() => {
    setRemoving(true)
    setTimeout(() => onRemove(item.id), 320)
  }, [item.id, onRemove])

  useEffect(() => {
    const t = setTimeout(remove, dur)
    return () => clearTimeout(t)
  }, [remove, dur])

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border shadow-[0_20px_60px_rgba(0,0,0,0.55)] w-80 cursor-pointer transition-all duration-300 ${removing ? "opacity-0 translate-x-8 scale-95" : "mp-toast"}`}
      style={{ background: "rgba(16,16,20,0.96)", borderColor: cfg.border, backdropFilter: "blur(24px)" }}
      onClick={remove}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black"
          style={{ background: cfg.bg, color: cfg.accent, border: `1px solid ${cfg.border}` }}>
          {cfg.icon}
        </div>
        {/* Text */}
        <div className="flex-1 min-w-0 pt-0.5 pr-1">
          <p className="text-sm font-semibold text-[#E6E6E6] leading-snug">{item.message}</p>
          <p className="mt-0.5 text-[11px]" style={{ color: cfg.accent, opacity: 0.7 }}>
            {item.type === "error" ? "Revisa la acción e inténtalo de nuevo"
              : item.type === "delete" ? "Registrado en historial operativo"
              : item.type === "sale" ? "Inventario actualizado automáticamente"
              : item.type === "subscription" ? "Tu acceso está activo"
              : item.type === "export" ? "Archivo generado correctamente"
              : "Mahu Plexus · Acción completada"}
          </p>
        </div>
        {/* Close */}
        <button className="shrink-0 text-[#E6E6E6]/30 hover:text-[#E6E6E6]/70 text-xs mt-0.5 transition">✕</button>
      </div>
      {/* Progress bar */}
      <div className="h-[2px]" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="mp-progress h-full rounded-full" style={{ background: cfg.accent, animationDuration: `${dur}ms` }} />
      </div>
    </div>
  )
}

// ── Toast container ───────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler = (t: ToastItem) => {
      setToasts(prev => [t, ...prev].slice(0, 5))
    }
    listeners.push(handler)
    return () => {
      const i = listeners.indexOf(handler)
      if (i !== -1) listeners.splice(i, 1)
    }
  }, [])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onRemove={remove} />
        </div>
      ))}
    </div>
  )
}

// ── Legacy single Toast (backwards compat) ─────────────────────────
export function Toast({ message, type }: { message: string; type: ToastType }) {
  const cfg = CFG[type]
  return (
    <div className="fixed bottom-6 right-6 z-50 mp-toast">
      <div className="relative overflow-hidden rounded-2xl border bg-[#10101440] w-80"
        style={{ borderColor: cfg.border, backdropFilter: "blur(24px)" }}>
        <div className="flex items-start gap-3 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black"
            style={{ background: cfg.bg, color: cfg.accent }}>
            {cfg.icon}
          </div>
          <p className="text-sm font-semibold text-[#E6E6E6] leading-snug pt-0.5">{message}</p>
        </div>
        <div className="h-[2px]" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="mp-progress h-full" style={{ background: cfg.bar }} />
        </div>
      </div>
    </div>
  )
}
