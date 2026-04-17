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

  const lowStockProducts = products.filter((product) => Number(product.stock) > 0 && Number(product.stock) <= 5)
  const outOfStockProducts = products.filter((product) => Number(product.stock) === 0)

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

  const totalToday = salesToday.reduce((acc, sale) => acc + Number(sale.total || 0), 0)
  const unitsToday = salesToday.reduce((acc, sale) => {
    const units = (sale.sale_items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    )
    return acc + units
  }, 0)

  const salesTodayCount = salesToday.length
  const recentProducts = useMemo(() => [...products].slice(0, 4), [products])

  return (
    <main className="min-h-screen bg-[#050816] text-white overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(circle_at_center,white_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
              <span className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                Powered by
              </span>
              <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-purple-300 bg-clip-text text-sm font-semibold text-transparent">
                Mahu Plexus
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
              Panel de control
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Una vista clara, elegante y rápida de tu negocio.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/sales"
              className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-200 backdrop-blur-xl transition hover:bg-cyan-400/20"
            >
              Ir a ventas
            </a>

            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push("/login")
              }}
              className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/20"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Ventas de hoy</p>
            <p className="mt-3 text-3xl font-semibold text-white">{salesTodayCount}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Unidades vendidas hoy</p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">{unitsToday}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Total vendido hoy</p>
            <p className="mt-3 text-3xl font-semibold text-green-400">S/ {totalToday.toFixed(2)}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">Productos visibles</p>
            <p className="mt-3 text-3xl font-semibold text-purple-300">{totalProducts}</p>
          </div>
        </div>

        <div className="mb-8 grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl xl:col-span-2">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-white">Resumen general</h2>
              <p className="mt-2 text-sm text-white/45">Estado actual del inventario y movimiento del negocio.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-white/45">Stock total</p>
                <p className="mt-2 text-3xl font-semibold text-white">{totalStock}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-white/45">Valor estimado</p>
                <p className="mt-2 text-3xl font-semibold text-cyan-300">S/ {totalValue.toFixed(2)}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-white/45">Sin stock</p>
                <p className="mt-2 text-3xl font-semibold text-red-400">{outOfStockProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-white">Alertas</h2>
              <p className="mt-2 text-sm text-white/45">Productos que requieren atención.</p>
            </div>

            <div className="space-y-3">
              {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-sm font-medium text-emerald-300">Todo está bajo control</p>
                  <p className="mt-1 text-sm text-white/50">No hay alertas de stock por ahora.</p>
                </div>
              ) : (
                <>
                  {lowStockProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
                      <p className="font-medium text-yellow-300">{product.name}</p>
                      <p className="mt-1 text-sm text-white/55">
                        Stock bajo: {product.stock}
                        {product.serial_code ? ` · Serie: ${product.serial_code}` : ""}
                      </p>
                    </div>
                  ))}

                  {outOfStockProducts.slice(0, 2).map((product) => (
                    <div key={product.id} className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                      <p className="font-medium text-red-300">{product.name}</p>
                      <p className="mt-1 text-sm text-white/55">
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

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <input
            placeholder="Buscar producto o código de serie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400"
          />

          <p className="mt-3 text-sm text-white/40">{filtered.length} producto(s) encontrado(s)</p>
        </div>

        <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              {editing ? "Actualizar producto" : "Crear producto"}
            </h2>
            <p className="mt-2 text-sm text-white/45">
              Agrega o edita productos con código de serie para un mejor control.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Producto"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Precio"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
            />
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Stock"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
            />
            <input
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              placeholder="Código / serie"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
            />
          </div>

          <button
            onClick={handleSave}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
          >
            {editing ? "Actualizar" : "Crear"}
          </button>
        </div>

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">Productos recientes</h2>
            <p className="mt-2 text-sm text-white/45">Últimos productos cargados en tu sistema.</p>
          </div>

          {recentProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <p className="text-lg text-white/60">Aún no hay productos registrados</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recentProducts.map((product) => (
                <div key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-lg font-semibold text-white">{product.name}</p>
                  <p className="mt-3 text-sm text-white/45">Precio</p>
                  <p className="font-semibold text-cyan-300">S/ {product.price}</p>
                  <p className="mt-3 text-sm text-white/45">Stock</p>
                  <p className="font-semibold text-white">{product.stock}</p>
                  <p className="mt-3 text-sm text-white/45">Serie</p>
                  <p className="font-semibold text-white">{product.serial_code || "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-12 text-center backdrop-blur-xl">
            <p className="text-lg text-white/65">No se encontraron productos</p>
            <p className="mt-2 text-sm text-white/35">Prueba con otro nombre, serie o crea uno nuevo.</p>
          </div>
        ) : (
          <div key={animateKey} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-cyan-400/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Producto</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{p.name}</h2>
                  </div>

                  <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                    Stock {p.stock}
                  </div>
                </div>

                <p className="mt-4 min-h-[48px] text-sm leading-6 text-white/55">
                  {p.description || "Sin descripción"}
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Precio</p>
                    <p className="mt-1 text-2xl font-bold text-cyan-300">S/ {Number(p.price).toFixed(2)}</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/35">Serie</p>
                    <p className="mt-1 text-sm font-semibold text-white break-all">{p.serial_code || "-"}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex-1 rounded-2xl bg-yellow-400 px-4 py-3 font-semibold text-black transition hover:opacity-90"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:opacity-90"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/25">
            Powered by Mahu Plexus
          </p>
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