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
      showToast(error.message)
      return
    }

    router.push("/dashboard")
  }

  return (
    <main className="relative min-h-screen bg-[#050816] text-white overflow-hidden">

      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">

        <div className="w-full max-w-md rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-8">

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold">
              Acceso al sistema
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Ingresa a tu panel de control
            </p>
          </div>

          <div className="space-y-4">

            <input
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-cyan-400"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/30 border border-white/10 outline-none focus:border-cyan-400"
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 text-black font-semibold transition hover:scale-[1.02]"
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>

          </div>

          <div className="mt-8 text-center text-xs text-white/30 tracking-[0.3em]">
            POWERED BY MAHU PLEXUS
          </div>

        </div>

      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-black/80 border border-white/10 px-5 py-3 rounded-xl">
          {toast}
        </div>
      )}

    </main>
  )
}