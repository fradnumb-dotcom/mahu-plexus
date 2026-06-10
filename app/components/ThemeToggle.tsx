"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
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
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2B2B30] bg-[#141418] text-sm transition hover:border-[#D4AF37]/25 hover:bg-[#2B2B30]"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  )
}
