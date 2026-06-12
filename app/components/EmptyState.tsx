"use client"

import { ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  compact?: boolean
}

/**
 * Premium empty state — replaces plain "No hay datos" text.
 * Icon in a soft glow container, clear hierarchy, optional CTA.
 */
export function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-10" : "py-16"} px-6`}>
      <div className="mp-empty-icon relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/[0.06]">
        <div className="absolute inset-0 rounded-2xl bg-[#D4AF37]/10 blur-xl opacity-50" />
        <div className="relative text-[#D4AF37]/70">
          {icon || (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M3 9h18M8 14h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold text-[#E6E6E6]/80">{title}</p>
      {description && <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#E6E6E6]/40">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
