"use client"

import { memo } from "react"

/**
 * Official-style payment brand marks rendered as clean inline SVG.
 * No external assets, no copyright issues — geometric brand representations.
 */

export function VisaMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-8 w-12 items-center justify-center rounded-md bg-white px-1.5 ${className}`}>
      <svg viewBox="0 0 48 16" className="w-full">
        <text x="24" y="13" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontStyle="italic" fontSize="14" fill="#1A1F71" letterSpacing="0.5">VISA</text>
      </svg>
    </div>
  )
}

export function MastercardMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-8 w-12 items-center justify-center rounded-md bg-white ${className}`}>
      <svg viewBox="0 0 40 24" className="h-5">
        <circle cx="15" cy="12" r="9" fill="#EB001B" />
        <circle cx="25" cy="12" r="9" fill="#F79E1B" />
        <path d="M20 5a9 9 0 0 1 0 14 9 9 0 0 1 0-14z" fill="#FF5F00" />
      </svg>
    </div>
  )
}

export function AmexMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-8 w-12 items-center justify-center rounded-md ${className}`} style={{ background: "#006FCF" }}>
      <svg viewBox="0 0 48 16" className="w-full px-1">
        <text x="24" y="11" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="6.5" fill="#FFFFFF" letterSpacing="0.3">AMEX</text>
      </svg>
    </div>
  )
}

export function YapeMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-8 w-12 items-center justify-center rounded-md ${className}`} style={{ background: "#742384" }}>
      <svg viewBox="0 0 48 16" className="w-full px-1">
        <text x="24" y="11" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="7" fill="#FFFFFF">Yape</text>
      </svg>
    </div>
  )
}

function PaymentMarksBase({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <VisaMark />
      <MastercardMark />
      <AmexMark />
      <YapeMark />
    </div>
  )
}

export const PaymentMarks = memo(PaymentMarksBase)
