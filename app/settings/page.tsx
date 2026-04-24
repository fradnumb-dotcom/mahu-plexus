"use client"

import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [footer, setFooter] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined" ? localStorage.getItem("theme") : null

    const dark =
      savedTheme === "light"
        ? false
        : savedTheme === "dark"
          ? true
          : typeof document !== "undefined"
            ? document.documentElement.classList.contains("dark")
            : true

    setIsDark(dark)

    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", dark)
      document.documentElement.classList.toggle("light", !dark)
    }
  }, [])

  useEffect(() => {
    load()
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev

      if (typeof window !== "undefined") {
        localStorage.setItem("theme", next ? "dark" : "light")
      }

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next)
        document.documentElement.classList.toggle("light", !next)
      }

      return next
    })
  }

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.business_id) {
      alert("No se pudo cargar el perfil")
      return
    }

    if (profile.role !== "owner") {
      router.push("/sales")
      return
    }

    setBusinessId(profile.business_id)

    const { data, error } = await supabase
      .from("businesses")
      .select("name, phone, address, receipt_footer, logo_url")
      .eq("id", profile.business_id)
      .single()

    if (error) {
      console.error(error)
      alert("No se pudo cargar la tienda")
      return
    }

    if (data) {
      setName(data.name || "")
      setPhone(data.phone || "")
      setAddress(data.address || "")
      setFooter(data.receipt_footer || "")
      setLogoUrl(data.logo_url || "")
    }
  }

  const handleUpload = async (file: File) => {
    try {
      if (!businessId) {
        alert("No se encontró el negocio")
        return null
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png"
      const fileName = `${businessId}_${Date.now()}.${fileExt}`
      const filePath = `public/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

      if (uploadError) {
        console.error(uploadError)
        alert("Error subiendo imagen")
        return null
      }

      const { data } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error(error)
      alert("Error subiendo imagen")
      return null
    }
  }

  const handleSave = async () => {
    if (!businessId) return

    setLoading(true)

    const { error } = await supabase
      .from("businesses")
      .update({
        name,
        phone,
        address,
        receipt_footer: footer,
        logo_url: logoUrl || null,
      })
      .eq("id", businessId)

    setLoading(false)

    if (error) {
      console.error(error)
      alert("Error al guardar")
    } else {
      alert("Guardado correctamente")
    }
  }

  const surfaceClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-white shadow-sm"

  const inputClass = isDark
    ? "border-white/10 bg-black/30 text-white placeholder:text-white/30"
    : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"

  const titleTextClass = isDark ? "text-white" : "text-gray-900"
  const softTextClass = isDark ? "text-white/50" : "text-gray-500"

  return (
    <main
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#050816] text-white" : "bg-[#f6f8fc] text-gray-900"
      }`}
    >
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-xl ${
                isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
              <span
                className={`text-[11px] uppercase tracking-[0.28em] ${
                  isDark ? "text-white/40" : "text-gray-500"
                }`}
              >
                Powered by
              </span>
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-sm font-semibold text-transparent">
                Mahu Plexus
              </span>
            </div>

            <h1 className={`mt-5 text-3xl font-semibold md:text-4xl ${titleTextClass}`}>
              Configuración de tienda
            </h1>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Personaliza tu negocio, logo y datos que aparecerán en el sistema.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              {isDark ? "☀️ Claro" : "🌙 Oscuro"}
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              Volver al panel
            </button>
          </div>
        </div>

        <div className={`rounded-3xl border p-6 backdrop-blur-xl md:p-8 ${surfaceClass}`}>
          <div className="mb-6">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>
              Datos del negocio
            </h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Aquí puedes actualizar la información principal de tu tienda.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del negocio"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Teléfono"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 md:col-span-2 ${inputClass}`}
            />

            <textarea
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Texto final del comprobante"
              rows={4}
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 md:col-span-2 ${inputClass}`}
            />
          </div>

          <div className="mt-8">
            <h3 className={`text-lg font-semibold ${titleTextClass}`}>Logo del negocio</h3>
            <p className={`mt-1 text-sm ${softTextClass}`}>
              Sube una imagen para usarla en tu marca y en los comprobantes.
            </p>

            <div
              className={`mt-4 rounded-3xl border p-5 ${
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              {logoUrl ? (
                <div className="mb-4 flex justify-center">
                  <div
                    className={`flex h-36 w-full max-w-xs items-center justify-center rounded-2xl border ${
                      isDark
                        ? "border-white/10 bg-white/5"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <img
                      src={logoUrl}
                      alt="Logo del negocio"
                      className="max-h-24 max-w-[220px] object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={`mb-4 flex h-36 w-full items-center justify-center rounded-2xl border border-dashed text-center ${
                    isDark
                      ? "border-white/10 bg-white/[0.03] text-white/40"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  Aún no has subido un logo
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className={`block w-full text-sm ${
                  isDark ? "text-white/70 file:text-white" : "text-gray-600"
                } file:mr-4 file:rounded-xl file:border-0 file:px-4 file:py-3 file:text-sm file:font-semibold ${
                  isDark
                    ? "file:bg-white/10 file:text-white hover:file:bg-white/20"
                    : "file:bg-gray-200 file:text-gray-900 hover:file:bg-gray-300"
                }`}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return

                  const uploadedUrl = await handleUpload(file)

                  if (uploadedUrl) {
                    setLogoUrl(uploadedUrl)
                  }
                }}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-8 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01] disabled:opacity-70"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        <div className="mt-16 text-center">
          <p className={`text-xs uppercase tracking-[0.35em] ${isDark ? "text-white/25" : "text-gray-400"}`}>
            Powered by Mahu Plexus
          </p>
        </div>
      </div>
    </main>
  )
}