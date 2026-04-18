"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Product = {
  id: string
  name: string
  price: number
  stock: number
  description?: string
  serial_code?: string | null
}

type SaleItem = {
  id: string
  quantity: number
  price: number
  subtotal: number
}

type Sale = {
  id: string
  total: number
  created_at: string
  sale_items: SaleItem[]
}

export default function DashboardPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [search, setSearch] = useState("")
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(true)

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [serialCode, setSerialCode] = useState("")
  const [description, setDescription] = useState("")
  const [editing, setEditing] = useState<Product | null>(null)

  const [animateKey, setAnimateKey] = useState(0)
  const [toast, setToast] = useState("")

  const timeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC"

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

      const { data, error } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error(error)
        showToast("No se pudo cargar el negocio")
        return
      }

      setBusinessId(data?.business_id || null)

      if (data?.business_id) {
        await loadProducts(data.business_id)
        await loadSales(data.business_id)
      }
    }

    load()
  }, [router])

  const loadProducts = async (business_id: string) => {
    try {
      const res = await fetch(`/api/products?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudieron cargar los productos")
        return
      }

      setProducts(data.data || [])
      setFiltered(data.data || [])
    } catch (error) {
      console.error(error)
      showToast("Error al cargar productos")
    }
  }

  const loadSales = async (business_id: string) => {
    try {
      const res = await fetch(`/api/sales?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) return
      setSales(data.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    const result = products.filter((p) =>
      `${p.name} ${p.description || ""} ${p.serial_code || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )

    setFiltered(result)
    setAnimateKey((prev) => prev + 1)
  }, [search, products])

  const handleSave = async () => {
    if (!name || !price || !stock || !businessId) {
      showToast("Completa nombre, precio y stock")
      return
    }

    try {
      if (editing) {
        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            name,
            price: Number(price),
            stock: Number(stock),
            serial_code: serialCode,
            description,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showToast(data.error || "No se pudo actualizar")
          return
        }

        showToast("Producto actualizado correctamente")
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            price: Number(price),
            stock: Number(stock),
            serial_code: serialCode,
            description,
            business_id: businessId,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showToast(data.error || "No se pudo crear")
          return
        }

        showToast("Producto creado correctamente")
      }

      setName("")
      setPrice("")
      setStock("")
      setSerialCode("")
      setDescription("")
      setEditing(null)

      await loadProducts(businessId)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleDelete = async (id: string) => {
    if (!businessId) return

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudo eliminar")
        return
      }

      showToast("Producto eliminado")
      await loadProducts(businessId)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleEdit = (p: Product) => {
    setEditing(p)
    setName(p.name)
    setPrice(String(p.price))
    setStock(String(p.stock))
    setSerialCode(p.serial_code || "")
    setDescription(p.description || "")
    showToast("Editando producto")
  }

  const totalProducts = filtered.length
  const totalStock = products.reduce((acc, item) => acc + Number(item.stock || 0), 0)
  const totalValue = products.reduce(
    (acc, item) => acc + Number(item.price || 0) * Number(item.stock || 0),
    0
  )

  const lowStockProducts = products.filter(
    (product) => Number(product.stock) > 0 && Number(product.stock) <= 5
  )
  const outOfStockProducts = products.filter(
    (product) => Number(product.stock) === 0
  )

  const todayKey = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  const salesToday = sales.filter((sale) => {
    const saleKey = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(sale.created_at))

    return saleKey === todayKey
  })

  const totalToday = salesToday.reduce(
    (acc, sale) => acc + Number(sale.total || 0),
    0
  )

  const unitsToday = salesToday.reduce((acc, sale) => {
    const units = (sale.sale_items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )
    return acc + units
  }, 0)

  const salesTodayCount = salesToday.length
  const recentProducts = useMemo(() => [...products].slice(0, 4), [products])

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
  const mediumTextClass = isDark ? "text-white/55" : "text-gray-600"

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

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
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
              Panel de control
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
              Una vista clara, elegante y rápida de tu negocio.
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
              href="/sales"
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
            >
              Ir a ventas
            </a>

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push("/login")
              }}
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-3 text-3xl font-semibold ${titleTextClass}`}>
              {salesTodayCount}
            </p>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Unidades vendidas hoy
            </p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{unitsToday}</p>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Total vendido hoy
            </p>
            <p className="mt-3 text-3xl font-semibold text-green-400">
              S/ {totalToday.toFixed(2)}
            </p>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Productos visibles
            </p>
            <p className="mt-3 text-3xl font-semibold text-purple-300">{totalProducts}</p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 xl:grid-cols-3">
          <div className={`rounded-3xl border p-6 backdrop-blur-xl xl:col-span-2 ${surfaceClass}`}>
            <div className="mb-5">
              <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Resumen general</h2>
              <p className={`mt-2 text-sm ${softTextClass}`}>
                Estado actual del inventario y movimiento del negocio.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className={`rounded-2xl border p-5 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Stock total</p>
                <p className={`mt-2 text-3xl font-semibold ${titleTextClass}`}>{totalStock}</p>
              </div>

              <div className={`rounded-2xl border p-5 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Valor estimado</p>
                <p className="mt-2 text-3xl font-semibold text-cyan-300">
                  S/ {totalValue.toFixed(2)}
                </p>
              </div>

              <div className={`rounded-2xl border p-5 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Sin stock</p>
                <p className="mt-2 text-3xl font-semibold text-red-400">
                  {outOfStockProducts.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-5">
              <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Alertas</h2>
              <p className={`mt-2 text-sm ${softTextClass}`}>
                Productos que requieren atención.
              </p>
            </div>

            <div className="space-y-3">
              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-sm font-medium text-emerald-300">Todo está bajo control</p>
                  <p className={`mt-1 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
                    No hay alertas de stock por ahora.
                  </p>
                </div>
              ) : (
                <>
                  {lowStockProducts.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"
                    >
                      <p className="font-medium text-yellow-300">{product.name}</p>
                      <p className={`mt-1 text-sm ${mediumTextClass}`}>
                        Stock bajo: {product.stock}
                        {product.serial_code ? ` · Serie: ${product.serial_code}` : ""}
                      </p>
                    </div>
                  ))}

                  {outOfStockProducts.slice(0, 2).map((product) => (
                    <div
                      key={product.id}
                      className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4"
                    >
                      <p className="font-medium text-red-300">{product.name}</p>
                      <p className={`mt-1 text-sm ${mediumTextClass}`}>
                        Producto agotado
                        {product.serial_code ? ` · Serie: ${product.serial_code}` : ""}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className={`mb-8 rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
          <input
            placeholder="Buscar producto o código de serie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-2xl border px-5 py-4 outline-none transition focus:border-cyan-400 ${inputClass}`}
          />

          <p className={`mt-3 text-sm ${isDark ? "text-white/40" : "text-gray-500"}`}>
            {filtered.length} producto(s) encontrado(s)
          </p>
        </div>

        <div className={`mb-10 rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>
              {editing ? "Actualizar producto" : "Crear producto"}
            </h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Agrega o edita productos con código de serie para un mejor control.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Producto"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Precio"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Stock"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
            <input
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              placeholder="Código / serie"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
              className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
            />
          </div>

          <button
            onClick={handleSave}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
          >
            {editing ? "Actualizar" : "Crear"}
          </button>
        </div>

        <div className={`mb-8 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Productos recientes</h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Últimos productos cargados en tu sistema.
            </p>
          </div>

          {recentProducts.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${cardClass}`}>
              <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                Aún no hay productos registrados
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recentProducts.map((product) => (
                <div key={product.id} className={`rounded-2xl border p-5 ${cardClass}`}>
                  <p className={`text-lg font-semibold ${titleTextClass}`}>{product.name}</p>
                  <p className={`mt-3 text-sm ${softTextClass}`}>Precio</p>
                  <p className="font-semibold text-cyan-300">S/ {product.price}</p>
                  <p className={`mt-3 text-sm ${softTextClass}`}>Stock</p>
                  <p className={`font-semibold ${titleTextClass}`}>{product.stock}</p>
                  <p className={`mt-3 text-sm ${softTextClass}`}>Serie</p>
                  <p className={`font-semibold ${titleTextClass}`}>{product.serial_code || "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div
            className={`rounded-3xl border border-dashed p-12 text-center backdrop-blur-xl ${
              isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"
            }`}
          >
            <p className={`text-lg ${isDark ? "text-white/65" : "text-gray-600"}`}>
              No se encontraron productos
            </p>
            <p className={`mt-2 text-sm ${isDark ? "text-white/35" : "text-gray-400"}`}>
              Prueba con otro nombre, serie o crea uno nuevo.
            </p>
          </div>
        ) : (
          <div key={animateKey} className="grid gap-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`rounded-[30px] border px-5 py-4 backdrop-blur-xl transition ${
                  isDark
                    ? "border-white/10 bg-white/5 hover:border-cyan-400/30"
                    : "border-gray-200 bg-white shadow-sm hover:border-cyan-300"
                }`}
              >
                <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2.3fr)_minmax(130px,0.7fr)_minmax(150px,0.8fr)_auto] xl:items-center xl:gap-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={`text-[11px] uppercase tracking-[0.24em] ${
                          isDark ? "text-white/35" : "text-gray-400"
                        }`}
                      >
                        Producto
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                          isDark
                            ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                            : "border border-cyan-200 bg-cyan-50 text-cyan-700"
                        }`}
                      >
                        Stock {p.stock}
                      </span>
                    </div>

                    <h2 className={`mt-2 text-[28px] font-semibold leading-tight ${titleTextClass}`}>
                      {p.name}
                    </h2>

                    <p className={`mt-1 text-sm leading-6 ${mediumTextClass}`}>
                      {p.description || "Sin descripción"}
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-[11px] uppercase tracking-[0.24em] ${
                        isDark ? "text-white/35" : "text-gray-400"
                      }`}
                    >
                      Precio
                    </p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">
                      S/ {Number(p.price).toFixed(2)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-[11px] uppercase tracking-[0.24em] ${
                        isDark ? "text-white/35" : "text-gray-400"
                      }`}
                    >
                      Serie
                    </p>
                    <p className={`mt-2 text-sm font-semibold break-all ${titleTextClass}`}>
                      {p.serial_code || "-"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
                    <button
                      onClick={() => handleEdit(p)}
                      className="rounded-2xl bg-yellow-400 px-5 py-3 font-semibold text-black transition hover:opacity-90"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => handleDelete(p.id)}
                      className="rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:opacity-90"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

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