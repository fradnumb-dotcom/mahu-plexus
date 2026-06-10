"use client"

import { memo, useEffect, useRef, useState } from "react"

interface CountUpProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  className?: string
}

/**
 * Animated number counter. Smoothly counts from 0 (or previous value) to target.
 * Uses requestAnimationFrame with easing for 60fps performance.
 */
function CountUpBase({ value, prefix = "", suffix = "", decimals = 0, duration = 900, className = "" }: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    const start = performance.now()

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(progress)
      setDisplay(from + (to - from) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(to)
        prevRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  const formatted = display.toLocaleString("es-PE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return <span className={className}>{prefix}{formatted}{suffix}</span>
}

export const CountUp = memo(CountUpBase)
