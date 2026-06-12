"use client"

import { useEffect, useState } from "react"

/**
 * Apple-grade theme toggle — a sliding switch with sun/moon SVG icons,
 * spring-like motion, and a dynamic shadow that follows the thumb.
 * Pure CSS transitions, no extra JS libraries, no bundle weight.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("mp-theme")
    if (saved === "light") {
      setIsDark(false)
      document.documentElement.classList.add("mp-light")
    } else {
      setIsDark(true)
      document.documentElement.classList.remove("mp-light")
    }
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    if (next) {
      document.documentElement.classList.remove("mp-light")
      localStorage.setItem("mp-theme", "dark")
    } else {
      document.documentElement.classList.add("mp-light")
      localStorage.setItem("mp-theme", "light")
    }
  }

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={!isDark}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      className="mp-theme-switch"
      data-dark={isDark}
    >
      {/* Track */}
      <span className="mp-theme-track" aria-hidden="true">
        {/* Sun icon (left) */}
        <span className="mp-theme-ico mp-theme-ico-sun">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
        {/* Moon icon (right) */}
        <span className="mp-theme-ico mp-theme-ico-moon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </span>
      </span>
      {/* Sliding thumb */}
      <span className="mp-theme-thumb" aria-hidden="true">
        {isDark ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2.2"/>
            <path d="M12 2v2.4M12 19.6V22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2 12h2.4M19.6 12H22M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        )}
      </span>
    </button>
  )
}
