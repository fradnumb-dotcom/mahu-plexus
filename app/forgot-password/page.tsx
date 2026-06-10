"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "../lib/supabase"
import { toast } from "../components/Toast"
import { authRedirect } from "../lib/appUrl"

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleReset = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Ingresa un correo válido"); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: authRedirect("/login"),
      })
      if (error) { toast.error("No se pudo enviar el correo"); return }
      setSent(true)
      toast.info("Correo de recuperación enviado")
    } catch { toast.error("Error de conexión") }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-[#0B0B0D] flex items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/5 blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <a href="/landing">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 48, width: "auto" }} />
          </a>
        </div>

        <div className="rounded-[28px] border border-[#D4AF37]/12 bg-[#141418]/90 p-7 shadow-[0_40px_100px_rgba(0,0,0,0.7)] backdrop-blur-3xl">
          {!sent ? (
            <>
              <h1 className="mb-1.5 text-2xl font-black text-[#E6E6E6]">Recuperar acceso</h1>
              <p className="mb-6 text-sm text-[#E6E6E6]/40">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>

              <input type="email" placeholder="Tu correo registrado" value={email}
                onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&handleReset()}
                className="mp-input mb-4" />

              <button onClick={handleReset} disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-sm font-black text-[#0B0B0D] transition hover:shadow-[0_10px_32px_rgba(212,175,55,0.3)] disabled:opacity-60">
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mb-4 text-5xl">📬</div>
              <h2 className="text-xl font-black text-[#E6E6E6] mb-2">¡Correo enviado!</h2>
              <p className="text-sm text-[#E6E6E6]/45 leading-relaxed">
                Revisa tu bandeja de entrada en <strong className="text-[#D4AF37]">{email}</strong> y sigue el enlace para restablecer tu contraseña.
              </p>
              <p className="mt-3 text-xs text-[#E6E6E6]/30">Revisa también tu carpeta de spam.</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link href="/login" className="text-sm text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">
            ← Volver al login
          </Link>
          <a href="https://wa.me/51964271242" target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">¿Necesitas ayuda?</a>
        </div>
      </div>
    </main>
  )
}
