"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Seller = {
  id: string
  email?: string | null
  full_name?: string | null
  role?: string | null
  active?: boolean | null
}

export default function SellersPage() {
  const router = useRouter()

  const [isDark, setIsDark] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("123456")
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState("")
  const [sellers, setSellers] = useState<Seller[]>([])

  const [editingSellerId, setEditingSellerId] = useState<string | null>(null)
  const [editingSellerName, setEditingSellerName] = useState("")

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(""), 2500)
  }

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

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setOwnerId(user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("business_id, role")
        .eq("id", user.id)
        .single()

      if (error || !data) {
        console.error(error)
        showToast("No se pudo cargar el perfil")
        return
      }

      setBusinessId(data.business_id || null)
      setRole(data.role || null)

      if (data.role !== "owner") {
        router.push("/sales")
        return
      }

      if (data.business_id) {
        await loadSellers(data.business_id)
      }
    }

    load()
  }, [router])

  const loadSellers = async (currentBusinessId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, active")
      .eq("business_id", currentBusinessId)
      .eq("role", "seller")
      .order("id", { ascending: false })

    if (error) {
      console.error(error)
      showToast(error.message || "No se pudieron cargar los vendedores")
      return
    }

    setSellers(data || [])
  }

  const handleCreateSeller = async () => {
    if (!businessId || !ownerId) {
      showToast("No se pudo identificar el negocio")
      return
    }

    if (!email || !password) {
      showToast("Completa correo y contraseña")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/create-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          business_id: businessId,
          owner_id: ownerId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        showToast(data.error || "No se pudo crear el vendedor")
        return
      }

      showToast("Vendedor creado correctamente")
      setFullName("")
      setEmail("")
      setPassword("123456")
      await loadSellers(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSeller = async (sellerId: string) => {
    if (!businessId) return

    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este vendedor? Esta acción no se puede deshacer."
    )

    if (!confirmed) return

    try {
      const res = await fetch("/api/delete-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: sellerId }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        showToast(data.error || "No se pudo eliminar el vendedor")
        return
      }

      showToast("Vendedor eliminado")
      await loadSellers(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleResetPassword = async (sellerEmail?: string | null) => {
    if (!sellerEmail) {
      showToast("Este vendedor no tiene correo registrado")
      return
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(sellerEmail, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/login`
            : undefined,
      })

      if (error) {
        console.error(error)
        showToast("No se pudo enviar el correo de recuperación")
        return
      }

      showToast("Correo de recuperación enviado")
    } catch (error) {
      console.error(error)
      showToast("Error al enviar recuperación")
    }
  }

  const startEditSeller = (seller: Seller) => {
    setEditingSellerId(seller.id)
    setEditingSellerName(seller.full_name || "")
  }

  const cancelEditSeller = () => {
    setEditingSellerId(null)
    setEditingSellerName("")
  }

  const handleUpdateSeller = async (sellerId: string) => {
    if (!businessId) return

    try {
      const res = await fetch("/api/update-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sellerId,
          full_name: editingSellerName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        showToast(data.error || "No se pudo actualizar el vendedor")
        return
      }

      showToast("Vendedor actualizado")
      setEditingSellerId(null)
      setEditingSellerName("")
      await loadSellers(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleToggleSeller = async (sellerId: string, nextActive: boolean) => {
    if (!businessId) return

    try {
      const res = await fetch("/api/toggle-seller", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: sellerId,
          active: nextActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error(data)
        showToast(data.error || "No se pudo actualizar el estado")
        return
      }

      showToast(nextActive ? "Vendedor activado" : "Vendedor desactivado")
      await loadSellers(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const surfaceClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-white shadow-sm"

  const cardClass = isDark
    ? "border-white/10 bg-black/20"
    : "border-gray-200 bg-gray-50"

  const inputClass = isDark
    ? "border-white/10 bg-black/30 text-white placeholder:text-white/30"
    : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"

  const titleTextClass = isDark ? "text-white" : "text-gray-900"
  const softTextClass = isDark ? "text-white/45" : "text-gray-500"

  if (role === "seller") return null

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

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
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
              Crear vendedores
            </h1>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Solo el dueño puede registrar nuevos vendedores para su tienda.
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

            <a
              href="/dashboard"
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              Volver al panel
            </a>
          </div>
        </div>

        <div className={`mb-8 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>
              Nuevo vendedor
            </h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Registra un usuario vendedor con acceso solo a ventas y creación de productos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre completo"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo del vendedor"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
          </div>

          <button
            onClick={handleCreateSeller}
            disabled={loading}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01] disabled:opacity-70"
          >
            {loading ? "Creando vendedor..." : "Crear vendedor"}
          </button>
        </div>

        <div className={`rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>
              Vendedores registrados
            </h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Lista actual de vendedores asociados a tu negocio.
            </p>
          </div>

          {sellers.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${cardClass}`}>
              <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                Aún no hay vendedores registrados
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sellers.map((seller) => (
                <div key={seller.id} className={`rounded-2xl border p-5 ${cardClass}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      {editingSellerId === seller.id ? (
                        <>
                          <p className={`mb-2 text-sm ${softTextClass}`}>Editar nombre</p>
                          <input
                            value={editingSellerName}
                            onChange={(e) => setEditingSellerName(e.target.value)}
                            placeholder="Nombre completo"
                            className={`w-full rounded-2xl border p-3 outline-none focus:border-cyan-400 ${inputClass}`}
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-lg font-semibold ${titleTextClass}`}>
                              {seller.full_name || "Sin nombre"}
                            </p>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                                seller.active === false
                                  ? isDark
                                    ? "border border-red-400/20 bg-red-400/10 text-red-200"
                                    : "border border-red-200 bg-red-50 text-red-700"
                                  : isDark
                                    ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                                    : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {seller.active === false ? "Inactivo" : "Activo"}
                            </span>
                          </div>

                          <p className={`mt-2 text-sm ${softTextClass}`}>Correo</p>
                          <p className={`font-semibold break-all ${titleTextClass}`}>
                            {seller.email || "-"}
                          </p>

                          <p className={`mt-3 text-sm ${softTextClass}`}>Rol</p>
                          <p className="font-semibold text-cyan-300">
                            {seller.role || "seller"}
                          </p>
                        </>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {editingSellerId === seller.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateSeller(seller.id)}
                            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                          >
                            Guardar
                          </button>

                          <button
                            onClick={cancelEditSeller}
                            className="rounded-xl bg-gray-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditSeller(seller)}
                            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleResetPassword(seller.email)}
                            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                          >
                            Reset
                          </button>

                          <button
                            onClick={() =>
                              handleToggleSeller(seller.id, seller.active === false)
                            }
                            className={`rounded-xl px-4 py-2 text-sm font-semibold transition hover:opacity-90 ${
                              seller.active === false
                                ? "bg-emerald-500 text-white"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            {seller.active === false ? "Activar" : "Desactivar"}
                          </button>

                          <button
                            onClick={() => handleDeleteSeller(seller.id)}
                            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <p className={`text-xs uppercase tracking-[0.35em] ${isDark ? "text-white/25" : "text-gray-400"}`}>
            Powered by Mahu Plexus
          </p>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl ${
            isDark
              ? "border-white/10 bg-black/80 text-white"
              : "border-gray-200 bg-white text-gray-900"
          }`}
        >
          {toast}
        </div>
      )}
    </main>
  )
}