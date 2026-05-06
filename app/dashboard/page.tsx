"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

// MAHU PLEXUS CLEAN PREMIUM PALETTE
// Dark: background #0F172A, surface #111827, card #1F2937, border #374151
// Light: background #F9FAFB, surface #FFFFFF, border #E5E7EB
// Accent: #3B82F6 / hover #2563EB
// Text: #F9FAFB / #111827, secondary #D1D5DB / #374151

type Product = {
  id: string
  name: string
  price: number
  stock: number
  description?: string
  serial_code?: string | null
  created_at?: string | null
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}

type SaleItem = {
  id: string
  quantity: number
  price: number
  subtotal: number
  product_id?: string | null
  products?: {
    id: string
    name: string
    serial_code?: string | null
  } | null
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
type InventorySort = "name" | "stock_low" | "stock_high" | "price_low" | "price_high"
type InventoryMovement = {
  id: string
  business_id: string
  product_id?: string | null
  user_id?: string | null
  type: "created" | "updated" | "sold" | "deleted"
  quantity?: number | null
  note?: string | null
  created_at: string
}

type ToastType = "create" | "update" | "edit" | "delete" | "export" | "error" | "success"

export default function DashboardPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerProfile>>({})
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([])
  const [search, setSearch] = useState("")
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [role, setRole] = useState<"owner" | "seller" | null>(null)
  const [isLoadingSystem, setIsLoadingSystem] = useState(true)
  const [isDark, setIsDark] = useState(true)
  const [currentTime, setCurrentTime] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>("all")
  const [inventorySort, setInventorySort] = useState<InventorySort>("name")
  const [inventoryPage, setInventoryPage] = useState(1)
  const [inventoryPageSize, setInventoryPageSize] = useState(50)

  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("")
  const [serialCode, setSerialCode] = useState("")
  const [description, setDescription] = useState("")
  const [editing, setEditing] = useState<Product | null>(null)

  const [animateKey, setAnimateKey] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [isRefreshingMovements, setIsRefreshingMovements] = useState(false)
  const [lastMovementRefreshAt, setLastMovementRefreshAt] = useState<string | null>(null)

  const timeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC"

  const showToast = (message: string, type: ToastType = "success") => {
    setToast(null)

    window.setTimeout(() => {
      setToast({ message, type })
      window.setTimeout(() => setToast(null), 2200)
    }, 80)
  }

  const formatMovementDate = (value: string) => {
    if (!isMounted) return "--"

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  }

  const formatHeaderDate = () => {
    if (!isMounted) return "--"

    return new Intl.DateTimeFormat("es-PE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(new Date())
  }

  const formatRefreshTime = (value?: string | null) => {
    if (!isMounted || !value) return "Sin actualizar"

    return new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(value))
  }

  const formatProductDate = (value?: string | null) => {
    if (!isMounted || !value) return "-"

    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  }

  const getInitials = (name: string) => {
    const cleaned = name.trim()
    if (!cleaned) return "SV"

    const parts = cleaned.split(" ").filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
  }

  const getMedal = (index: number) => {
    if (index === 0) return "gold"
    if (index === 1) return "silver"
    if (index === 2) return "bronze"
    return `${index + 1}`
  }

  const renderMedal = (index: number) => {
    const medal = getMedal(index)

    if (medal === "gold" || medal === "silver" || medal === "bronze") {
      const fill =
        medal === "gold"
          ? "from-amber-300 to-yellow-600"
          : medal === "silver"
            ? "from-slate-200 to-slate-500"
            : "from-orange-300 to-amber-700"

      const ribbon =
        medal === "gold"
          ? "bg-amber-500/25"
          : medal === "silver"
            ? "bg-slate-400/25"
            : "bg-orange-500/25"

      return (
        <span className="relative inline-grid h-9 w-9 place-items-center">
          <span className={`absolute top-0 h-4 w-3 -rotate-12 rounded-sm ${ribbon}`} />
          <span className={`absolute top-0 h-4 w-3 rotate-12 rounded-sm ${ribbon}`} />
          <span className={`relative mt-2 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${fill} medal-glow shadow-[0_8px_20px_rgba(0,0,0,0.28)] ring-1 ring-white/30`}>
            <span className="h-2.5 w-2.5 rounded-full border border-white/55 bg-white/15" />
          </span>
        </span>
      )
    }

    return (
      <span className={`inline-grid h-8 w-8 place-items-center rounded-xl border text-xs font-bold ${
        isDark
          ? "border-white/10 bg-white/5 text-slate-300"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}>
        {medal}
      </span>
    )
  }

  useEffect(() => {
    setIsMounted(true)

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
    const updateClock = () => {
      const formatted = new Intl.DateTimeFormat("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date())

      setCurrentTime(formatted)
    }

    updateClock()
    const timer = window.setInterval(updateClock, 1000)

    return () => window.clearInterval(timer)
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
      try {
        setIsLoadingSystem(true)

        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        setCurrentUserId(user.id)

        const { data, error } = await supabase
          .from("profiles")
          .select("business_id, role")
          .eq("id", user.id)
          .single()

        if (error) {
          console.error(error)
          showToast("No se pudo cargar el negocio", "error")
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
          await loadMovements(data.business_id)
        }
      } finally {
        setTimeout(() => setIsLoadingSystem(false), 650)
      }
    }

    load()
  }, [router])

  const loadProducts = async (business_id: string) => {
    try {
      const res = await fetch(`/api/products?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudieron cargar los productos", "error")
        return
      }

      setProducts(data.data || [])
      setFiltered(data.data || [])
    } catch (error) {
      console.error(error)
      showToast("Error al cargar productos", "error")
    }
  }

  const loadSellerProfiles = async (sellerIds: string[]) => {
    const uniqueIds = Array.from(new Set(sellerIds.filter(Boolean)))

    if (uniqueIds.length === 0) {
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

      setSellerProfiles((prev) => {
        const map: Record<string, SellerProfile> = { ...prev }

        ;(data || []).forEach((profile) => {
          map[profile.id] = profile
        })

        return map
      })
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

  const loadMovements = async (business_id: string) => {
    try {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("id, business_id, product_id, user_id, type, quantity, note, created_at")
        .eq("business_id", business_id)
        .order("created_at", { ascending: false })
        .limit(12)

      if (error) {
        console.error(error)
        return
      }

      const movements = (data || []) as InventoryMovement[]
      setInventoryMovements(movements)

      const movementUserIds = movements
        .map((movement) => movement.user_id)
        .filter(Boolean) as string[]

      if (movementUserIds.length > 0) {
        await loadSellerProfiles(movementUserIds)
      }
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

  useEffect(() => {
    setInventoryPage(1)
  }, [search, inventoryTab, inventorySort, inventoryPageSize])

  const handleSave = async () => {
    if (!name || !price || !stock || !businessId) {
      showToast("Completa nombre, precio y stock", "error")
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
            user_id: currentUserId,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showToast(data.error || "No se pudo actualizar", "error")
          return
        }

        showToast("Producto actualizado correctamente", "update")
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
            user_id: currentUserId,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          showToast(data.error || "No se pudo crear", "error")
          return
        }

        showToast("Producto creado correctamente", "create")
      }

      setName("")
      setPrice("")
      setStock("")
      setSerialCode("")
      setDescription("")
      setEditing(null)

      await loadProducts(businessId)
      await loadSales(businessId)
      await loadMovements(businessId)
      await loadMovements(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión", "error")
    }
  }

  const handleDelete = async (id: string) => {
    if (!businessId) return

    try {
      const res = await fetch(`/api/products?id=${id}&user_id=${currentUserId || ""}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudo eliminar", "error")
        return
      }

      showToast("Producto eliminado", "delete")
      await loadProducts(businessId)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión", "error")
    }
  }

  const handleEdit = (p: Product) => {
    setEditing(p)
    setName(p.name)
    setPrice(String(p.price))
    setStock(String(p.stock))
    setSerialCode(p.serial_code || "")
    setDescription(p.description || "")
    showToast("Editando producto", "edit")
  }

  const exportInventoryToExcel = () => {
    try {
      const rows = [...(sortedInventoryList.length > 0 ? sortedInventoryList : products)].sort((a, b) =>
        a.name.localeCompare(b.name)
      )

      if (rows.length === 0) {
        showToast("No hay productos para exportar", "error")
        return
      }

      const escapeHtml = (value: string | number | null | undefined) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\r?\n|\r/g, " ")
          .replace(/\s+/g, " ")
          .trim()

      const totalExportValue = rows.reduce(
        (acc, product) =>
          acc + Number(product.price || 0) * Number(product.stock || 0),
        0
      )

      const generatedAt = new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date())

      const formatExcelDate = (value?: string | null) =>
        value
          ? new Intl.DateTimeFormat("es-PE", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(value))
          : "-"

      const tableRows = rows
        .map((product, index) => {
          const price = Number(product.price || 0)
          const stockValue = Number(product.stock || 0)
          const value = price * stockValue
          const stockLabel =
            stockValue === 0
              ? "Sin stock"
              : stockValue <= 5
                ? "Stock bajo"
                : "Disponible"

          return `
            <tr>
              <td class="center">${index + 1}</td>
              <td class="product">${escapeHtml(product.name)}</td>
              <td class="currency">${price.toFixed(2)}</td>
              <td class="center">${stockValue}</td>
              <td>${escapeHtml(stockLabel)}</td>
              <td>${escapeHtml(product.serial_code || "-")}</td>
              <td class="description">${escapeHtml(product.description || "-")}</td>
              <td class="date">${escapeHtml(formatExcelDate(product.created_at || null))}</td>
              <td class="date">${escapeHtml(formatExcelDate(product.updated_at || null))}</td>
              <td class="currency">${value.toFixed(2)}</td>
            </tr>
          `
        })
        .join("")

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body {
                font-family: Calibri, Arial, sans-serif;
                color: #0f172a;
              }

              .title {
                font-size: 22px;
                font-weight: 700;
                color: #0f172a;
                margin-bottom: 4px;
              }

              .subtitle {
                font-size: 12px;
                color: #64748b;
                margin-bottom: 16px;
              }

              .summary {
                margin-bottom: 16px;
                border-collapse: collapse;
              }

              .summary td {
                border: 1px solid #cbd5e1;
                padding: 8px 12px;
                font-size: 12px;
              }

              .summary .label {
                background: #e0f2fe;
                font-weight: 700;
                color: #075985;
              }

              table.inventory {
                border-collapse: collapse;
                width: 100%;
                table-layout: fixed;
              }

              table.inventory th {
                background: #0f172a;
                color: #ffffff;
                font-weight: 700;
                text-align: left;
                border: 1px solid #334155;
                padding: 10px;
                font-size: 12px;
                white-space: nowrap;
              }

              table.inventory td {
                border: 1px solid #cbd5e1;
                padding: 9px;
                font-size: 12px;
                vertical-align: middle;
                mso-number-format:"\@";
              }

              .description {
                width: 240px;
              }

              .date {
                width: 135px;
              }

              .product {
                width: 170px;
                font-weight: 700;
              }

              table.inventory tr:nth-child(even) td {
                background: #f8fafc;
              }

              .center {
                text-align: center;
              }

              .currency {
                text-align: right;
                mso-number-format: "\\0022S/\\0022 #,##0.00";
              }
            </style>
          </head>
          <body>
            <div class="title">Inventario Mahu Plexus</div>
            <div class="subtitle">Exportado el ${escapeHtml(generatedAt)}</div>

            <table class="summary">
              <tr>
                <td class="label">Productos exportados</td>
                <td>${rows.length}</td>
                <td class="label">Stock total</td>
                <td>${rows.reduce((acc, product) => acc + Number(product.stock || 0), 0)}</td>
                <td class="label">Valor estimado</td>
                <td>S/ ${totalExportValue.toFixed(2)}</td>
              </tr>
            </table>

            <table class="inventory">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Código / serie</th>
                  <th>Descripción</th>
                  <th>Fecha ingreso</th>
                  <th>Última actualización</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const date = new Date().toISOString().slice(0, 10)

      link.href = url
      link.download = `inventario-mahu-plexus-${date}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast("Inventario exportado en Excel", "export")
    } catch (error) {
      console.error(error)
      showToast("No se pudo exportar el inventario", "error")
    }
  }

  const exportSalesToExcel = () => {
    try {
      if (sales.length === 0) {
        showToast("No hay ventas para exportar", "error")
        return
      }

      const escapeHtml = (value: string | number | null | undefined) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
          .replace(/\r?\n|\r/g, " ")
          .replace(/\s+/g, " ")
          .trim()

      const generatedAt = new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date())

      const totalSalesValue = sales.reduce(
        (acc, sale) => acc + Number(sale.total || 0),
        0
      )

      const rows = sales
        .map((sale, index) => {
          const seller = sale.seller_id
            ? sellerProfiles[sale.seller_id]?.full_name || "Vendedor"
            : "Sin vendedor"

          const date = new Intl.DateTimeFormat("es-PE", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(sale.created_at))

          const units = (sale.sale_items || []).reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          )

          return `
            <tr>
              <td class="center">${index + 1}</td>
              <td>${escapeHtml(date)}</td>
              <td>${escapeHtml(seller)}</td>
              <td class="center">${units}</td>
              <td class="currency">${Number(sale.total || 0).toFixed(2)}</td>
            </tr>
          `
        })
        .join("")

      const html = `
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body { font-family: Calibri, Arial, sans-serif; color: #0f172a; }
              .title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
              .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
              .summary { margin-bottom: 16px; border-collapse: collapse; }
              .summary td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12px; }
              .summary .label { background: #dcfce7; font-weight: 700; color: #166534; }
              table.sales { border-collapse: collapse; width: 100%; }
              table.sales th { background: #0f172a; color: #fff; border: 1px solid #334155; padding: 10px; font-size: 12px; text-align: left; }
              table.sales td { border: 1px solid #cbd5e1; padding: 9px; font-size: 12px; }
              table.sales tr:nth-child(even) td { background: #f8fafc; }
              .center { text-align: center; }
              .currency { text-align: right; mso-number-format: "\\0022S/\\0022 #,##0.00"; }
            </style>
          </head>
          <body>
            <div class="title">Reporte de ventas Mahu Plexus</div>
            <div class="subtitle">Exportado el ${escapeHtml(generatedAt)}</div>

            <table class="summary">
              <tr>
                <td class="label">Ventas exportadas</td>
                <td>${sales.length}</td>
                <td class="label">Total vendido</td>
                <td>S/ ${totalSalesValue.toFixed(2)}</td>
              </tr>
            </table>

            <table class="sales">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Vendedor</th>
                  <th>Unidades</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `

      const blob = new Blob([html], {
        type: "application/vnd.ms-excel;charset=utf-8;",
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const date = new Date().toISOString().slice(0, 10)

      link.href = url
      link.download = `ventas-mahu-plexus-${date}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      showToast("Ventas exportadas en Excel", "export")
    } catch (error) {
      console.error(error)
      showToast("No se pudo exportar ventas", "error")
    }
  }

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

  const averageTicketToday =
    salesToday.length > 0 ? totalToday / salesToday.length : 0


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

  const sortedInventoryList = useMemo(() => {
    const source = [...inventoryList]

    if (inventorySort === "stock_low") {
      return source.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
    }

    if (inventorySort === "stock_high") {
      return source.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
    }

    if (inventorySort === "price_low") {
      return source.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    }

    if (inventorySort === "price_high") {
      return source.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    }

    return source.sort((a, b) => a.name.localeCompare(b.name))
  }, [inventoryList, inventorySort])

  const salesLast7Days = useMemo(() => {
    const days = 7
    const result: { label: string; total: number }[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const total = sales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at)
          return saleDate >= date && saleDate < nextDate
        })
        .reduce((acc, sale) => acc + Number(sale.total || 0), 0)

      result.push({
        label: new Intl.DateTimeFormat("es-PE", { weekday: "short" }).format(date),
        total,
      })
    }

    return result
  }, [sales])

  const maxSalesDay = Math.max(...salesLast7Days.map((item) => item.total), 1)

  const totalInventoryPages = Math.max(
    1,
    Math.ceil(sortedInventoryList.length / inventoryPageSize)
  )

  const safeInventoryPage = Math.min(inventoryPage, totalInventoryPages)

  const paginatedInventoryList = useMemo(() => {
    const start = (safeInventoryPage - 1) * inventoryPageSize
    return sortedInventoryList.slice(start, start + inventoryPageSize)
  }, [sortedInventoryList, safeInventoryPage, inventoryPageSize])

  const stockChartData = useMemo(() => {
    const data = [...products]
      .sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0))
      .slice(0, 6)
      .map((product) => ({
        id: product.id,
        name: product.name,
        stock: Number(product.stock || 0),
      }))

    const maxStock = Math.max(...data.map((item) => item.stock), 1)

    return data.map((item) => ({
      ...item,
      height: Math.max(8, Math.round((item.stock / maxStock) * 100)),
    }))
  }, [products])

  const salesTrend = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - index))

      const key = new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date)

      const label = new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
        timeZone,
      }).format(date).replace(".", "")

      const daySales = sales.filter((sale) => {
        const saleKey = new Intl.DateTimeFormat("sv-SE", {
          timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(sale.created_at))

        return saleKey === key
      })

      return {
        key,
        label,
        amount: daySales.reduce((acc, sale) => acc + Number(sale.total || 0), 0),
        count: daySales.length,
      }
    })

    const maxAmount = Math.max(...days.map((day) => day.amount), 1)

    return days.map((day) => ({
      ...day,
      height: Math.max(8, Math.round((day.amount / maxAmount) * 100)),
    }))
  }, [sales, timeZone])

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

  const inventoryHealth = products.length
    ? Math.round(((products.length - outOfStockProducts.length) / products.length) * 100)
    : 100

  const stockRiskPercent = products.length
    ? Math.round(((lowStockProducts.length + outOfStockProducts.length) / products.length) * 100)
    : 0

  const topProductMovements = useMemo(() => {
    const map = new Map<string, { name: string; units: number; total: number }>()

    for (const sale of sales) {
      for (const item of sale.sale_items || []) {
        const key = item.product_id || item.products?.id || item.id
        const productName = item.products?.name || `Producto ${String(key).slice(0, 4)}`
        const current = map.get(key)

        if (current) {
          current.units += Number(item.quantity || 0)
          current.total += Number(item.subtotal || 0)
        } else {
          map.set(key, {
            name: productName,
            units: Number(item.quantity || 0),
            total: Number(item.subtotal || 0),
          })
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
  }, [sales])

  const surfaceClass = isDark
    ? "edge-glow border-white/[0.075] bg-[#111827]/78 backdrop-blur-2xl shadow-[0_28px_90px_rgba(0,0,0,0.46)]"
    : "edge-glow border-white/80 bg-white/84 backdrop-blur-2xl shadow-[0_26px_70px_rgba(15,23,42,0.10)]"

  const cardClass = isDark
    ? "card-hover border-white/[0.075] bg-[#151D2B]/72 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]"
    : "card-hover border-slate-200/80 bg-white/88 backdrop-blur-xl shadow-[0_14px_36px_rgba(15,23,42,0.07)]"

  const inputClass = isDark
    ? "border-white/[0.10] bg-[#0D1422]/88 text-[#F8FAFC] placeholder:text-slate-500 backdrop-blur-xl"
    : "border-slate-200 bg-white/92 text-slate-950 placeholder:text-slate-400 backdrop-blur-xl"

  const titleTextClass = isDark ? "text-[#F8FAFC]" : "text-slate-950"
  const softTextClass = isDark ? "text-slate-400" : "text-slate-500"
  const mediumTextClass = isDark ? "text-slate-300" : "text-slate-600"

  const tabBaseClass =
    "rounded-2xl px-4 py-2.5 text-sm font-medium transition border"

  if (role === "seller") {
    return null
  }

  return (
    <main
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#060914] text-[#F8FAFC]" : "bg-[#F6F8FC] text-slate-950"
      }`}
    >
      <style jsx global>{`
        @keyframes premiumEnter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.99);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes panelAura {
          0%, 100% { opacity: 0.42; transform: translateY(0) scale(1); }
          50% { opacity: 0.72; transform: translateY(-4px) scale(1.02); }
        }

        @keyframes softSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes premiumFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes premiumPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }

        .premium-enter {
          animation: premiumEnter 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .panel-aura {
          animation: panelAura 6s ease-in-out infinite;
        }

        .soft-slide {
          animation: softSlide 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .card-hover {
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 220ms ease,
            background-color 220ms ease;
        }

        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.22);
        }

        .medal-glow {
          box-shadow: 0 0 22px rgba(251, 191, 36, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.36);
        }

        .premium-table-row {
          transition: background-color 160ms ease, transform 160ms ease;
        }

        .premium-table-row:hover {
          transform: translateX(2px);
        }

        @keyframes linePulse {
          0%, 100% { opacity: 0.45; transform: scaleX(0.92); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        .edge-glow {
          position: relative;
          overflow: hidden;
        }

        .edge-glow::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(59,130,246,0.58), rgba(139,92,246,0.44), rgba(255,255,255,0.05));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          opacity: 0.45;
        }

        .top-line {
          transform-origin: center;
          animation: linePulse 4s ease-in-out infinite;
        }

        .premium-float {
          animation: premiumFloat 5s ease-in-out infinite;
        }

        .premium-glow {
          animation: premiumPulse 3.6s ease-in-out infinite;
        }

        @keyframes premiumToastIn {
          from {
            opacity: 0;
            transform: scale(0.94) translateY(12px);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }

        @keyframes toastProgress {
          from { width: 0%; }
          to { width: 100%; }
        }

        @keyframes toastIconPop {
          0% { transform: scale(0.82) rotate(-8deg); opacity: 0; }
          55% { transform: scale(1.08) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.96); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        @keyframes systemSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes systemGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.06); }
        }

        @keyframes premiumShimmer {
          from { transform: translateX(-120%); }
          to { transform: translateX(120%); }
        }

        @keyframes iconBounce {
          0% { transform: scale(0.85) rotate(-8deg); }
          45% { transform: scale(1.12) rotate(5deg); }
          100% { transform: scale(1) rotate(0); }
        }

        @keyframes trashShake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-10deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
        }

        @keyframes exportLift {
          0% { transform: translateY(5px); opacity: 0.4; }
          60% { transform: translateY(-4px); opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .premium-toast-icon {
          animation: iconBounce 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .premium-trash-icon {
          animation: trashShake 520ms ease-in-out both;
        }

        .premium-export-icon {
          animation: exportLift 560ms ease-out both;
        }

        .premium-toast {
          animation: toastSlideUp 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .premium-toast-icon,
        .premium-trash-icon,
        .premium-export-icon {
          animation: toastIconPop 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .toast-progress {
          animation: toastProgress 900ms linear forwards;
          box-shadow: 0 0 14px rgba(59, 130, 246, 0.24);
        }

        .system-spin {
          animation: systemSpin 1s linear infinite;
        }

        .system-glow {
          animation: systemGlow 2.4s ease-in-out infinite;
        }

        .premium-shimmer {
          animation: premiumShimmer 1.8s ease-in-out infinite;
        }

        .premium-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .premium-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.32);
          border-radius: 999px;
        }

        @keyframes metricPulse {
          0%, 100% { opacity: .72; transform: scaleX(.98); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        @keyframes statusSweep {
          0% { transform: translateX(-100%); opacity: .2; }
          50% { opacity: .75; }
          100% { transform: translateX(100%); opacity: .2; }
        }

        @keyframes switchKnob {
          from { transform: scale(.92); }
          to { transform: scale(1); }
        }

        .metric-line {
          transform-origin: left;
          animation: metricPulse 2.6s ease-in-out infinite;
        }

        .status-sweep::after {
          content: "";
          position: absolute;
          inset: 0;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent);
          animation: statusSweep 2.8s ease-in-out infinite;
        }

        .senior-focus {
          box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.20), 0 22px 60px rgba(15, 23, 42, 0.18);
        }
      `}</style>
      <div className="absolute inset-0">
        <div className="absolute -left-28 -top-20 h-96 w-96 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative z-10 min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden h-screen w-72 overflow-y-auto premium-scrollbar border-r px-5 py-6 backdrop-blur-2xl xl:block ${
            isDark
              ? "border-white/[0.075] bg-[#090F1A]/94 shadow-[24px_0_90px_rgba(0,0,0,0.58)]"
              : "border-white/80 bg-white/94 shadow-[24px_0_70px_rgba(15,23,42,0.10)]"
          }`}
        >
          <div className="premium-enter mb-7">
            <div className={`relative overflow-hidden rounded-[28px] border p-4 senior-focus ${
              isDark ? "border-white/[0.08] bg-white/[0.045]" : "border-slate-200 bg-slate-50/80"
            }`}>
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-500/12 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 text-xl font-black text-white shadow-[0_18px_45px_rgba(37,99,235,.24)]">
                  M
                </div>

                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${titleTextClass}`}>Mahu Plexus</p>
                  <p className={`mt-0.5 truncate text-xs ${softTextClass}`}>Tienda conectada</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_16px_rgba(96,165,250,.72)]" />
                    <span className={`text-[10px] uppercase tracking-[0.18em] ${softTextClass}`}>Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="premium-enter space-y-2" style={{ animationDelay: "80ms" }}>
            {[
              { href: "/dashboard", label: "Dashboard", icon: "▦", active: true },
              { href: "/sales", label: "Ventas", icon: "◷", active: false },
              { href: "/sellers", label: "Vendedores", icon: "◎", active: false },
              { href: "/settings", label: "Configuración", icon: "⚙", active: false },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  item.active
                    ? isDark
                      ? "border-blue-400/22 bg-blue-500/10 text-blue-100 shadow-[0_0_32px_rgba(59,130,246,0.11)]"
                      : "border-blue-200 bg-blue-50 text-blue-700"
                    : isDark
                      ? "border-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
                      : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-xl transition ${
                  item.active
                    ? "bg-blue-500/14 text-blue-300"
                    : isDark
                      ? "bg-white/[0.04] text-white/45 group-hover:text-blue-300"
                      : "bg-slate-100 text-slate-500 group-hover:text-blue-600"
                }`}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className={`mt-8 rounded-[28px] border p-4 ${cardClass}`}>
            <p className={`text-xs uppercase tracking-[0.28em] ${softTextClass}`}>Estado</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="relative h-3 w-3 rounded-full bg-blue-400 shadow-[0_0_18px_rgba(96,165,250,0.85)]">
                <span className="absolute inset-0 rounded-full bg-blue-400/45 animate-ping" />
              </span>
              <p className={`text-sm font-semibold ${titleTextClass}`}>Sistema activo</p>
            </div>
            <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
              Inventario, ventas y vendedores sincronizados por negocio.
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push("/login")
            }}
            className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${
              isDark
                ? "border-white/10 bg-white/[0.045] text-white hover:bg-white/[0.075]"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Salir
          </button>
        </aside>

        <div className="min-w-0 px-4 py-5 md:px-6 lg:px-8 xl:ml-72">
        <div className={`premium-enter sticky top-4 z-30 mb-5 flex flex-col gap-4 edge-glow rounded-[32px] border px-5 py-4 backdrop-blur-2xl md:flex-row md:items-center md:justify-between ${surfaceClass}`}>
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur-xl ${
                isDark ? "border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.35)]" : "border-gray-200 bg-white"
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
              Mahu Plexus Hub
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
              Panel premium para ventas, inventario, vendedores e historial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`hidden rounded-2xl border px-4 py-3 text-xs font-semibold md:flex md:items-center md:gap-3 ${cardClass} ${mediumTextClass}`}>
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-300">⌁</span>
              <span className="capitalize">{formatHeaderDate()}</span>
            </div>

            <button
              onClick={toggleTheme}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl border px-3 py-2 text-sm font-semibold backdrop-blur-xl transition hover:-translate-y-0.5 ${
                isDark
                  ? "border-white/10 bg-white/[0.065] text-white hover:bg-white/[0.095]"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <span className={`relative flex h-8 w-14 items-center rounded-full p-1 transition ${
                isDark ? "bg-blue-500/18" : "bg-slate-200"
              }`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full transition duration-300 ${
                  isDark
                    ? "translate-x-6 bg-blue-400 text-slate-950 shadow-[0_0_22px_rgba(96,165,250,.48)]"
                    : "translate-x-0 bg-white text-slate-900 shadow"
                }`}>
                  {isDark ? "◐" : "☼"}
                </span>
              </span>
              <span className="hidden sm:inline">{isDark ? "Oscuro" : "Claro"}</span>
            </button>

            <div
              className={`group relative overflow-hidden rounded-[22px] border px-4 py-3 transition duration-300 hover:-translate-y-0.5 ${
                isDark
                  ? "border-white/[0.10] bg-white/[0.055]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="panel-aura absolute -right-8 -top-8 h-20 w-20 rounded-full bg-blue-500/12 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-2xl border ${
                    isDark
                      ? "border-white/[0.10] bg-[#0B1220]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.45)]" />
                </div>

                <div>
                  <p className={`text-[10px] uppercase tracking-[0.22em] ${softTextClass}`}>
                    Tiempo real
                  </p>
                  <p className={`font-mono text-base font-semibold tabular-nums ${titleTextClass}`}>
                    {currentTime || "--:--:--"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`premium-enter mb-5 rounded-[32px] border p-5 backdrop-blur-2xl ${surfaceClass}`} style={{ animationDelay: "65ms" }}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.28em] ${softTextClass}`}>Live Operations</p>
              <h2 className={`mt-2 text-2xl font-semibold md:text-3xl ${titleTextClass}`}>
                Control ejecutivo del negocio
              </h2>
              <p className={`mt-2 max-w-2xl text-sm ${mediumTextClass}`}>
                Inventario, ventas, vendedores e historial operativo en una sola vista.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className={`rounded-2xl border px-4 py-3 ${cardClass}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${softTextClass}`}>Ventas hoy</p>
                <p className={`mt-1 text-2xl font-bold ${titleTextClass}`}>{salesTodayCount}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="metric-line h-full rounded-full bg-blue-400" style={{ width: `${Math.min(100, salesTodayCount * 18)}%` }} />
                </div>
              </div>

              <div className={`rounded-2xl border px-4 py-3 ${cardClass}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${softTextClass}`}>Total vendido</p>
                <p className={`mt-1 text-2xl font-bold ${titleTextClass}`}>S/ {totalToday.toFixed(2)}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="metric-line h-full rounded-full bg-indigo-400" style={{ width: `${Math.min(100, totalToday > 0 ? 76 : 8)}%` }} />
                </div>
              </div>

              <div className={`rounded-2xl border px-4 py-3 ${cardClass}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${softTextClass}`}>Stock</p>
                <p className={`mt-1 text-2xl font-bold ${titleTextClass}`}>{totalStock}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="metric-line h-full rounded-full bg-blue-300" style={{ width: `${Math.min(100, totalStock > 0 ? 68 : 8)}%` }} />
                </div>
              </div>

              <div className={`rounded-2xl border px-4 py-3 ${cardClass}`}>
                <p className={`text-[10px] uppercase tracking-[0.2em] ${softTextClass}`}>Riesgo</p>
                <p className={`mt-1 text-2xl font-bold ${stockRiskPercent > 35 ? "text-rose-300" : "text-emerald-300"}`}>
                  {stockRiskPercent}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="premium-enter mb-5 grid grid-cols-2 gap-3 xl:hidden" style={{ animationDelay: "80ms" }}>
          <a href="/sales" className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${cardClass}`}>
            Ventas
          </a>
          <a href="/sellers" className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${cardClass}`}>
            Vendedores
          </a>
          <a href="/settings" className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${cardClass}`}>
            Configuración
          </a>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push("/login")
            }}
            className={`rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${cardClass}`}
          >
            Salir
          </button>
        </div>

        <div className="premium-enter mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: "120ms" }}>
          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:-translate-y-0.5 ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-2 text-3xl font-semibold ${titleTextClass}`}>
              {salesTodayCount}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:-translate-y-0.5 ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-blue-400">{unitsToday}</p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:-translate-y-0.5 ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Total vendido
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              S/ {totalToday.toFixed(2)}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:-translate-y-0.5 ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Productos
            </p>
            <p className="mt-2 text-3xl font-semibold text-indigo-300">{totalProducts}</p>
          </div>
        </div>

        <div className="premium-enter mb-5 grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]" style={{ animationDelay: "170ms" }}>
          <div className={`rounded-[28px] border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${titleTextClass}`}>Resumen general</h2>
                <p className={`mt-1 text-xs ${softTextClass}`}>Vista compacta para miles de productos.</p>
              </div>

              <div className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold ${cardClass} ${mediumTextClass}`}>
                Salud: {inventoryHealth}%
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className={`text-[11px] ${softTextClass}`}>Stock total</p>
                <p className={`mt-1 text-xl font-semibold ${titleTextClass}`}>{totalStock}</p>
              </div>

              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className={`text-[11px] ${softTextClass}`}>Valor estimado</p>
                <p className="mt-1 text-xl font-semibold text-blue-400">S/ {totalValue.toFixed(2)}</p>
              </div>

              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className={`text-[11px] ${softTextClass}`}>Sin stock</p>
                <p className="mt-1 text-xl font-semibold text-rose-300">{outOfStockProducts.length}</p>
              </div>

              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className={`text-[11px] ${softTextClass}`}>Ticket hoy</p>
                <p className="mt-1 text-xl font-semibold text-emerald-300">S/ {averageTicketToday.toFixed(2)}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${titleTextClass}`}>Ventas últimos 7 días</p>
                  <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-semibold text-blue-400">
                    {sales.length} venta(s)
                  </span>
                </div>

                <div className="flex h-32 items-end gap-2">
                  {salesLast7Days.map((item) => (
                    <div key={item.label} className="flex h-full flex-1 flex-col justify-end gap-1">
                      <div
                        className="min-h-[8px] rounded-t-xl bg-gradient-to-t from-blue-600 to-indigo-400 shadow-[0_0_18px_rgba(34,211,238,0.20)]"
                        style={{ height: `${Math.max(8, (item.total / maxSalesDay) * 100)}%` }}
                        title={`S/ ${item.total.toFixed(2)}`}
                      />
                      <span className={`truncate text-center text-[10px] ${softTextClass}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${cardClass}`}>
                <p className={`text-sm font-semibold ${titleTextClass}`}>Stock crítico</p>
                <div className="mt-3 space-y-2">
                  {lowStockProducts.slice(0, 4).map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3">
                      <p className={`truncate text-xs font-medium ${mediumTextClass}`}>{product.name}</p>
                      <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-300">
                        {product.stock}
                      </span>
                    </div>
                  ))}

                  {lowStockProducts.length === 0 && (
                    <p className={`text-xs ${softTextClass}`}>Sin alertas críticas.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[28px] border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className={`text-lg font-semibold ${titleTextClass}`}>Top vendedor</h2>
                <p className={`mt-1 text-xs ${softTextClass}`}>Rendimiento compacto.</p>
              </div>
              <div className="scale-90">{topSeller ? renderMedal(0) : null}</div>
            </div>

            {topSeller ? (
              <div className={`rounded-2xl border p-4 ${cardClass}`}>
                <p className={`truncate text-base font-semibold ${titleTextClass}`}>{topSeller.seller_name}</p>
                <p className={`mt-1 truncate text-xs ${softTextClass}`}>{topSeller.seller_email}</p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <p className={`text-[10px] uppercase tracking-[0.16em] ${softTextClass}`}>Ventas</p>
                    <p className={`mt-1 text-lg font-bold ${titleTextClass}`}>{topSeller.total_sales}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-[0.16em] ${softTextClass}`}>Unid.</p>
                    <p className="mt-1 text-lg font-bold text-blue-400">{topSeller.total_units}</p>
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-[0.16em] ${softTextClass}`}>Total</p>
                    <p className="mt-1 text-lg font-bold text-emerald-300">S/ {topSeller.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border border-dashed p-6 text-center ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Aún no hay ventas.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-5 grid gap-4 xl:grid-cols-2">
          <div className={`rounded-[28px] border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-lg font-semibold ${titleTextClass}`}>Ventas por vendedor</h2>
                <p className={`mt-1 text-xs ${softTextClass}`}>Resumen compacto acumulado.</p>
              </div>

              <span className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold ${cardClass} ${mediumTextClass}`}>
                {sellerSummary.length} vendedor(es)
              </span>
            </div>

            {sellerSummary.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-6 text-center ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Aún no hay historial disponible.</p>
              </div>
            ) : (
              <div className="premium-scrollbar max-h-[360px] overflow-y-auto pr-1">
                <div className="grid gap-2">
                  {sellerSummary.map((seller, index) => (
                    <div key={seller.seller_id} className={`grid grid-cols-[42px_minmax(0,1fr)_92px_92px] items-center gap-3 rounded-2xl border px-3 py-2.5 ${cardClass}`}>
                      <div className="scale-75">{renderMedal(index)}</div>

                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${titleTextClass}`}>{seller.seller_name}</p>
                        <p className={`truncate text-[11px] ${softTextClass}`}>{seller.seller_email}</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.14em] ${softTextClass}`}>Ventas</p>
                        <p className={`text-sm font-bold ${titleTextClass}`}>{seller.total_sales}</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.14em] ${softTextClass}`}>Total</p>
                        <p className="text-sm font-bold text-emerald-300">S/ {seller.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-[28px] border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-lg font-semibold ${titleTextClass}`}>Ventas por vendedor hoy</h2>
                <p className={`mt-1 text-xs ${softTextClass}`}>Actividad del día.</p>
              </div>

              <span className={`rounded-2xl border px-3 py-1.5 text-xs font-semibold ${cardClass} ${mediumTextClass}`}>
                {sellerSummaryToday.length} activo(s)
              </span>
            </div>

            {sellerSummaryToday.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-6 text-center ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Hoy todavía no hay ventas registradas.</p>
              </div>
            ) : (
              <div className="premium-scrollbar max-h-[360px] overflow-y-auto pr-1">
                <div className="grid gap-2">
                  {sellerSummaryToday.map((seller, index) => (
                    <div key={seller.seller_id} className={`grid grid-cols-[42px_minmax(0,1fr)_92px_92px] items-center gap-3 rounded-2xl border px-3 py-2.5 ${cardClass}`}>
                      <div className="scale-75">{renderMedal(index)}</div>

                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${titleTextClass}`}>{seller.seller_name}</p>
                        <p className={`truncate text-[11px] ${softTextClass}`}>{seller.seller_email}</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.14em] ${softTextClass}`}>Unid.</p>
                        <p className="text-sm font-bold text-blue-400">{seller.total_units}</p>
                      </div>

                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.14em] ${softTextClass}`}>Total</p>
                        <p className="text-sm font-bold text-emerald-300">S/ {seller.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`premium-enter mb-8 rounded-3xl border p-5 md:p-6 backdrop-blur-xl ${surfaceClass}`} style={{ animationDelay: "280ms" }}>
          <div className={`mb-5 rounded-[26px] border p-4 ${cardClass}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-sm font-semibold ${titleTextClass}`}>Búsqueda rápida de inventario</p>
                <p className={`mt-1 text-xs ${softTextClass}`}>
                  Encuentra productos por nombre, descripción o código de serie.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={`rounded-2xl border px-3 py-2 text-xs font-medium ${cardClass} ${mediumTextClass}`}>
                  {filtered.length} encontrado(s)
                </div>

                <button
                  onClick={exportInventoryToExcel}
                  className={`rounded-2xl border px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                    isDark
                      ? "border-[#10B981]/25 bg-[#10B981]/10 text-emerald-200 hover:bg-[#10B981]/15"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  Exportar Excel
                </button>

                <button
                  onClick={exportSalesToExcel}
                  className={`rounded-2xl border px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                    isDark
                      ? "border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15"
                      : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  Exportar ventas
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_440px]">
              <input
                autoFocus
                placeholder="Buscar producto o código de serie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full rounded-2xl border px-5 py-4 outline-none transition focus:border-blue-400 ${inputClass}`}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={inventorySort}
                  onChange={(e) => setInventorySort(e.target.value as InventorySort)}
                  className={`rounded-2xl border px-5 py-4 outline-none transition focus:border-blue-400 ${inputClass}`}
                >
                  <option value="name">Orden: nombre</option>
                  <option value="stock_low">Stock bajo primero</option>
                  <option value="stock_high">Stock alto primero</option>
                  <option value="price_low">Precio menor primero</option>
                  <option value="price_high">Precio mayor primero</option>
                </select>

                <select
                  value={inventoryPageSize}
                  onChange={(e) => setInventoryPageSize(Number(e.target.value))}
                  className={`rounded-2xl border px-5 py-4 outline-none transition focus:border-blue-400 ${inputClass}`}
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                  <option value={200}>200 por página</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Inventario completo</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Lista ordenada para encontrar, editar y controlar tus productos.
              </p>
            </div>

            <div className={`rounded-2xl border px-3 py-2 text-xs font-medium ${cardClass} ${mediumTextClass}`}>
              {sortedInventoryList.length} total
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setInventoryTab("all")}
              className={`${tabBaseClass} ${
                inventoryTab === "all"
                  ? isDark
                    ? "border-blue-400/30 bg-blue-500/10 text-blue-300"
                    : "border-blue-300 bg-blue-50 text-blue-700"
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
                    ? "border-yellow-400/30 bg-amber-400/10 text-yellow-200"
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

          {sortedInventoryList.length === 0 ? (
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
            <div className="overflow-hidden rounded-[26px] border border-white/10">
              <div
                className={`sticky top-0 z-10 hidden grid-cols-[minmax(0,1.55fr)_110px_120px_135px_135px_150px] gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.22em] xl:grid ${
                  isDark ? "bg-white/[0.05] text-white/45" : "bg-slate-50 text-slate-500"
                }`}
              >
                <p>Producto</p>
                <p>Stock</p>
                <p>Precio</p>
                <p>Ingreso</p>
                <p>Actualizado</p>
                <p className="text-right">Acciones</p>
              </div>

              <div key={animateKey} className="premium-scrollbar max-h-[560px] overflow-y-auto p-2">
                <div className="grid gap-2.5">
                  {paginatedInventoryList.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    isDark
                      ? "border-white/10 bg-white/[0.035] hover:bg-white/[0.06]"
                      : "border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                  }`}
                >
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_110px_120px_135px_135px_150px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={`truncate text-base font-semibold ${titleTextClass}`}>
                          {p.name}
                        </p>

                        {p.serial_code && (
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] ${
                              isDark
                                ? "border border-blue-500/20 bg-blue-500/10 text-blue-300"
                                : "border border-blue-200 bg-blue-50 text-blue-700"
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
                            ? "bg-rose-500/15 text-rose-300"
                            : Number(p.stock) <= 5
                              ? "bg-yellow-500/15 text-amber-300"
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
                      <p className="mt-1 text-lg font-bold text-blue-400">
                        S/ {Number(p.price).toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <p className={`text-[10px] uppercase tracking-[0.14em] xl:hidden ${softTextClass}`}>Ingreso</p>
                      <p className={`font-mono text-[11px] leading-5 ${mediumTextClass}`}>{formatProductDate(p.created_at)}</p>
                    </div>

                    <div>
                      <p className={`text-[10px] uppercase tracking-[0.14em] xl:hidden ${softTextClass}`}>Actualizado</p>
                      <p className={`font-mono text-[11px] leading-5 ${mediumTextClass}`}>{formatProductDate(p.updated_at)}</p>
                    </div>

                    <div className="flex gap-2 xl:justify-end">
                      <button
                        onClick={() => handleEdit(p)}
                        className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-[#111827] transition hover:opacity-90"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
                  ))}
                </div>
              </div>
            </div>
          )}

            {sortedInventoryList.length > 0 && (
              <div className={`mt-4 flex flex-col gap-3 rounded-2xl border p-3 md:flex-row md:items-center md:justify-between ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>
                  Mostrando {Math.min((safeInventoryPage - 1) * inventoryPageSize + 1, sortedInventoryList.length)}-
                  {Math.min(safeInventoryPage * inventoryPageSize, sortedInventoryList.length)} de {sortedInventoryList.length}
                </p>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setInventoryPage((prev) => Math.max(1, prev - 1))}
                    disabled={safeInventoryPage <= 1}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isDark
                        ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Anterior
                  </button>

                  <span className={`rounded-xl border px-4 py-2 text-sm font-semibold ${cardClass}`}>
                    {safeInventoryPage} / {totalInventoryPages}
                  </span>

                  <button
                    onClick={() => setInventoryPage((prev) => Math.min(totalInventoryPages, prev + 1))}
                    disabled={safeInventoryPage >= totalInventoryPages}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      isDark
                        ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className={`premium-enter mb-8 rounded-3xl border p-5 md:p-6 backdrop-blur-xl ${surfaceClass}`} style={{ animationDelay: "340ms" }}>
          <div className="mb-4">
            <h2 className={`text-xl font-semibold ${titleTextClass}`}>Alertas inteligentes</h2>
            <p className={`mt-1 text-sm ${softTextClass}`}>
              Señales rápidas para tomar mejores decisiones.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${cardClass}`}>
              <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Riesgo de stock</p>
              <p className="mt-2 text-2xl font-bold text-rose-300">{stockRiskPercent}%</p>
              <p className={`mt-1 text-sm ${mediumTextClass}`}>
                Productos con stock bajo o agotado.
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${cardClass}`}>
              <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Movimiento</p>
              <p className="mt-2 text-2xl font-bold text-blue-400">{salesTodayCount}</p>
              <p className={`mt-1 text-sm ${mediumTextClass}`}>
                Ventas registradas hoy.
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${cardClass}`}>
              <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Inventario</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">{inventoryHealth}%</p>
              <p className={`mt-1 text-sm ${mediumTextClass}`}>
                Salud general del inventario.
              </p>
            </div>
          </div>
        </div>

        <div className={`premium-enter mb-8 rounded-[32px] border p-5 md:p-6 backdrop-blur-2xl ${surfaceClass}`} style={{ animationDelay: "360ms" }}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.28em] ${softTextClass}`}>Activity ledger</p>
              <h2 className={`mt-2 text-xl font-semibold ${titleTextClass}`}>Historial operativo</h2>
              <p className={`mt-1 text-sm ${mediumTextClass}`}>
                Quién creó, editó o eliminó productos, con fecha, hora y usuario responsable.
              </p>
            </div>

            <button
              onClick={() => businessId && loadMovements(businessId)}
              disabled={isRefreshingMovements}
              className={`status-sweep relative overflow-hidden rounded-2xl border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-wait ${
                isDark
                  ? "border-blue-500/25 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15"
                  : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <span className="relative z-10">
                {isRefreshingMovements ? "Actualizando..." : `Actualizado ${formatRefreshTime(lastMovementRefreshAt)}`}
              </span>
            </button>
          </div>

          {inventoryMovements.length === 0 ? (
            <div className={`rounded-2xl border p-5 text-sm ${cardClass} ${softTextClass}`}>
              Aún no hay movimientos registrados. Crea, edita o elimina un producto para iniciar el historial.
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-white/10">
              <div className={`hidden grid-cols-[150px_minmax(0,1fr)_160px_150px] gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.22em] md:grid ${
                isDark ? "bg-white/[0.05] text-slate-400" : "bg-slate-50 text-slate-500"
              }`}>
                <p>Movimiento</p>
                <p>Detalle</p>
                <p>Usuario</p>
                <p>Fecha y hora</p>
              </div>

              <div className="divide-y divide-white/10">
                {inventoryMovements.map((movement) => {
                  const actor = movement.user_id
                    ? sellerProfiles[movement.user_id]?.full_name || "Usuario"
                    : "Registro anterior"

                  const movementLabel =
                    movement.type === "created"
                      ? "Ingreso"
                      : movement.type === "updated"
                        ? "Edición"
                        : movement.type === "sold"
                          ? "Salida"
                          : "Eliminado"

                  const badgeClass =
                    movement.type === "deleted"
                      ? "bg-rose-500/10 text-rose-300 border-rose-400/18"
                      : movement.type === "sold"
                        ? "bg-indigo-500/10 text-indigo-200 border-indigo-400/18"
                        : "bg-blue-500/10 text-blue-200 border-blue-400/18"

                  return (
                    <div
                      key={movement.id}
                      className={`grid gap-3 px-4 py-4 md:grid-cols-[150px_minmax(0,1fr)_160px_150px] ${
                        isDark ? "bg-[#121620]/68 hover:bg-white/[0.055]" : "bg-white hover:bg-slate-50"
                      } premium-table-row transition`}
                    >
                      <div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                          {movementLabel}
                        </span>
                      </div>

                      <div>
                        <p className={`text-sm font-medium ${titleTextClass}`}>
                          {movement.note || "Movimiento registrado"}
                        </p>
                        <p className={`mt-1 text-xs ${softTextClass}`}>
                          {movement.type === "sold" ? "Salida" : movement.type === "created" ? "Entrada" : "Cantidad"}: {Number(movement.quantity || 0)}
                        </p>
                      </div>

                      <p className={`text-sm ${mediumTextClass}`}>{actor}</p>

                      <p className={`font-mono text-xs ${softTextClass}`}>
                        {formatMovementDate(movement.created_at)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
          <p className={`text-xs uppercase tracking-[0.35em] ${isDark ? "text-white/25" : "text-gray-400"}`}>
            Mahu Plexus · Operación comercial
          </p>
        </div>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-0 top-6 z-50 pointer-events-none flex justify-center px-4">
          <div
            className={`premium-toast relative w-full max-w-[380px] overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_22px_70px_rgba(0,0,0,0.30)] backdrop-blur-2xl ${
              isDark
                ? "border-white/[0.10] bg-[#111827]/92 text-white"
                : "border-slate-200 bg-white/95 text-slate-950"
            }`}
          >
            <div className="relative flex items-center gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-base font-black ${
                  toast.type === "delete"
                    ? "bg-rose-500/14 text-rose-300 premium-trash-icon ring-1 ring-red-400/20"
                    : toast.type === "edit"
                      ? "bg-amber-500/14 text-amber-300 premium-toast-icon ring-1 ring-amber-400/20"
                      : toast.type === "update"
                        ? "bg-blue-500/14 text-blue-300 premium-toast-icon ring-1 ring-blue-400/20"
                        : toast.type === "export"
                          ? "bg-emerald-500/14 text-emerald-300 premium-export-icon ring-1 ring-emerald-400/20"
                          : toast.type === "error"
                            ? "bg-rose-500/14 text-rose-300 premium-toast-icon ring-1 ring-rose-400/20"
                            : "bg-sky-500/14 text-sky-300 premium-toast-icon ring-1 ring-sky-400/20"
                }`}
              >
                {toast.type === "delete" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M8 8h8m-7 3v6m6-6v6M5 8h14l-1 12H6L5 8Zm4-3h6l1 3H8l1-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : toast.type === "edit" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="m14 8 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : toast.type === "update" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M20 12a8 8 0 0 1-14.6 4.5M4 12A8 8 0 0 1 18.6 7.5M18 4v4h-4M6 20v-4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : toast.type === "export" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : toast.type === "error" ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M12 8v5m0 3h.01M10.3 4.6 2.9 18a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold ${titleTextClass}`}>{toast.message}</p>
                <p className={`mt-0.5 truncate text-xs ${softTextClass}`}>
                  {toast.type === "delete"
                    ? "Movimiento registrado en historial."
                    : toast.type === "edit"
                      ? "Listo para modificar detalles."
                      : toast.type === "update"
                        ? "Sincronizando cambios."
                        : toast.type === "export"
                          ? "Archivo generado correctamente."
                          : toast.type === "error"
                            ? "Revisa la acción e inténtalo otra vez."
                            : "Operación completada."}
                </p>
              </div>
            </div>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-500/15">
              <div
                className={`toast-progress h-full rounded-full ${
                  toast.type === "delete"
                    ? "bg-red-400"
                    : toast.type === "error"
                      ? "bg-rose-400"
                      : toast.type === "export"
                        ? "bg-emerald-400"
                        : toast.type === "edit"
                          ? "bg-amber-400"
                          : "bg-blue-400"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {isLoadingSystem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 backdrop-blur-2xl">
          <div
            className={`relative w-full max-w-sm overflow-hidden rounded-[32px] border p-6 text-center shadow-[0_35px_120px_rgba(0,0,0,0.55)] ${
              isDark
                ? "border-blue-500/20 bg-[#0F172A]/94 text-white"
                : "border-blue-200 bg-white/95 text-white"
            }`}
          >
            <div className="system-glow absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-500 to-indigo-500 shadow-[0_16px_50px_rgba(59,130,246,0.20)]">
              <div className="system-spin h-12 w-12 rounded-full border-4 border-slate-950/20 border-t-slate-950" />
            </div>

            <p className={`relative text-xl font-bold ${titleTextClass}`}>Cargando sistema</p>
            <p className={`relative mt-2 text-sm ${softTextClass}`}>
              Preparando dashboard, inventario y ventas.
            </p>

            <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="premium-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
