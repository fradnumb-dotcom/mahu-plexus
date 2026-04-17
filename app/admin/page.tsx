"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(""), 3000)
  }

  const handleCreateClient = async () => {
    if (!fullName || !email || !password || !businessName) {
      showToast("Completa todos los campos")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/create-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          business_name: businessName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudo crear el cliente")
        setLoading(false)
        return
      }

      showToast("Cliente creado correctamente")
      setFullName("")
      setEmail("")
      setPassword("")
      setBusinessName("")
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white overflow-hidden relative">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-2xl">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
              <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                Panel privado
              </span>
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-sm font-semibold text-transparent">
                Mahu Plexus
              </span>
            </div>

            <h1 className="mt-6 text-3xl font-semibold text-white md:text-4xl">
              Crear nuevo cliente
            </h1>

            <p className="mt-2 text-sm text-white/50">
              Registro manual de clientes
            </p>
          </div>

          <div className="grid gap-4">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo"
              type="email"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              type="password"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nombre del negocio"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <button
              onClick={handleCreateClient}
              disabled={loading}
              className="mt-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01] disabled:opacity-70"
            >
              {loading ? "Creando cliente..." : "Crear cliente"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 font-medium text-white transition hover:bg-white/20"
            >
              Volver al panel
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-white/25">
              Powered by Mahu Plexus
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-2xl border border-white/10 bg-black/80 px-6 py-4 text-white shadow-2xl backdrop-blur-xl">
          {toast}
        </div>
      )}
    </main>
  )
}