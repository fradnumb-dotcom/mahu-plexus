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
  seller_id?: string | null
  sale_items: SaleItem[]
}

type SellerProfile = {
  id: string
  full_name?: string | null
  email?: string | null
}

type SellerSummary = {
  seller_id: string
  seller_name: string
  seller_email: string
  total_sales: number
  total_amount: number
  total_units: number
  participation: number
}

type InventoryTab = "all" | "low" | "out"

export default function DashboardPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerProfile>>({})
  const [search, setSearch] = useState("")
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [role, setRole] = useState<"owner" | "seller" | null>(null)
  const [isDark, setIsDark] = useState(true)
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>("all")

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

  const getInitials = (name: string) => {
    const cleaned = name.trim()
    if (!cleaned) return "SV"

    const parts = cleaned.split(" ").filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
  }

  const getMedal = (index: number) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}`
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
        .select("business_id, role")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error(error)
        showToast("No se pudo cargar el negocio")
        return
      }

      setBusinessId(data?.business_id || null)
      setRole((data?.role as "owner" | "seller" | null) || null)

      if (data?.role === "seller") {
        router.push("/sales")
        return
      }

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

  const loadSellerProfiles = async (sellerIds: string[]) => {
    const uniqueIds = Array.from(new Set(sellerIds.filter(Boolean)))

    if (uniqueIds.length === 0) {
      setSellerProfiles({})
      return
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds)

      if (error) {
        console.error(error)
        return
      }

      const map: Record<string, SellerProfile> = {}
      ;(data || []).forEach((profile) => {
        map[profile.id] = profile
      })

      setSellerProfiles(map)
    } catch (error) {
      console.error(error)
    }
  }

  const loadSales = async (business_id: string) => {
    try {
      const res = await fetch(`/api/sales?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) return

      const salesData = data.data || []
      setSales(salesData)

      const sellerIds = salesData
        .map((sale: Sale) => sale.seller_id)
        .filter(Boolean) as string[]

      await loadSellerProfiles(sellerIds)
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

  const buildSellerSummary = (salesSource: Sale[]): SellerSummary[] => {
    const map = new Map<string, SellerSummary>()
    const totalGlobal = salesSource.reduce((acc, sale) => acc + Number(sale.total || 0), 0)

    for (const sale of salesSource) {
      const sellerId = sale.seller_id || "sin_vendedor"
      const profile = sellerProfiles[sellerId]

      const current = map.get(sellerId)
      const units = (sale.sale_items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      )

      if (current) {
        current.total_sales += 1
        current.total_amount += Number(sale.total || 0)
        current.total_units += units
      } else {
        map.set(sellerId, {
          seller_id: sellerId,
          seller_name:
            profile?.full_name ||
            (sellerId === "sin_vendedor" ? "Sin vendedor asignado" : "Vendedor"),
          seller_email: profile?.email || "-",
          total_sales: 1,
          total_amount: Number(sale.total || 0),
          total_units: units,
          participation: 0,
        })
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        participation: totalGlobal > 0 ? (item.total_amount / totalGlobal) * 100 : 0,
      }))
      .sort((a, b) => b.total_amount - a.total_amount)
  }

  const sellerSummary = useMemo(() => buildSellerSummary(sales), [sales, sellerProfiles])
  const sellerSummaryToday = useMemo(() => buildSellerSummary(salesToday), [salesToday, sellerProfiles])

  const topSeller = sellerSummary[0] || null
  const topSellerToday = sellerSummaryToday[0] || null

  const inventoryList = useMemo(() => {
    if (inventoryTab === "low") {
      return filtered.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5)
    }

    if (inventoryTab === "out") {
      return filtered.filter((p) => Number(p.stock) === 0)
    }

    return filtered
  }, [filtered, inventoryTab])

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

  const tabBaseClass =
    "rounded-2xl px-4 py-2.5 text-sm font-medium transition border"

  if (role === "seller") {
    return null
  }

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

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-6 md:px-6 md:py-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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

            <h1 className={`mt-4 text-3xl font-semibold md:text-4xl ${titleTextClass}`}>
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

            <a
              href="/settings"
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-purple-400/20 bg-purple-400/10 text-purple-200 hover:bg-purple-400/20"
                  : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              Configuración
            </a>

            <a
              href="/sellers"
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
                isDark
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Crear vendedores
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

        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-2 text-3xl font-semibold ${titleTextClass}`}>
              {salesTodayCount}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">{unitsToday}</p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Total vendido
            </p>
            <p className="mt-2 text-3xl font-semibold text-green-400">
              S/ {totalToday.toFixed(2)}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Productos
            </p>
            <p className="mt-2 text-3xl font-semibold text-purple-300">{totalProducts}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-3">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl xl:col-span-2 ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Resumen general</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Estado actual del inventario y movimiento del negocio.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Stock total</p>
                <p className={`mt-2 text-2xl font-semibold ${titleTextClass}`}>{totalStock}</p>
              </div>

              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Valor estimado</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-300">
                  S/ {totalValue.toFixed(2)}
                </p>
              </div>

              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Sin stock</p>
                <p className="mt-2 text-2xl font-semibold text-red-400">
                  {outOfStockProducts.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Alertas</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Productos que requieren atención.
              </p>
            </div>

            <div className="space-y-2.5">
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
                      className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3.5"
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
                      className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3.5"
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

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>Top vendedor general</h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  Mejor rendimiento acumulado.
                </p>
              </div>
              <div className="text-3xl">🥇</div>
            </div>

            {topSeller ? (
              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-lg font-bold text-cyan-300">
                    {getInitials(topSeller.seller_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${softTextClass}`}>Vendedor destacado</p>
                    <p className={`mt-1 text-xl font-semibold break-words ${titleTextClass}`}>
                      {topSeller.seller_name}
                    </p>
                    <p className={`mt-1 text-sm break-all ${softTextClass}`}>
                      {topSeller.seller_email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Ventas</p>
                    <p className={`mt-1 text-xl font-bold ${titleTextClass}`}>
                      {topSeller.total_sales}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Unidades</p>
                    <p className="mt-1 text-xl font-bold text-cyan-300">
                      {topSeller.total_units}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Total</p>
                    <p className="mt-1 text-xl font-bold text-green-400">
                      S/ {topSeller.total_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Participación</p>
                    <p className="mt-1 text-xl font-bold text-purple-300">
                      {topSeller.participation.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className={softTextClass}>Participación total</span>
                    <span className="font-semibold text-cyan-300">
                      {topSeller.participation.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                      style={{ width: `${Math.min(topSeller.participation, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${cardClass}`}>
                <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                  Aún no hay ventas por vendedor
                </p>
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>Top vendedor de hoy</h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  Mejor rendimiento del día.
                </p>
              </div>
              <div className="text-3xl">🏆</div>
            </div>

            {topSellerToday ? (
              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 text-lg font-bold text-purple-300">
                    {getInitials(topSellerToday.seller_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${softTextClass}`}>Vendedor destacado hoy</p>
                    <p className={`mt-1 text-xl font-semibold break-words ${titleTextClass}`}>
                      {topSellerToday.seller_name}
                    </p>
                    <p className={`mt-1 text-sm break-all ${softTextClass}`}>
                      {topSellerToday.seller_email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Ventas hoy</p>
                    <p className={`mt-1 text-xl font-bold ${titleTextClass}`}>
                      {topSellerToday.total_sales}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Unidades</p>
                    <p className="mt-1 text-xl font-bold text-cyan-300">
                      {topSellerToday.total_units}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Total hoy</p>
                    <p className="mt-1 text-xl font-bold text-green-400">
                      S/ {topSellerToday.total_amount.toFixed(2)}
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-3.5 ${cardClass}`}>
                    <p className={`text-[11px] uppercase tracking-[0.2em] ${softTextClass}`}>Participación</p>
                    <p className="mt-1 text-xl font-bold text-purple-300">
                      {topSellerToday.participation.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className={softTextClass}>Participación de hoy</span>
                    <span className="font-semibold text-cyan-300">
                      {topSellerToday.participation.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
                      style={{ width: `${Math.min(topSellerToday.participation, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${cardClass}`}>
                <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                  Hoy todavía no hay ventas registradas
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 grid gap-4 xl:grid-cols-2">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>
                Historial de ventas por vendedor
              </h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Resumen acumulado.
              </p>
            </div>

            {sellerSummary.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${cardClass}`}>
                <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                  Aún no hay historial disponible
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {sellerSummary.map((seller, index) => (
                  <div
                    key={seller.seller_id}
                    className={`rounded-2xl border p-4 ${cardClass}`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-base">
                          {getMedal(index)}
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                          {getInitials(seller.seller_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`text-base font-semibold break-words ${titleTextClass}`}>
                            {seller.seller_name}
                          </h3>
                          <p className={`mt-1 text-sm break-all ${mediumTextClass}`}>
                            {seller.seller_email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Ventas
                          </p>
                          <p className={`mt-1 text-lg font-bold ${titleTextClass}`}>
                            {seller.total_sales}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Unidades
                          </p>
                          <p className="mt-1 text-lg font-bold text-cyan-300">
                            {seller.total_units}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Total
                          </p>
                          <p className="mt-1 text-lg font-bold text-green-400">
                            S/ {seller.total_amount.toFixed(2)}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Participación
                          </p>
                          <p className="mt-1 text-lg font-bold text-purple-300">
                            {seller.participation.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className={softTextClass}>Progreso</span>
                          <span className="font-semibold text-cyan-300">
                            {seller.participation.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
                            style={{ width: `${Math.min(seller.participation, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>
                Ventas de hoy por vendedor
              </h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Comparativa diaria.
              </p>
            </div>

            {sellerSummaryToday.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${cardClass}`}>
                <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                  Hoy todavía no hay ventas registradas
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {sellerSummaryToday.map((seller, index) => (
                  <div
                    key={`today-${seller.seller_id}`}
                    className={`rounded-2xl border p-4 ${cardClass}`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-base">
                          {getMedal(index)}
                        </div>

                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 text-sm font-bold text-purple-300">
                          {getInitials(seller.seller_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className={`text-base font-semibold break-words ${titleTextClass}`}>
                            {seller.seller_name}
                          </h3>
                          <p className={`mt-1 text-sm break-all ${mediumTextClass}`}>
                            {seller.seller_email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Ventas hoy
                          </p>
                          <p className={`mt-1 text-lg font-bold ${titleTextClass}`}>
                            {seller.total_sales}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Unidades
                          </p>
                          <p className="mt-1 text-lg font-bold text-cyan-300">
                            {seller.total_units}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Total hoy
                          </p>
                          <p className="mt-1 text-lg font-bold text-green-400">
                            S/ {seller.total_amount.toFixed(2)}
                          </p>
                        </div>

                        <div className={`rounded-2xl border p-3 ${cardClass}`}>
                          <p className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>
                            Participación
                          </p>
                          <p className="mt-1 text-lg font-bold text-purple-300">
                            {seller.participation.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className={softTextClass}>Progreso del día</span>
                          <span className="font-semibold text-cyan-300">
                            {seller.participation.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-purple-400 to-cyan-400"
                            style={{ width: `${Math.min(seller.participation, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`mb-6 rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
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

        <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_1.25fr]">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>
                {editing ? "Actualizar producto" : "Crear producto"}
              </h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Agrega o edita productos con código de serie.
              </p>
            </div>

            <div className="grid gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Producto"
                className={`rounded-2xl border p-4 outline-none focus:border-cyan-400 ${inputClass}`}
              />
              <div className="grid gap-3 md:grid-cols-2">
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
              </div>
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

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Productos recientes</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Últimos productos cargados para una revisión rápida.
              </p>
            </div>

            {recentProducts.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${cardClass}`}>
                <p className={`text-lg ${isDark ? "text-white/60" : "text-gray-500"}`}>
                  Aún no hay productos registrados
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {recentProducts.map((product) => (
                  <div key={product.id} className={`rounded-2xl border p-4 ${cardClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate text-base font-semibold ${titleTextClass}`}>
                          {product.name}
                        </p>
                        <p className={`mt-1 truncate text-sm ${softTextClass}`}>
                          {product.serial_code || "Sin serie"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          Number(product.stock) === 0
                            ? "bg-red-500/15 text-red-300"
                            : Number(product.stock) <= 5
                              ? "bg-yellow-500/15 text-yellow-300"
                              : isDark
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Stock {product.stock}
                      </span>
                    </div>

                    <p className="mt-3 text-lg font-semibold text-cyan-300">
                      S/ {Number(product.price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`mb-8 rounded-3xl border p-5 md:p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Inventario completo</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Lista ordenada para encontrar, editar y controlar tus productos.
              </p>
            </div>

            <div className={`rounded-2xl border px-3 py-2 text-xs font-medium ${cardClass} ${mediumTextClass}`}>
              {inventoryList.length} visibles
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setInventoryTab("all")}
              className={`${tabBaseClass} ${
                inventoryTab === "all"
                  ? isDark
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                    : "border-cyan-300 bg-cyan-50 text-cyan-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Todos ({filtered.length})
            </button>

            <button
              onClick={() => setInventoryTab("low")}
              className={`${tabBaseClass} ${
                inventoryTab === "low"
                  ? isDark
                    ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-200"
                    : "border-yellow-300 bg-yellow-50 text-yellow-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Bajo stock ({filtered.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 5).length})
            </button>

            <button
              onClick={() => setInventoryTab("out")}
              className={`${tabBaseClass} ${
                inventoryTab === "out"
                  ? isDark
                    ? "border-red-400/30 bg-red-400/10 text-red-200"
                    : "border-red-300 bg-red-50 text-red-700"
                  : isDark
                    ? "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Sin stock ({filtered.filter((p) => Number(p.stock) === 0).length})
            </button>
          </div>

          {inventoryList.length === 0 ? (
            <div
              className={`rounded-3xl border border-dashed p-10 text-center ${
                isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"
              }`}
            >
              <p className={`text-lg ${isDark ? "text-white/65" : "text-gray-600"}`}>
                No hay productos en esta vista
              </p>
              <p className={`mt-2 text-sm ${isDark ? "text-white/35" : "text-gray-400"}`}>
                Cambia de pestaña o prueba otra búsqueda.
              </p>
            </div>
          ) : (
            <div key={animateKey} className="grid gap-2.5">
              {inventoryList.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                  }`}
                >
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_120px_150px_170px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`truncate text-base font-semibold ${titleTextClass}`}>
                          {p.name}
                        </p>

                        {p.serial_code && (
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              isDark
                                ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
                                : "border border-cyan-200 bg-cyan-50 text-cyan-700"
                            }`}
                          >
                            Serie
                          </span>
                        )}
                      </div>

                      <p className={`mt-1 truncate text-sm ${mediumTextClass}`}>
                        {p.description || p.serial_code || "Sin descripción"}
                      </p>
                    </div>

                    <div>
                      <p className={`text-[10px] uppercase tracking-[0.2em] xl:hidden ${softTextClass}`}>
                        Stock
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          Number(p.stock) === 0
                            ? "bg-red-500/15 text-red-300"
                            : Number(p.stock) <= 5
                              ? "bg-yellow-500/15 text-yellow-300"
                              : isDark
                                ? "bg-white/10 text-white"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {p.stock}
                      </span>
                    </div>

                    <div>
                      <p className={`text-[10px] uppercase tracking-[0.2em] xl:hidden ${softTextClass}`}>
                        Precio
                      </p>
                      <p className="mt-1 text-lg font-bold text-cyan-300">
                        S/ {Number(p.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2 xl:justify-end">
                      <button
                        onClick={() => handleEdit(p)}
                        className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
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