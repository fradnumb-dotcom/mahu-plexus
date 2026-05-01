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
type ToastType = "create" | "update" | "edit" | "delete" | "export" | "error" | "success"

export default function DashboardPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, SellerProfile>>({})
  const [search, setSearch] = useState("")
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [role, setRole] = useState<"owner" | "seller" | null>(null)
  const [isLoadingSystem, setIsLoadingSystem] = useState(true)
  const [isDark, setIsDark] = useState(true)
  const [currentTime, setCurrentTime] = useState("")
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
    } catch (error) {
      console.error(error)
      showToast("Error de conexión", "error")
    }
  }

  const handleDelete = async (id: string) => {
    if (!businessId) return

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" })
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
              <td>${escapeHtml(product.name)}</td>
              <td class="currency">${price.toFixed(2)}</td>
              <td class="center">${stockValue}</td>
              <td>${escapeHtml(stockLabel)}</td>
              <td>${escapeHtml(product.serial_code || "-")}</td>
              <td>${escapeHtml(product.description || "-")}</td>
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
              }

              table.inventory th {
                background: #0f172a;
                color: #ffffff;
                font-weight: 700;
                text-align: left;
                border: 1px solid #334155;
                padding: 10px;
                font-size: 12px;
              }

              table.inventory td {
                border: 1px solid #cbd5e1;
                padding: 9px;
                font-size: 12px;
                vertical-align: middle;
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
    ? "border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
    : "border-slate-200 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"

  const cardClass = isDark
    ? "border-white/10 bg-black/20"
    : "border-slate-200 bg-slate-50/80"

  const inputClass = isDark
    ? "border-white/10 bg-black/30 text-white placeholder:text-white/30"
    : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"

  const titleTextClass = isDark ? "text-white" : "text-slate-950"
  const softTextClass = isDark ? "text-white/45" : "text-slate-500"
  const mediumTextClass = isDark ? "text-white/60" : "text-slate-600"

  const tabBaseClass =
    "rounded-2xl px-4 py-2.5 text-sm font-medium transition border"

  if (role === "seller") {
    return null
  }

  return (
    <main
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#050816] text-white" : "bg-[#f3f6fb] text-slate-950"
      }`}
    >
      <style jsx global>{`
        @keyframes premiumEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
            filter: blur(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
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
          animation: premiumEnter 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
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
          animation: premiumToastIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .toast-progress {
          animation: toastProgress 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          box-shadow: 0 0 18px rgba(34, 211, 238, 0.35);
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
      `}</style>
      <div className="absolute inset-0">
        <div className="absolute -left-28 -top-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative z-10 min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden h-screen w-72 overflow-y-auto premium-scrollbar border-r px-5 py-6 backdrop-blur-2xl xl:block ${
            isDark
              ? "border-white/10 bg-[#050816]/92 shadow-[24px_0_90px_rgba(0,0,0,0.35)]"
              : "border-slate-200 bg-white/92 shadow-[24px_0_70px_rgba(15,23,42,0.08)]"
          }`}
        >
          <div className="premium-enter mb-8 flex items-center gap-3">
            <div className="premium-float flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-purple-400 text-xl font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              M
            </div>
            <div>
              <p className={`text-sm font-semibold ${titleTextClass}`}>Mahu Plexus</p>
              <p className={`text-xs ${softTextClass}`}>Admin panel</p>
            </div>
          </div>

          <nav className="premium-enter space-y-2" style={{ animationDelay: "80ms" }}>
            <a
              href="/dashboard"
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                isDark
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
                  : "border-cyan-200 bg-cyan-50 text-cyan-700"
              }`}
            >
              <span>▣</span>
              Dashboard
            </a>

            <a
              href="/sales"
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isDark ? "text-white/55 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>◈</span>
              Ventas
            </a>

            <a
              href="/sellers"
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isDark ? "text-white/55 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>◎</span>
              Vendedores
            </a>

            <a
              href="/settings"
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isDark ? "text-white/55 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span>⚙</span>
              Configuración
            </a>
          </nav>

          <div className={`mt-8 rounded-3xl border p-4 ${cardClass}`}>
            <p className={`text-xs uppercase tracking-[0.28em] ${softTextClass}`}>Estado</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="premium-glow h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
              <p className={`text-sm font-semibold ${titleTextClass}`}>Sistema activo</p>
            </div>
            <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
              Ventas, inventario y vendedores operando por negocio.
            </p>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push("/login")
            }}
            className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Salir
          </button>
        </aside>

        <div className="min-w-0 px-4 py-5 md:px-6 lg:px-8 xl:ml-72">
        <div className={`premium-enter sticky top-4 z-30 mb-5 flex flex-col gap-4 rounded-[28px] border px-5 py-4 backdrop-blur-2xl md:flex-row md:items-center md:justify-between ${surfaceClass}`}>
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
              Bienvenido a Mahu Plexus
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
              Control central de ventas, inventario y rendimiento comercial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={`hidden rounded-2xl border px-4 py-3 text-xs font-semibold md:block ${cardClass} ${mediumTextClass}`}>
              {new Date().toLocaleDateString("es-PE")}
            </div>

            <button
              onClick={toggleTheme}
              className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition hover:-translate-y-0.5 ${
                isDark
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              {isDark ? "☀️ Claro" : "🌙 Oscuro"}
            </button>

            <div className={`relative overflow-hidden rounded-2xl border px-5 py-3 text-sm font-semibold ${cardClass}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/10 via-purple-400/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <span className="premium-glow h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.75)]" />
                <div>
                  <p className={`text-[10px] uppercase tracking-[0.22em] ${softTextClass}`}>Hora local</p>
                  <p className={`font-mono text-base font-bold ${titleTextClass}`}>{currentTime || "--:--:--"}</p>
                </div>
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
          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-2 text-3xl font-semibold ${titleTextClass}`}>
              {salesTodayCount}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">{unitsToday}</p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Total vendido
            </p>
            <p className="mt-2 text-3xl font-semibold text-green-400">
              S/ {totalToday.toFixed(2)}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${surfaceClass}`}>
            <p className={`text-[11px] uppercase tracking-[0.24em] ${softTextClass}`}>
              Productos
            </p>
            <p className="mt-2 text-3xl font-semibold text-purple-300">{totalProducts}</p>
          </div>
        </div>

        <div className="premium-enter mb-6 grid gap-4 xl:grid-cols-3" style={{ animationDelay: "170ms" }}>
          <div className={`rounded-3xl border p-5 backdrop-blur-xl xl:col-span-2 ${surfaceClass}`}>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>Resumen general</h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  Estado actual del inventario y movimiento del negocio.
                </p>
              </div>

              <div className={`rounded-2xl border px-4 py-2 text-xs font-semibold ${cardClass} ${mediumTextClass}`}>
                Salud inventario: {inventoryHealth}%
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Stock total</p>
                <p className={`mt-2 text-2xl font-semibold ${titleTextClass}`}>{totalStock}</p>
              </div>

              <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Valor estimado</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-300">
                  S/ {totalValue.toFixed(2)}
                </p>
              </div>

              <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 ${cardClass}`}>
                <p className={`text-sm ${softTextClass}`}>Sin stock</p>
                <p className="mt-2 text-2xl font-semibold text-red-400">
                  {outOfStockProducts.length}
                </p>
              </div>

              <div className={`rounded-2xl border p-4 transition duration-300 hover:-translate-y-1 md:col-span-3 ${cardClass}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className={`text-sm ${softTextClass}`}>Ticket promedio de hoy</p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-300">
                      S/ {averageTicketToday.toFixed(2)}
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/10 md:w-56">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300"
                      style={{ width: `${Math.min(100, averageTicketToday > 0 ? 78 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_0.8fr]">
              <div className={`rounded-[26px] border p-4 ${cardClass}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${titleTextClass}`}>Ventas últimos 7 días</p>
                    <p className={`mt-1 text-xs ${softTextClass}`}>Gráfico real basado en ventas registradas.</p>
                  </div>
                  <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                    {sales.length} venta(s)
                  </span>
                </div>

                <div className="flex h-44 items-end gap-3 rounded-[22px] border border-white/10 bg-black/10 p-4">
                  {salesTrend.map((day, index) => (
                    <div
                      key={day.key}
                      className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <div
                        className="premium-enter rounded-t-2xl bg-gradient-to-t from-cyan-400 via-sky-300 to-purple-400 shadow-[0_0_26px_rgba(34,211,238,0.22)] transition duration-300 group-hover:scale-x-110"
                        style={{ height: `${day.height}%` }}
                        title={`S/ ${day.amount.toFixed(2)} · ${day.count} venta(s)`}
                      />
                      <p className={`truncate text-center text-[11px] capitalize ${softTextClass}`}>{day.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[26px] border p-4 ${cardClass}`}>
                <div className="mb-3">
                  <p className={`text-sm font-semibold ${titleTextClass}`}>Inventario visual</p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>Disponibilidad y riesgo.</p>
                </div>

                <div className="flex items-center justify-center py-2">
                  <div
                    className="premium-float grid h-36 w-36 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(rgb(34 211 238) ${inventoryHealth * 3.6}deg, rgb(248 113 113) ${inventoryHealth * 3.6}deg ${Math.max(inventoryHealth + stockRiskPercent, inventoryHealth) * 3.6}deg, rgba(148,163,184,0.22) 0deg)`,
                    }}
                  >
                    <div className={`grid h-24 w-24 place-items-center rounded-full ${isDark ? "bg-[#050816]" : "bg-white"}`}>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${titleTextClass}`}>{inventoryHealth}%</p>
                        <p className={`text-[11px] ${softTextClass}`}>operativo</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-cyan-400/10 p-3">
                    <p className="text-lg font-bold text-cyan-300">{products.length}</p>
                    <p className={`text-[11px] ${softTextClass}`}>productos</p>
                  </div>
                  <div className="rounded-2xl bg-red-400/10 p-3">
                    <p className="text-lg font-bold text-red-300">{stockRiskPercent}%</p>
                    <p className={`text-[11px] ${softTextClass}`}>riesgo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`mt-4 rounded-[26px] border p-4 ${cardClass}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className={`text-sm font-semibold ${titleTextClass}`}>Stock por producto</p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>Top productos con mayor stock.</p>
                </div>
              </div>

              {stockChartData.length === 0 ? (
                <p className={`py-8 text-center text-sm ${softTextClass}`}>Aún no hay productos para graficar.</p>
              ) : (
                <div className="flex h-36 items-end gap-3">
                  {stockChartData.map((item, index) => (
                    <div key={item.id} className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                      <div
                        className="premium-enter rounded-t-2xl bg-gradient-to-t from-purple-500 to-cyan-300 transition duration-300 group-hover:scale-x-110"
                        style={{ height: `${item.height}%`, animationDelay: `${index * 70}ms` }}
                        title={`${item.name}: ${item.stock}`}
                      />
                      <p className={`truncate text-center text-[11px] ${softTextClass}`}>{item.name}</p>
                    </div>
                  ))}
                </div>
              )}
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

        <div className="premium-enter mb-6 grid gap-4 xl:grid-cols-2" style={{ animationDelay: "220ms" }}>
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
                      ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/15"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  Exportar Excel
                </button>

                <button
                  onClick={exportSalesToExcel}
                  className={`rounded-2xl border px-4 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                    isDark
                      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/15"
                      : "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
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
                className={`w-full rounded-2xl border px-5 py-4 outline-none transition focus:border-cyan-400 ${inputClass}`}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={inventorySort}
                  onChange={(e) => setInventorySort(e.target.value as InventorySort)}
                  className={`rounded-2xl border px-5 py-4 outline-none transition focus:border-cyan-400 ${inputClass}`}
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
                  className={`rounded-2xl border px-5 py-4 outline-none transition focus:border-cyan-400 ${inputClass}`}
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
                className={`sticky top-0 z-10 hidden grid-cols-[minmax(0,1.8fr)_120px_150px_170px] gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.22em] xl:grid ${
                  isDark ? "bg-white/[0.05] text-white/45" : "bg-slate-50 text-slate-500"
                }`}
              >
                <p>Producto</p>
                <p>Stock</p>
                <p>Precio</p>
                <p className="text-right">Acciones</p>
              </div>

              <div key={animateKey} className="premium-scrollbar max-h-[620px] overflow-y-auto p-2">
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
              <p className="mt-2 text-2xl font-bold text-red-300">{stockRiskPercent}%</p>
              <p className={`mt-1 text-sm ${mediumTextClass}`}>
                Productos con stock bajo o agotado.
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${cardClass}`}>
              <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Movimiento</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">{salesTodayCount}</p>
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

        <div className="mt-12 text-center">
          <p className={`text-xs uppercase tracking-[0.35em] ${isDark ? "text-white/25" : "text-gray-400"}`}>
            Powered by Mahu Plexus
          </p>
        </div>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center px-4">
          <div
            className={`premium-toast relative w-full max-w-sm overflow-hidden rounded-[24px] border px-5 py-4 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl ${
              isDark
                ? "border-cyan-300/20 bg-[#07111f]/88 text-white"
                : "border-cyan-200 bg-white/95 text-slate-950"
            }`}
          >
            <div className="premium-shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/12 to-transparent" />

            <div
              className={`relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black shadow-[0_0_32px_rgba(34,211,238,0.22)] ${
                toast.type === "delete"
                  ? "bg-gradient-to-br from-red-400 to-orange-300 text-white premium-trash-icon"
                  : toast.type === "edit"
                    ? "bg-gradient-to-br from-yellow-300 to-amber-400 text-slate-950 premium-toast-icon"
                    : toast.type === "update"
                      ? "bg-gradient-to-br from-sky-300 to-cyan-400 text-slate-950 premium-toast-icon"
                      : toast.type === "export"
                        ? "bg-gradient-to-br from-emerald-300 to-cyan-300 text-slate-950 premium-export-icon"
                        : toast.type === "error"
                          ? "bg-gradient-to-br from-red-400 to-rose-500 text-white premium-toast-icon"
                          : "bg-gradient-to-br from-cyan-300 to-purple-400 text-slate-950 premium-toast-icon"
              }`}
            >
              {toast.type === "delete"
                ? "🗑️"
                : toast.type === "edit"
                  ? "✎"
                  : toast.type === "update"
                    ? "↻"
                    : toast.type === "export"
                      ? "↓"
                      : toast.type === "error"
                        ? "!"
                        : "✓"}
            </div>

            <p className={`relative text-base font-semibold ${titleTextClass}`}>{toast.message}</p>
            <p className={`relative mt-1 text-xs ${softTextClass}`}>
              {toast.type === "delete"
                ? "Eliminando y sincronizando inventario."
                : toast.type === "edit"
                  ? "Producto listo para editar."
                  : toast.type === "update"
                    ? "Actualizando datos del producto."
                    : toast.type === "export"
                      ? "Generando archivo organizado."
                      : toast.type === "error"
                        ? "Revisa la acción e inténtalo nuevamente."
                        : "Guardando cambios del sistema."}
            </p>

            <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`toast-progress h-full rounded-full ${
                  toast.type === "delete"
                    ? "bg-gradient-to-r from-red-400 to-orange-300"
                    : toast.type === "error"
                      ? "bg-gradient-to-r from-red-400 to-rose-500"
                      : toast.type === "export"
                        ? "bg-gradient-to-r from-emerald-300 to-cyan-300"
                        : "bg-gradient-to-r from-cyan-300 to-purple-400"
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
                ? "border-cyan-300/20 bg-[#050816]/92 text-white"
                : "border-cyan-200 bg-white/95 text-slate-950"
            }`}
          >
            <div className="system-glow absolute -top-16 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-cyan-300 to-purple-400 shadow-[0_0_55px_rgba(34,211,238,0.3)]">
              <div className="system-spin h-12 w-12 rounded-full border-4 border-slate-950/20 border-t-slate-950" />
            </div>

            <p className={`relative text-xl font-bold ${titleTextClass}`}>Cargando sistema</p>
            <p className={`relative mt-2 text-sm ${softTextClass}`}>
              Preparando dashboard, inventario y ventas.
            </p>

            <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="premium-shimmer h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-300 to-purple-400" />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
