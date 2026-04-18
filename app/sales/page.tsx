"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"

type Product = {
  id: string
  name: string
  price: number
  stock: number
  serial_code?: string | null
}

type CartItem = {
  product_id: string
  name: string
  price: number
  quantity: number
  stock: number
  serial_code?: string | null
}

type SaleItem = {
  id: string
  quantity: number
  price: number
  subtotal: number
  product_id: string
  products?: {
    id: string
    name: string
    serial_code?: string | null
  } | null
}

type Sale = {
  id: string
  total: number
  customer_name?: string | null
  customer_phone?: string | null
  customer_dni?: string | null
  customer_department?: string | null
  customer_province?: string | null
  customer_district?: string | null
  customer_address?: string | null
  payment_method?: string | null
  payment_detail?: string | null
  created_at: string
  sale_items: SaleItem[]
}

type GroupedSales = {
  dateKey: string
  label: string
  total: number
  units: number
  count: number
  sales: Sale[]
}

export default function SalesPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState("Mi Tienda")
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isDark, setIsDark] = useState(true)

  const [serialSearch, setSerialSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerDni, setCustomerDni] = useState("")
  const [customerDepartment, setCustomerDepartment] = useState("")
  const [customerProvince, setCustomerProvince] = useState("")
  const [customerDistrict, setCustomerDistrict] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [dniLoading, setDniLoading] = useState(false)
  const [lastDniQueried, setLastDniQueried] = useState("")

  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const [paymentDetail, setPaymentDetail] = useState("")

  const [deleteMonth, setDeleteMonth] = useState("")
  const [deleteYear, setDeleteYear] = useState(String(new Date().getFullYear()))
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
        await loadBusinessName(data.business_id)
        await loadProducts(data.business_id)
        await loadSales(data.business_id)
      }
    }

    load()
  }, [router])

  const loadBusinessName = async (business_id: string) => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", business_id)
        .single()

      if (!error && data?.name) {
        setBusinessName(data.name)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const loadProducts = async (business_id: string) => {
    try {
      const res = await fetch(`/api/products?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudieron cargar los productos")
        return
      }

      setProducts(data.data || [])
    } catch (error) {
      console.error(error)
      showToast("Error al cargar productos")
    }
  }

  const loadSales = async (business_id: string) => {
    try {
      const res = await fetch(`/api/sales?business_id=${business_id}`)
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudieron cargar las ventas")
        return
      }

      setSales(data.data || [])
    } catch (error) {
      console.error(error)
      showToast("Error al cargar ventas")
    }
  }

  const availableProducts = useMemo(() => {
    return products.filter((product) => Number(product.stock) > 0)
  }, [products])

  const serialMatches = useMemo(() => {
    const q = serialSearch.trim().toLowerCase()
    if (!q) return []

    return availableProducts.filter((product) =>
      String(product.serial_code || "").toLowerCase().includes(q)
    )
  }, [serialSearch, availableProducts])

  useEffect(() => {
    if (serialMatches.length === 1) {
      setSelectedProduct(serialMatches[0].id)
    }
  }, [serialMatches])

  const currentProduct = availableProducts.find((p) => p.id === selectedProduct)
  const totalPreview = currentProduct ? Number(currentProduct.price) * Number(quantity || 0) : 0

  const cartTotal = cart.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.quantity),
    0
  )

  const getLocalDateKey = (dateString: string) => {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(dateString))
  }

  const formatGroupLabel = (dateString: string) => {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const formatHour = (dateString: string) => {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString))
  }

  const formatFullDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString))
  }

  const groupedSales: GroupedSales[] = useMemo(() => {
    const groups: Record<string, GroupedSales> = {}

    for (const sale of sales) {
      const key = getLocalDateKey(sale.created_at)

      if (!groups[key]) {
        groups[key] = {
          dateKey: key,
          label: formatGroupLabel(sale.created_at),
          total: 0,
          units: 0,
          count: 0,
          sales: [],
        }
      }

      groups[key].sales.push(sale)
      groups[key].count += 1
      groups[key].total += Number(sale.total || 0)
      groups[key].units += (sale.sale_items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      )
    }

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  }, [sales, timeZone])

  const todayKey = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  const todayGroup = groupedSales.find((group) => group.dateKey === todayKey)

  const cantidadVentasHoy = todayGroup?.count || 0
  const totalUnidadesHoy = todayGroup?.units || 0
  const totalVentasHoy = todayGroup?.total || 0

  const handlePickProduct = (productId: string) => {
    setSelectedProduct(productId)
  }

  const handleDniChange = async (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 8)
    setCustomerDni(cleanValue)

    if (cleanValue.length < 8) {
      setLastDniQueried("")
      setCustomerName("")
      setCustomerDepartment("")
      setCustomerProvince("")
      setCustomerDistrict("")
      setCustomerAddress("")
      return
    }

    if (cleanValue === lastDniQueried) return

    try {
      setDniLoading(true)

      const res = await fetch(`/api/dni?numero=${cleanValue}`)
      const data = await res.json()

      if (!res.ok || !data?.success) {
        showToast(data?.error || "No se pudo consultar el DNI")
        return
      }

      const nombres = data.data?.nombres || ""
      const apellidoPaterno = data.data?.apellido_paterno || ""
      const apellidoMaterno = data.data?.apellido_materno || ""

      const fullName =
        data.data?.nombre_completo ||
        `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.replace(/\s+/g, " ").trim()

      setCustomerName(fullName)
      setCustomerDepartment(data.data?.departamento || "")
      setCustomerProvince(data.data?.provincia || "")
      setCustomerDistrict(data.data?.distrito || "")
      setCustomerAddress(
        data.data?.direccion_completa ||
          data.data?.direccion ||
          ""
      )
      setLastDniQueried(cleanValue)
    } catch (error) {
      console.error(error)
      showToast("Error al consultar el DNI")
    } finally {
      setDniLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!currentProduct) {
      showToast("Selecciona un producto")
      return
    }

    const qty = Number(quantity)

    if (qty <= 0) {
      showToast("La cantidad debe ser mayor a 0")
      return
    }

    const existing = cart.find((item) => item.product_id === currentProduct.id)
    const alreadyInCart = existing ? existing.quantity : 0
    const totalWanted = alreadyInCart + qty

    if (totalWanted > Number(currentProduct.stock)) {
      showToast("La cantidad supera el stock disponible")
      return
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.product_id === currentProduct.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        )
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          product_id: currentProduct.id,
          name: currentProduct.name,
          price: Number(currentProduct.price),
          quantity: qty,
          stock: Number(currentProduct.stock),
          serial_code: currentProduct.serial_code || null,
        },
      ])
    }

    showToast(`Agregado: ${currentProduct.name}`)
    setSelectedProduct("")
    setSerialSearch("")
    setQuantity("1")
  }

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
    showToast("Producto quitado del carrito")
  }

  const handleSale = async () => {
    if (!businessId) {
      showToast("No se pudo identificar el negocio")
      return
    }

    if (cart.length === 0) {
      showToast("Agrega al menos un producto")
      return
    }

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: businessId,
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_dni: customerDni,
          customer_department: customerDepartment,
          customer_province: customerProvince,
          customer_district: customerDistrict,
          customer_address: customerAddress,
          payment_method: paymentMethod,
          payment_detail: paymentDetail,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudo registrar la venta")
        return
      }

      showToast("Venta registrada correctamente")
      setCart([])
      setSelectedProduct("")
      setSerialSearch("")
      setQuantity("1")
      setCustomerName("")
      setCustomerPhone("")
      setCustomerDni("")
      setCustomerDepartment("")
      setCustomerProvince("")
      setCustomerDistrict("")
      setCustomerAddress("")
      setLastDniQueried("")
      setPaymentMethod("efectivo")
      setPaymentDetail("")

      await loadProducts(businessId)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleDeleteByMonth = async () => {
    if (!businessId || !deleteMonth || !deleteYear) {
      showToast("Selecciona mes y año")
      return
    }

    const confirmDelete = window.confirm(
      `Se eliminarán todos los registros del mes ${deleteMonth}/${deleteYear}. Esta acción no se puede deshacer.`
    )

    if (!confirmDelete) return

    try {
      const res = await fetch(
        `/api/sales?business_id=${businessId}&month=${deleteMonth}&year=${deleteYear}`,
        {
          method: "DELETE",
        }
      )

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudieron eliminar los registros")
        return
      }

      showToast(`Registros eliminados: ${data.deleted || 0}`)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error al eliminar")
    }
  }

  const handlePrintReceipt = (sale: Sale) => {
    const receiptWindow = window.open("", "_blank", "width=960,height=1100")

    if (!receiptWindow) {
      showToast("No se pudo abrir el comprobante")
      return
    }

    const itemsHtml = (sale.sale_items || [])
      .map(
        (item) => `
          <tr>
            <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight:700; color:#0f172a;">${item.products?.name || "Producto"}</div>
              ${
                item.products?.serial_code
                  ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">Serie: ${item.products.serial_code}</div>`
                  : ""
              }
            </td>
            <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; text-align:center; color:#0f172a;">${item.quantity}</td>
            <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; text-align:right; color:#0f172a;">S/ ${Number(item.price).toFixed(2)}</td>
            <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb; text-align:right; font-weight:800; color:#0f172a;">S/ ${Number(item.subtotal).toFixed(2)}</td>
          </tr>
        `
      )
      .join("")

    const locationHtml = [
      sale.customer_department,
      sale.customer_province,
      sale.customer_district,
    ]
      .filter(Boolean)
      .join(" - ")

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Comprobante</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #e8eefc;
              color: #111827;
            }
            .page {
              max-width: 920px;
              margin: 28px auto;
              background: #ffffff;
              border-radius: 30px;
              overflow: hidden;
              box-shadow: 0 28px 90px rgba(15, 23, 42, 0.18);
            }
            .header {
              background: linear-gradient(135deg, #020617, #0f172a, #1d4ed8, #7c3aed);
              color: white;
              padding: 42px 46px;
              position: relative;
            }
            .header::after {
              content: "";
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 35%);
              pointer-events: none;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              position: relative;
              z-index: 1;
            }
            .store-name {
              margin: 0;
              font-size: 34px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }
            .brand-sub {
              margin-top: 8px;
              font-size: 13px;
              opacity: 0.82;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .ticket-badge {
              background: rgba(255,255,255,0.12);
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 18px;
              padding: 12px 16px;
              min-width: 180px;
              text-align: right;
              backdrop-filter: blur(6px);
            }
            .ticket-badge .mini {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.8px;
              opacity: 0.75;
            }
            .ticket-badge .code {
              margin-top: 6px;
              font-size: 19px;
              font-weight: 800;
            }
            .content {
              padding: 36px 42px 42px;
            }
            .hero-total {
              margin-top: -22px;
              position: relative;
              z-index: 2;
            }
            .hero-total-card {
              background: white;
              border: 1px solid #dbeafe;
              border-radius: 22px;
              padding: 18px 22px;
              box-shadow: 0 14px 40px rgba(59, 130, 246, 0.12);
              display: inline-block;
            }
            .hero-total-label {
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.8px;
            }
            .hero-total-value {
              margin-top: 6px;
              font-size: 34px;
              font-weight: 900;
              color: #059669;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 18px;
              margin-top: 24px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 18px 20px;
            }
            .card-wide {
              grid-column: 1 / -1;
            }
            .label {
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.8px;
              margin-bottom: 8px;
            }
            .value {
              font-size: 18px;
              font-weight: 800;
              color: #0f172a;
            }
            .soft {
              color: #475569;
              font-weight: 600;
            }
            .section-title {
              font-size: 17px;
              font-weight: 900;
              margin: 34px 0 16px;
              color: #0f172a;
              letter-spacing: 0.2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
            }
            thead th {
              text-align: left;
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              padding-bottom: 12px;
              border-bottom: 2px solid #dbeafe;
            }
            .summary {
              margin-top: 26px;
              display: flex;
              justify-content: flex-end;
            }
            .summary-card {
              min-width: 300px;
              background: linear-gradient(135deg, #ecfeff, #f5f3ff);
              border: 1px solid #c7d2fe;
              border-radius: 22px;
              padding: 20px 24px;
            }
            .summary-line {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              font-size: 15px;
              color: #334155;
            }
            .summary-total {
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px solid #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .summary-total span:first-child {
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #475569;
            }
            .summary-total span:last-child {
              font-size: 30px;
              font-weight: 900;
              color: #0f172a;
            }
            .footer {
              margin-top: 34px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #64748b;
              font-size: 12px;
            }
            .signature {
              font-weight: 800;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .print-actions {
              text-align: right;
              margin: 20px auto 0;
              max-width: 920px;
            }
            .btn {
              background: #0f172a;
              color: white;
              border: 0;
              padding: 12px 18px;
              border-radius: 12px;
              font-weight: 700;
              cursor: pointer;
            }
            @media print {
              body { background: white; }
              .page {
                box-shadow: none;
                margin: 0;
                max-width: 100%;
                border-radius: 0;
              }
              .print-hide { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="print-actions print-hide">
            <button class="btn" onclick="window.print()">Imprimir comprobante</button>
          </div>

          <div class="page">
            <div class="header">
              <div class="header-top">
                <div>
                  <h1 class="store-name">${businessName || "Mi Tienda"}</h1>
                  <div class="brand-sub">Comprobante Premium · Mahu Plexus</div>
                </div>

                <div class="ticket-badge">
                  <div class="mini">Comprobante</div>
                  <div class="code">#${sale.id.slice(0, 8).toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div class="content">
              <div class="hero-total">
                <div class="hero-total-card">
                  <div class="hero-total-label">Total de la venta</div>
                  <div class="hero-total-value">S/ ${Number(sale.total).toFixed(2)}</div>
                </div>
              </div>

              <div class="grid">
                <div class="card">
                  <div class="label">Fecha y hora</div>
                  <div class="value">${formatFullDateTime(sale.created_at)}</div>
                </div>

                <div class="card">
                  <div class="label">Método de pago</div>
                  <div class="value" style="text-transform: capitalize;">${sale.payment_method || "efectivo"}</div>
                </div>

                <div class="card">
                  <div class="label">Cliente</div>
                  <div class="value">${sale.customer_name || "Cliente general"}</div>
                </div>

                <div class="card">
                  <div class="label">Teléfono</div>
                  <div class="value">${sale.customer_phone || "-"}</div>
                </div>

                <div class="card">
                  <div class="label">DNI</div>
                  <div class="value">${sale.customer_dni || "-"}</div>
                </div>

                <div class="card">
                  <div class="label">Ubicación</div>
                  <div class="value">${locationHtml || "-"}</div>
                </div>

                <div class="card card-wide">
                  <div class="label">Dirección</div>
                  <div class="value soft">${sale.customer_address || "-"}</div>
                </div>

                <div class="card card-wide">
                  <div class="label">Detalle de pago</div>
                  <div class="value soft">${sale.payment_detail || "Sin detalle adicional"}</div>
                </div>
              </div>

              <div class="section-title">Detalle de productos</div>

              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align:center;">Cantidad</th>
                    <th style="text-align:right;">Precio</th>
                    <th style="text-align:right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="summary">
                <div class="summary-card">
                  <div class="summary-line">
                    <span>Productos</span>
                    <span>${(sale.sale_items || []).length}</span>
                  </div>
                  <div class="summary-line">
                    <span>Unidades</span>
                    <span>${(sale.sale_items || []).reduce((acc, item) => acc + Number(item.quantity || 0), 0)}</span>
                  </div>

                  <div class="summary-total">
                    <span>Total final</span>
                    <span>S/ ${Number(sale.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div class="footer">
                <div class="signature">Powered by Mahu Plexus</div>
                <div>Gracias por su compra</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    receiptWindow.document.close()
  }

  const surfaceClass = isDark
    ? "border-white/10 bg-white/5"
    : "border-gray-200 bg-white shadow-sm"

  const panelDarkClass = isDark
    ? "border-white/10 bg-black/20"
    : "border-gray-200 bg-gray-50"

  const inputClass = isDark
    ? "border-white/10 bg-black/30 text-white placeholder:text-white/30"
    : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"

  const softTextClass = isDark ? "text-white/45" : "text-gray-500"
  const mediumTextClass = isDark ? "text-white/60" : "text-gray-600"
  const titleTextClass = isDark ? "text-white" : "text-gray-900"
  const dividerClass = isDark ? "bg-white/10" : "bg-gray-200"

  return (
    <main
      className={`min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#050816] text-white" : "bg-[#f6f8fc] text-gray-900"
      }`}
    >
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="mb-4 flex justify-end">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
          </button>
        </div>

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-3xl font-semibold md:text-4xl ${titleTextClass}`}>
              Registro de ventas
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
              Busca por serie, agrega varios productos y genera un solo comprobante.
            </p>
          </div>

          <a
            href="/dashboard"
            className={`rounded-2xl border px-5 py-3 text-sm font-medium backdrop-blur-xl transition ${
              isDark
                ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            Volver al panel
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-3 text-3xl font-semibold ${titleTextClass}`}>
              {cantidadVentasHoy}
            </p>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Unidades vendidas
            </p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">
              {totalUnidadesHoy}
            </p>
          </div>

          <div className={`rounded-3xl border p-5 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.25em] ${softTextClass}`}>
              Total vendido hoy
            </p>
            <p className="mt-3 text-3xl font-semibold text-green-400">
              S/ {totalVentasHoy.toFixed(2)}
            </p>
          </div>
        </div>

        <div className={`rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>
              Buscar producto por serie
            </h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>
              Si hay una sola coincidencia, se selecciona sola automáticamente.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              placeholder="Buscar por código de serie..."
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Producto identificado</p>
              <p className={`mt-2 text-lg font-semibold ${titleTextClass}`}>
                {currentProduct?.name || "Ninguno"}
              </p>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                {currentProduct?.serial_code || "Sin serie seleccionada"}
              </p>
            </div>
          </div>

          {serialSearch.trim() && serialMatches.length > 1 && (
            <div className="mt-4 grid gap-3">
              {serialMatches.slice(0, 6).map((product) => (
                <button
                  key={product.id}
                  onClick={() => handlePickProduct(product.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selectedProduct === product.id
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : isDark
                        ? "border-white/10 bg-black/20 hover:border-cyan-400/25"
                        : "border-gray-200 bg-white hover:border-cyan-300"
                  }`}
                >
                  <p className={`font-semibold ${titleTextClass}`}>{product.name}</p>
                  <p className={`mt-1 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
                    Serie: {product.serial_code || "-"} · Stock: {product.stock} · Precio: S/ {product.price}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Cantidad"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <div className="relative">
              <input
                value={customerDni}
                onChange={(e) => handleDniChange(e.target.value)}
                placeholder="DNI"
                maxLength={8}
                className={`w-full rounded-2xl border p-4 pr-12 outline-none ${inputClass}`}
              />
              {dniLoading && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-cyan-300">
                  Buscando...
                </span>
              )}
            </div>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            >
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={customerDepartment}
              onChange={(e) => setCustomerDepartment(e.target.value)}
              placeholder="Departamento"
              className={`rounded-2xl border p-4 outline-none ${isDark ? "border-white/10 bg-black/20 text-white placeholder:text-white/30" : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />

            <input
              value={customerProvince}
              onChange={(e) => setCustomerProvince(e.target.value)}
              placeholder="Provincia"
              className={`rounded-2xl border p-4 outline-none ${isDark ? "border-white/10 bg-black/20 text-white placeholder:text-white/30" : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />

            <input
              value={customerDistrict}
              onChange={(e) => setCustomerDistrict(e.target.value)}
              placeholder="Distrito"
              className={`rounded-2xl border p-4 outline-none ${isDark ? "border-white/10 bg-black/20 text-white placeholder:text-white/30" : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />

            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Dirección"
              className={`rounded-2xl border p-4 outline-none ${isDark ? "border-white/10 bg-black/20 text-white placeholder:text-white/30" : "border-gray-300 bg-white text-gray-900 placeholder:text-gray-400"}`}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={paymentDetail}
              onChange={(e) => setPaymentDetail(e.target.value)}
              placeholder="Detalle de pago (ej: 20 efectivo + 30 transferencia)"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <button
              onClick={handleAddToCart}
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
            >
              Agregar producto
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className={`rounded-2xl border p-5 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Producto elegido</p>
              <p className={`mt-2 text-xl font-semibold ${titleTextClass}`}>
                {currentProduct?.name || "Ninguno"}
              </p>
            </div>

            <div className={`rounded-2xl border p-5 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Serie</p>
              <p className={`mt-2 text-lg font-semibold break-all ${titleTextClass}`}>
                {currentProduct?.serial_code || "-"}
              </p>
            </div>

            <div className={`rounded-2xl border p-5 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Vista previa</p>
              <p className="mt-2 text-2xl font-bold text-green-400">
                S/ {totalPreview.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-10 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Carrito de venta</h2>
              <p className={`mt-2 text-sm ${softTextClass}`}>
                Aquí se agrupan todos los productos del cliente en un solo comprobante.
              </p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${mediumTextClass} ${panelDarkClass}`}>
              {cart.length} producto(s)
            </div>
          </div>

          {cart.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${panelDarkClass}`}>
              <p className={`text-lg ${mediumTextClass}`}>Aún no hay productos en el carrito</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${panelDarkClass}`}
                >
                  <div>
                    <p className={`font-medium ${titleTextClass}`}>{item.name}</p>
                    <p className={`mt-1 text-sm ${softTextClass}`}>
                      Serie: {item.serial_code || "-"} · Cantidad: {item.quantity} · Precio: S/ {item.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-sm ${softTextClass}`}>Subtotal</p>
                      <p className="text-lg font-semibold text-cyan-300">
                        S/ {(Number(item.price) * Number(item.quantity)).toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveFromCart(item.product_id)}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-5">
                <p className={`text-sm ${softTextClass}`}>Total de la venta</p>
                <p className="mt-2 text-3xl font-bold text-green-300">
                  S/ {cartTotal.toFixed(2)}
                </p>
              </div>

              <button
                onClick={handleSale}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
              >
                Registrar venta completa
              </button>
            </div>
          )}
        </div>

        <div className={`mt-10 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Eliminar registros por mes</h2>
              <p className={`mt-2 text-sm ${softTextClass}`}>
                Elimina ventas antiguas por mes cuando lo necesites.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={deleteMonth}
                onChange={(e) => setDeleteMonth(e.target.value)}
                className={`rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
              >
                <option value="">Mes</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>

              <input
                value={deleteYear}
                onChange={(e) => setDeleteYear(e.target.value)}
                placeholder="Año"
                className={`rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
              />

              <button
                onClick={handleDeleteByMonth}
                className="rounded-2xl bg-red-500 px-4 py-3 font-semibold text-white transition hover:opacity-90"
              >
                Eliminar mes
              </button>
            </div>
          </div>
        </div>

        <div className={`mt-10 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5">
            <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Stock actual</h2>
            <p className={`mt-2 text-sm ${softTextClass}`}>Productos disponibles para venta inmediata.</p>
          </div>

          {availableProducts.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${panelDarkClass}`}>
              <p className={`text-lg ${mediumTextClass}`}>No hay productos con stock disponible</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableProducts.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-3xl border p-5 transition ${
                    selectedProduct === product.id
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : isDark
                        ? "border-white/10 bg-black/20 hover:border-cyan-400/30"
                        : "border-gray-200 bg-white hover:border-cyan-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-2xl font-semibold ${titleTextClass}`}>{product.name}</h3>
                      <p className={`mt-3 text-sm ${softTextClass}`}>Precio</p>
                      <p className="text-xl font-bold text-cyan-300">S/ {product.price}</p>
                      <p className={`mt-3 text-sm ${softTextClass}`}>Serie</p>
                      <p className={`text-sm font-semibold break-all ${titleTextClass}`}>{product.serial_code || "-"}</p>
                    </div>

                    <div className="min-w-[110px] rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-green-200/70">Stock</p>
                      <p className="mt-1 text-3xl font-extrabold text-green-300">{product.stock}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePickProduct(product.id)}
                    className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isDark
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    Seleccionar producto
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`mt-10 rounded-3xl border p-6 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className={`text-2xl font-semibold ${titleTextClass}`}>Historial por día</h2>
              <p className={`mt-2 text-sm ${softTextClass}`}>Registro organizado por fecha con hora exacta.</p>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${mediumTextClass} ${panelDarkClass}`}>
              {sales.length} venta(s)
            </div>
          </div>

          {groupedSales.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${panelDarkClass}`}>
              <p className={`text-lg ${mediumTextClass}`}>Aún no hay ventas registradas</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {groupedSales.map((group) => (
                <div
                  key={group.dateKey}
                  className={`rounded-3xl border p-5 ${panelDarkClass}`}
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className={`text-sm ${softTextClass}`}>Fecha</p>
                      <p className={`mt-1 text-xl font-semibold ${titleTextClass}`}>{group.label}</p>
                    </div>

                    <div>
                      <p className={`text-sm ${softTextClass}`}>Ventas</p>
                      <p className={`mt-1 text-2xl font-bold ${titleTextClass}`}>{group.count}</p>
                    </div>

                    <div>
                      <p className={`text-sm ${softTextClass}`}>Unidades</p>
                      <p className="mt-1 text-2xl font-bold text-cyan-300">{group.units}</p>
                    </div>

                    <div>
                      <p className={`text-sm ${softTextClass}`}>Total vendido</p>
                      <p className="mt-1 text-2xl font-bold text-green-400">S/ {group.total.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className={`mt-5 h-px w-full ${dividerClass}`} />

                  <div className="mt-5 grid gap-4">
                    {group.sales.map((sale) => (
                      <div
                        key={sale.id}
                        className={`rounded-2xl border p-4 ${
                          isDark
                            ? "border-white/10 bg-white/[0.03]"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="grid gap-4 md:grid-cols-5">
                          <div>
                            <p className={`text-sm ${softTextClass}`}>Hora</p>
                            <p className={`mt-1 font-medium ${titleTextClass}`}>
                              {formatHour(sale.created_at)}
                            </p>
                          </div>

                          <div>
                            <p className={`text-sm ${softTextClass}`}>Cliente</p>
                            <p className={`mt-1 font-medium ${titleTextClass}`}>
                              {sale.customer_name || "Cliente general"}
                            </p>
                          </div>

                          <div>
                            <p className={`text-sm ${softTextClass}`}>Teléfono / DNI</p>
                            <p className={`mt-1 font-medium ${titleTextClass}`}>
                              {sale.customer_phone || "-"} {sale.customer_dni ? `· ${sale.customer_dni}` : ""}
                            </p>
                          </div>

                          <div>
                            <p className={`text-sm ${softTextClass}`}>Pago</p>
                            <p className={`mt-1 font-medium capitalize ${titleTextClass}`}>
                              {sale.payment_method || "efectivo"}
                            </p>
                            <p className={`mt-1 text-xs ${isDark ? "text-white/40" : "text-gray-400"}`}>
                              {sale.payment_detail || "Sin detalle"}
                            </p>
                          </div>

                          <div>
                            <p className={`text-sm ${softTextClass}`}>Total</p>
                            <p className="mt-1 text-2xl font-bold text-green-400">
                              S/ {Number(sale.total).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {(sale.customer_department || sale.customer_province || sale.customer_district || sale.customer_address) && (
                          <>
                            <div className={`mt-4 h-px w-full ${dividerClass}`} />
                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
                                <p className={`text-sm ${softTextClass}`}>Ubicación</p>
                                <p className={`mt-1 font-medium ${titleTextClass}`}>
                                  {[sale.customer_department, sale.customer_province, sale.customer_district]
                                    .filter(Boolean)
                                    .join(" - ") || "-"}
                                </p>
                              </div>

                              <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
                                <p className={`text-sm ${softTextClass}`}>Dirección</p>
                                <p className={`mt-1 font-medium ${titleTextClass}`}>
                                  {sale.customer_address || "-"}
                                </p>
                              </div>
                            </div>
                          </>
                        )}

                        <div className={`mt-4 h-px w-full ${dividerClass}`} />

                        <div className="mt-4 grid gap-3">
                          {(sale.sale_items || []).map((item) => (
                            <div
                              key={item.id}
                              className={`flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${panelDarkClass}`}
                            >
                              <div>
                                <p className={`font-medium ${titleTextClass}`}>{item.products?.name || "Producto"}</p>
                                <p className={`mt-1 text-sm ${softTextClass}`}>
                                  Cantidad: {item.quantity} · Precio: S/ {item.price}
                                  {item.products?.serial_code ? ` · Serie: ${item.products.serial_code}` : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className={`text-sm ${softTextClass}`}>Subtotal</p>
                                  <p className="text-lg font-semibold text-cyan-300">
                                    S/ {Number(item.subtotal).toFixed(2)}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handlePrintReceipt(sale)}
                                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                                    isDark
                                      ? "bg-white/10 text-white hover:bg-white/20"
                                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                  }`}
                                >
                                  Comprobante
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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