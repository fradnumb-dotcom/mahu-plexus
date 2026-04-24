"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("Completa los datos")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      console.error("LOGIN ERROR:", error)
      showToast("Credenciales incorrectas")
      return
    }

    router.push("/dashboard")
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#060913] text-white">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-80px] right-[-60px] h-80 w-80 rounded-full bg-purple-500/10 blur-[140px]" />

        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <p className="select-none bg-gradient-to-r from-white/20 via-cyan-200/12 to-white/20 bg-clip-text text-center text-[82px] font-semibold tracking-[0.32em] text-transparent md:text-[150px]">
              MAHU PLEXUS
            </p>
            <div className="absolute inset-0 blur-2xl opacity-20">
              <p className="select-none text-center text-[82px] font-semibold tracking-[0.32em] text-cyan-200/20 md:text-[150px]">
                MAHU PLEXUS
              </p>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_30%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_430px]">
            <div className="hidden lg:block">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-xl">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.85)]" />
                  <span className="text-[11px] uppercase tracking-[0.32em] text-white/40">
                    Mahu Plexus
                  </span>
                </div>

                <h1 className="mt-8 text-5xl font-semibold leading-[1.03] text-white">
                  Control total
                  <span className="block text-white/70">de tu negocio.</span>
                </h1>

                <p className="mt-5 max-w-md text-base leading-7 text-white/50">
                  Ingresa a tu panel de gestión y administra ventas, productos y operaciones en un solo lugar.
                </p>
              </div>
            </div>

            <div className="w-full">
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_38%)]" />

                <div className="relative">
                  <div className="mb-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur-xl">
                      <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.85)]" />
                      <span className="text-[11px] uppercase tracking-[0.32em] text-white/40">
                        Acceso seguro
                      </span>
                    </div>

                    <h2 className="mt-5 text-3xl font-semibold text-white">
                      Iniciar sesión
                    </h2>

                    <p className="mt-2 text-sm text-white/45">
                      Bienvenido a tu sistema de gestión
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-white/35">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="tu_correo@ejemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400 focus:bg-black/25"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-white/35">
                        Contraseña
                      </label>
                      <input
                        type="password"
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400 focus:bg-black/25"
                      />
                    </div>

                    <button
                      onClick={handleLogin}
                      disabled={loading}
                      className="mt-2 w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-purple-500 px-4 py-3.5 font-semibold text-black shadow-[0_14px_34px_rgba(56,189,248,0.22)] transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loading ? "Ingresando..." : "Entrar al sistema"}
                    </button>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-5 text-center">
                    <p className="text-xs uppercase tracking-[0.34em] text-white/22">
                      Powered by Mahu Plexus
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-center text-sm text-white/30">
                Plataforma de gestión empresarial
              </p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-white/10 bg-black/80 px-5 py-3 text-sm text-white shadow-2xl backdrop-blur-xl">
          {toast}
        </div>
      )}
    </main>
  )
}