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
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  const [serialSearch, setSerialSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerDni, setCustomerDni] = useState("")
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
    const receiptWindow = window.open("", "_blank", "width=900,height=1000")

    if (!receiptWindow) {
      showToast("No se pudo abrir el comprobante")
      return
    }

    const itemsHtml = (sale.sale_items || [])
      .map(
        (item) => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
              ${item.products?.name || "Producto"}
              ${
                item.products?.serial_code
                  ? `<div style="font-size:12px; color:#6b7280; margin-top:4px;">Serie: ${item.products.serial_code}</div>`
                  : ""
              }
            </td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align:center;">${item.quantity}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align:right;">S/ ${Number(item.price).toFixed(2)}</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align:right; font-weight:700;">S/ ${Number(item.subtotal).toFixed(2)}</td>
          </tr>
        `
      )
      .join("")

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Comprobante</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #eef2ff;
              color: #111827;
            }
            .page {
              max-width: 850px;
              margin: 30px auto;
              background: white;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 25px 80px rgba(0,0,0,0.18);
            }
            .header {
              background: linear-gradient(135deg, #0f172a, #1d4ed8, #7c3aed);
              color: white;
              padding: 38px 42px;
            }
            .brand {
              font-size: 30px;
              font-weight: 800;
              letter-spacing: 1px;
              margin: 0;
            }
            .subtitle {
              margin-top: 8px;
              opacity: 0.82;
              font-size: 13px;
              letter-spacing: 2px;
              text-transform: uppercase;
            }
            .content {
              padding: 34px 42px 42px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 18px;
              margin-bottom: 28px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 18px;
              padding: 18px 20px;
            }
            .label {
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1.6px;
              margin-bottom: 8px;
            }
            .value {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
            }
            .value.total {
              color: #059669;
              font-size: 26px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            thead th {
              text-align: left;
              font-size: 12px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 1.4px;
              padding-bottom: 10px;
              border-bottom: 2px solid #dbeafe;
            }
            .section-title {
              font-size: 16px;
              font-weight: 800;
              margin: 32px 0 14px;
              color: #0f172a;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #6b7280;
              font-size: 12px;
            }
            .badge {
              display: inline-block;
              background: #dbeafe;
              color: #1d4ed8;
              padding: 7px 12px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 700;
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
            .actions {
              text-align: right;
              margin: 20px auto 0;
              max-width: 850px;
            }
            .btn {
              background: #111827;
              color: white;
              border: 0;
              padding: 12px 18px;
              border-radius: 12px;
              font-weight: 700;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="actions print-hide">
            <button class="btn" onclick="window.print()">Imprimir comprobante</button>
          </div>

          <div class="page">
            <div class="header">
              <h1 class="brand">Comprobante de venta</h1>
              <div class="subtitle">Powered by Mahu Plexus</div>
            </div>

            <div class="content">
              <div class="grid">
                <div class="card">
                  <div class="label">Fecha y hora</div>
                  <div class="value">${formatFullDateTime(sale.created_at)}</div>
                </div>

                <div class="card">
                  <div class="label">Total</div>
                  <div class="value total">S/ ${Number(sale.total).toFixed(2)}</div>
                </div>

                <div class="card">
                  <div class="label">Cliente</div>
                  <div class="value">${sale.customer_name || "Cliente general"}</div>
                </div>

                <div class="card">
                  <div class="label">Método de pago</div>
                  <div class="value" style="text-transform: capitalize;">${sale.payment_method || "efectivo"}</div>
                </div>

                <div class="card">
                  <div class="label">Teléfono</div>
                  <div class="value">${sale.customer_phone || "-"}</div>
                </div>

                <div class="card">
                  <div class="label">DNI</div>
                  <div class="value">${sale.customer_dni || "-"}</div>
                </div>
              </div>

              <div class="card">
                <div class="label">Detalle de pago</div>
                <div class="value">${sale.payment_detail || "Sin detalle adicional"}</div>
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

              <div class="footer">
                <div>Powered by Mahu Plexus</div>
                <div><span class="badge">Venta #${sale.id.slice(0, 8).toUpperCase()}</span></div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    receiptWindow.document.close()
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -left-20 top-10 h-60 w-60 bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 bg-purple-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Registro de ventas
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Busca por serie, agrega varios productos y genera un solo comprobante.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-xl transition hover:bg-white/20"
          >
            Volver al panel
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Ventas de hoy
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {cantidadVentasHoy}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Unidades vendidas
            </p>
            <p className="mt-3 text-3xl font-semibold text-cyan-300">
              {totalUnidadesHoy}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-white/45">
              Total vendido hoy
            </p>
            <p className="mt-3 text-3xl font-semibold text-green-400">
              S/ {totalVentasHoy.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              Buscar producto por serie
            </h2>
            <p className="mt-2 text-sm text-white/45">
              Si hay una sola coincidencia, se selecciona sola automáticamente.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              placeholder="Buscar por código de serie..."
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/45">Producto identificado</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {currentProduct?.name || "Ninguno"}
              </p>
              <p className="mt-1 text-sm text-white/45">
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
                      : "border-white/10 bg-black/20 hover:border-cyan-400/25"
                  }`}
                >
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="mt-1 text-sm text-white/50">
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
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nombre del cliente"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Teléfono"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <input
              value={customerDni}
              onChange={(e) => setCustomerDni(e.target.value)}
              placeholder="DNI"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none"
            >
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              value={paymentDetail}
              onChange={(e) => setPaymentDetail(e.target.value)}
              placeholder="Detalle de pago (ej: 20 efectivo + 30 transferencia)"
              className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white outline-none placeholder:text-white/30"
            />

            <button
              onClick={handleAddToCart}
              className="rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
            >
              Agregar producto
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/45">Producto elegido</p>
              <p className="mt-2 text-xl font-semibold text-white">
                {currentProduct?.name || "Ninguno"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/45">Serie</p>
              <p className="mt-2 text-lg font-semibold text-white break-all">
                {currentProduct?.serial_code || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-white/45">Vista previa</p>
              <p className="mt-2 text-2xl font-bold text-green-400">
                S/ {totalPreview.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Carrito de venta</h2>
              <p className="mt-2 text-sm text-white/45">
                Aquí se agrupan todos los productos del cliente en un solo comprobante.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
              {cart.length} producto(s)
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <p className="text-lg text-white/60">Aún no hay productos en el carrito</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-white/45">
                      Serie: {item.serial_code || "-"} · Cantidad: {item.quantity} · Precio: S/ {item.price}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-white/45">Subtotal</p>
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
                <p className="text-sm text-white/45">Total de la venta</p>
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

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Eliminar registros por mes</h2>
              <p className="mt-2 text-sm text-white/45">
                Elimina ventas antiguas por mes cuando lo necesites.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={deleteMonth}
                onChange={(e) => setDeleteMonth(e.target.value)}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none"
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
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/30"
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

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">Stock actual</h2>
            <p className="mt-2 text-sm text-white/45">Productos disponibles para venta inmediata.</p>
          </div>

          {availableProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <p className="text-lg text-white/60">No hay productos con stock disponible</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableProducts.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-3xl border p-5 transition ${
                    selectedProduct === product.id
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : "border-white/10 bg-black/20 hover:border-cyan-400/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{product.name}</h3>
                      <p className="mt-3 text-sm text-white/45">Precio</p>
                      <p className="text-xl font-bold text-cyan-300">S/ {product.price}</p>
                      <p className="mt-3 text-sm text-white/45">Serie</p>
                      <p className="text-sm font-semibold text-white break-all">{product.serial_code || "-"}</p>
                    </div>

                    <div className="min-w-[110px] rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-green-200/70">Stock</p>
                      <p className="mt-1 text-3xl font-extrabold text-green-300">{product.stock}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePickProduct(product.id)}
                    className="mt-5 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Seleccionar producto
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">Historial por día</h2>
              <p className="mt-2 text-sm text-white/45">Registro organizado por fecha con hora exacta.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/60">
              {sales.length} venta(s)
            </div>
          </div>

          {groupedSales.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
              <p className="text-lg text-white/60">Aún no hay ventas registradas</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {groupedSales.map((group) => (
                <div
                  key={group.dateKey}
                  className="rounded-3xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-white/45">Fecha</p>
                      <p className="mt-1 text-xl font-semibold text-white">{group.label}</p>
                    </div>

                    <div>
                      <p className="text-sm text-white/45">Ventas</p>
                      <p className="mt-1 text-2xl font-bold text-white">{group.count}</p>
                    </div>

                    <div>
                      <p className="text-sm text-white/45">Unidades</p>
                      <p className="mt-1 text-2xl font-bold text-cyan-300">{group.units}</p>
                    </div>

                    <div>
                      <p className="text-sm text-white/45">Total vendido</p>
                      <p className="mt-1 text-2xl font-bold text-green-400">S/ {group.total.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-5 h-px w-full bg-white/10" />

                  <div className="mt-5 grid gap-4">
                    {group.sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="grid gap-4 md:grid-cols-5">
                          <div>
                            <p className="text-sm text-white/45">Hora</p>
                            <p className="mt-1 font-medium text-white">
                              {formatHour(sale.created_at)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-white/45">Cliente</p>
                            <p className="mt-1 font-medium text-white">
                              {sale.customer_name || "Cliente general"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-white/45">Teléfono / DNI</p>
                            <p className="mt-1 font-medium text-white">
                              {sale.customer_phone || "-"} {sale.customer_dni ? `· ${sale.customer_dni}` : ""}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-white/45">Pago</p>
                            <p className="mt-1 font-medium capitalize text-white">
                              {sale.payment_method || "efectivo"}
                            </p>
                            <p className="mt-1 text-xs text-white/40">
                              {sale.payment_detail || "Sin detalle"}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-white/45">Total</p>
                            <p className="mt-1 text-2xl font-bold text-green-400">
                              S/ {Number(sale.total).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 h-px w-full bg-white/10" />

                        <div className="mt-4 grid gap-3">
                          {(sale.sale_items || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div>
                                <p className="font-medium text-white">{item.products?.name || "Producto"}</p>
                                <p className="mt-1 text-sm text-white/45">
                                  Cantidad: {item.quantity} · Precio: S/ {item.price}
                                  {item.products?.serial_code ? ` · Serie: ${item.products.serial_code}` : ""}
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-sm text-white/45">Subtotal</p>
                                  <p className="text-lg font-semibold text-cyan-300">
                                    S/ {Number(item.subtotal).toFixed(2)}
                                  </p>
                                </div>

                                <button
                                  onClick={() => handlePrintReceipt(sale)}
                                  className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
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