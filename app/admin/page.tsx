"use client"

import { useState } from "react"
import { MahuPlexusLogo } from "../components/Logo"

export default function AdminPage() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [created, setCreated] = useState<{ user_id: string; business_id: string } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const handleCreate = async () => {
    if (!email || !password || !fullName || !businessName) {
      showToast("Completa todos los campos", false)
      return
    }
    if (password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, business_name: businessName, require_verification: false }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || "Error al crear cliente", false); return }
      setCreated({ user_id: data.user_id, business_id: data.business_id })
      showToast("Cliente creado correctamente ✓")
      setFullName(""); setEmail(""); setPassword(""); setBusinessName("")
    } catch { showToast("Error de conexión", false) }
    finally { setLoading(false) }
  }

  const inp = "rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-4 py-3 text-sm text-[#E6E6E6] outline-none transition placeholder:text-[#E6E6E6]/25 focus:border-[#D4AF37]/50 w-full"

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center gap-3 mb-8">
          <MahuPlexusLogo size={44} showText={true} />
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/30">Panel de administración</p>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#141418]/80 p-6 backdrop-blur-xl">
          <p className="mb-4 text-sm font-bold text-[#E6E6E6]">Crear nuevo cliente</p>
          <p className="mb-5 text-xs text-[#E6E6E6]/40">Crea una cuenta de dueño con su negocio asociado. Este panel es solo para administradores de Mahu Plexus.</p>

          <div className="space-y-3">
            <input placeholder="Nombre completo" value={fullName} onChange={e => setFullName(e.target.value)} className={inp} />
            <input placeholder="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
            <input placeholder="Contraseña (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)} className={inp} />
            <input placeholder="Nombre del negocio" value={businessName} onChange={e => setBusinessName(e.target.value)} className={inp} />
          </div>

          <button onClick={handleCreate} disabled={loading}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3 text-sm font-bold text-[#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,175,55,0.3)] disabled:opacity-60">
            {loading ? "Creando..." : "Crear cliente"}
          </button>
        </div>

        {created && (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5">
            <p className="text-sm font-bold text-emerald-300 mb-2">Cliente creado ✓</p>
            <p className="text-[10px] font-mono text-[#E6E6E6]/50">User ID: {created.user_id}</p>
            <p className="text-[10px] font-mono text-[#E6E6E6]/50">Business ID: {created.business_id}</p>
          </div>
        )}

        <div className="text-center">
          <a href="/login" className="text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] transition">← Volver al login</a>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 mp-slide-up flex items-center gap-3 rounded-2xl border px-4 py-3 backdrop-blur-xl ${toast.ok ? "border-[#D4AF37]/25 bg-[#141418]/95" : "border-rose-500/25 bg-[#141418]/95"}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${toast.ok ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-rose-500/15 text-rose-300"}`}>
            {toast.ok ? "✓" : "!"}
          </span>
          <p className="text-sm font-medium text-[#E6E6E6] max-w-xs">{toast.msg}</p>
        </div>
      )}
    </main>
  )
}
