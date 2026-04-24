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
  description?: string | null
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
  sale_code?: string | null
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

type DailyProductReport = {
  product_id: string
  name: string
  serial_code?: string | null
  quantity: number
  total: number
  salesCount: number
}

export default function SalesPage() {
  const router = useRouter()

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState("Mi Tienda")
  const [logoUrl, setLogoUrl] = useState("")
  const [role, setRole] = useState<"owner" | "seller" | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isDark, setIsDark] = useState(true)

  const [serialSearch, setSerialSearch] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [cart, setCart] = useState<CartItem[]>([])

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerDocumentType, setCustomerDocumentType] = useState<"dni" | "cee">("dni")
  const [customerDocumentNumber, setCustomerDocumentNumber] = useState("")
  const [customerDepartment, setCustomerDepartment] = useState("")
  const [customerProvince, setCustomerProvince] = useState("")
  const [customerDistrict, setCustomerDistrict] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [dniLoading, setDniLoading] = useState(false)
  const [lastDocumentQueried, setLastDocumentQueried] = useState("")

  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const [paymentDetail, setPaymentDetail] = useState("")

  const [deleteMonth, setDeleteMonth] = useState("")
  const [deleteYear, setDeleteYear] = useState(String(new Date().getFullYear()))
  const [toast, setToast] = useState("")

  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productStock, setProductStock] = useState("")
  const [productSerialCode, setProductSerialCode] = useState("")
  const [productDescription, setProductDescription] = useState("")

  const timeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC"

  const isOwner = role === "owner"
  const isSeller = role === "seller"
  const canSell = isOwner || isSeller
  const canCreateProducts = isOwner || isSeller
  const canViewHistory = isOwner || isSeller
  const canViewDailyReport = isOwner || isSeller

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

      setUserId(user.id)

      const { data, error } = await supabase
        .from("profiles")
        .select("business_id, role, active")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error(error)
        showToast("No se pudo cargar el negocio")
        return
      }

      if (data?.active === false) {
        await supabase.auth.signOut()
        showToast("Tu acceso ha sido desactivado")
        router.push("/login")
        return
      }

      setBusinessId(data?.business_id || null)
      setRole((data?.role as "owner" | "seller" | null) || null)

      if (data?.business_id) {
        await loadBusinessName(data.business_id)
        await loadProducts(data.business_id)
        await loadSales(data.business_id, (data?.role as "owner" | "seller" | null) || null, user.id)
      }
    }

    load()
  }, [router])

  const loadBusinessName = async (business_id: string) => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("name, logo_url")
        .eq("id", business_id)
        .single()

      if (!error && data) {
        setBusinessName(data.name || "Mi Tienda")
        setLogoUrl(data.logo_url || "")
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

  const loadSales = async (
    business_id: string,
    currentRole: "owner" | "seller" | null = role,
    currentUserId: string | null = userId
  ) => {
    try {
      let url = `/api/sales?business_id=${business_id}`

      if (currentRole === "seller" && currentUserId) {
        url += `&seller_id=${currentUserId}&role=seller`
      } else {
        url += `&role=owner`
      }

      const res = await fetch(url)
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

  useEffect(() => {
    setCustomerDocumentNumber("")
    setLastDocumentQueried("")
    setCustomerName("")
    setCustomerDepartment("")
    setCustomerProvince("")
    setCustomerDistrict("")
    setCustomerAddress("")
  }, [customerDocumentType])

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
    return new Intl.DateTimeFormat("es-PE", {
      timeZone,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString))
  }

  const formatHour = (dateString: string) => {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString))
  }

  const formatFullDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat("es-PE", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString))
  }

  const getDocumentLabel = (doc?: string | null) => {
    if (!doc) return "Documento"
    return /^\d{8}$/.test(doc) ? "DNI" : "Carnet de extranjería"
  }

  const buildVisualSaleCode = (sale: Sale) => {
    const date = new Date(sale.created_at)
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date).replace(/-/g, "")

    return `VTA-${parts}-${sale.id.slice(0, 4).toUpperCase()}`
  }

  const getSaleCode = (sale: Sale) => {
    return sale.sale_code || buildVisualSaleCode(sale)
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
  }, [sales])

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

  const dailyProductReport: DailyProductReport[] = useMemo(() => {
    const map = new Map<string, DailyProductReport>()
    const salesToday = sales.filter((sale) => getLocalDateKey(sale.created_at) === todayKey)

    for (const sale of salesToday) {
      for (const item of sale.sale_items || []) {
        const key = item.product_id
        const current = map.get(key)

        if (current) {
          current.quantity += Number(item.quantity || 0)
          current.total += Number(item.subtotal || 0)
          current.salesCount += 1
        } else {
          map.set(key, {
            product_id: item.product_id,
            name: item.products?.name || "Producto",
            serial_code: item.products?.serial_code || null,
            quantity: Number(item.quantity || 0),
            total: Number(item.subtotal || 0),
            salesCount: 1,
          })
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [sales, todayKey])

  const handlePickProduct = (productId: string) => {
    setSelectedProduct(productId)
  }

  const handleDocumentChange = async (value: string) => {
    const cleanValue =
      customerDocumentType === "dni"
        ? value.replace(/\D/g, "").slice(0, 8)
        : value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15)

    setCustomerDocumentNumber(cleanValue)

    const minLength = customerDocumentType === "dni" ? 8 : 6

    if (cleanValue.length < minLength) {
      setLastDocumentQueried("")
      setCustomerName("")
      setCustomerDepartment("")
      setCustomerProvince("")
      setCustomerDistrict("")
      setCustomerAddress("")
      return
    }

    if (cleanValue === lastDocumentQueried) return

    try {
      setDniLoading(true)

      const res = await fetch(`/api/dni?tipo=${customerDocumentType}&numero=${cleanValue}`)
      const data = await res.json()

      if (!res.ok || !data?.success) {
        showToast(data?.error || "No se pudo consultar el documento")
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
      setCustomerAddress(data.data?.direccion_completa || data.data?.direccion || "")
      setLastDocumentQueried(cleanValue)
    } catch (error) {
      console.error(error)
      showToast("Error al consultar el documento")
    } finally {
      setDniLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!canSell) {
      showToast("No tienes permiso para vender")
      return
    }

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
    if (!canSell) {
      showToast("No tienes permiso para vender")
      return
    }

    if (!businessId) {
      showToast("No se pudo identificar el negocio")
      return
    }

    if (!userId) {
      showToast("No se pudo identificar el vendedor")
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
          seller_id: userId,
          items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_dni: customerDocumentNumber,
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
      setCustomerDocumentType("dni")
      setCustomerDocumentNumber("")
      setCustomerDepartment("")
      setCustomerProvince("")
      setCustomerDistrict("")
      setCustomerAddress("")
      setLastDocumentQueried("")
      setPaymentMethod("efectivo")
      setPaymentDetail("")

      await loadProducts(businessId)
      await loadSales(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error de conexión")
    }
  }

  const handleCreateProduct = async () => {
    if (!canCreateProducts) {
      showToast("No tienes permiso para crear productos")
      return
    }

    if (!businessId) {
      showToast("No se pudo identificar el negocio")
      return
    }

    if (!productName || !productPrice || !productStock) {
      showToast("Completa nombre, precio y stock")
      return
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          price: Number(productPrice),
          stock: Number(productStock),
          serial_code: productSerialCode,
          description: productDescription,
          business_id: businessId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || "No se pudo crear el producto")
        return
      }

      showToast("Producto creado correctamente")
      setProductName("")
      setProductPrice("")
      setProductStock("")
      setProductSerialCode("")
      setProductDescription("")
      await loadProducts(businessId)
    } catch (error) {
      console.error(error)
      showToast("Error al crear producto")
    }
  }

  const handleDeleteByMonth = async () => {
    if (!isOwner) {
      showToast("Solo el dueño puede eliminar registros")
      return
    }

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
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight:700; color:#0f172a;">${item.products?.name || "Producto"}</div>
              ${
                item.products?.serial_code
                  ? `<div style="font-size:12px; color:#64748b; margin-top:4px;">Serie: ${item.products.serial_code}</div>`
                  : ""
              }
            </td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align:center; color:#0f172a;">${item.quantity}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align:right; color:#0f172a;">S/ ${Number(item.price).toFixed(2)}</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align:right; font-weight:800; color:#0f172a;">S/ ${Number(item.subtotal).toFixed(2)}</td>
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

    const documentLabel = getDocumentLabel(sale.customer_dni)
    const totalUnits = (sale.sale_items || []).reduce(
      (acc, item) => acc + Number(item.quantity || 0),
      0
    )
    const saleCode = getSaleCode(sale)

    const qrPayload = JSON.stringify({
      code: saleCode,
      sale_id: sale.id,
      business: businessName || "Mi Tienda",
      date: formatFullDateTime(sale.created_at),
      total: Number(sale.total).toFixed(2),
      customer: sale.customer_name || "Cliente general",
      document: sale.customer_dni || "-",
      payment_method: sale.payment_method || "efectivo",
    })

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Comprobante</title>
          <style>
            * { box-sizing: border-box; }
            @page { size: A4 portrait; margin: 10mm; }

            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #eef2ff;
              color: #111827;
              font-size: 12px;
              line-height: 1.25;
            }

            .wrap {
              width: 100%;
              max-width: 760px;
              margin: 10px auto;
              padding: 0;
            }

            .actions {
              text-align: right;
              margin-bottom: 10px;
            }

            .btn {
              background: #0f172a;
              color: white;
              border: 0;
              padding: 10px 14px;
              border-radius: 10px;
              font-weight: 700;
              cursor: pointer;
              font-size: 12px;
            }

            .page {
              background: white;
              border-radius: 22px;
              overflow: hidden;
              box-shadow: 0 18px 60px rgba(15, 23, 42, 0.14);
              page-break-inside: avoid;
            }

            .header {
              background: linear-gradient(135deg, #020617, #0f172a, #1d4ed8, #7c3aed);
              color: white;
              padding: 22px 24px 18px;
            }

            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
            }

            .store-name {
              margin: 0;
              font-size: 24px;
              font-weight: 900;
              line-height: 1.1;
            }

            .brand-sub {
              margin-top: 5px;
              font-size: 10px;
              opacity: 0.86;
              letter-spacing: 1.5px;
              text-transform: uppercase;
            }

            .ticket-badge {
              background: rgba(255,255,255,0.12);
              border: 1px solid rgba(255,255,255,0.22);
              border-radius: 14px;
              padding: 9px 12px;
              min-width: 150px;
              text-align: right;
            }

            .ticket-badge .mini {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              opacity: 0.8;
            }

            .ticket-badge .code {
              margin-top: 4px;
              font-size: 15px;
              font-weight: 800;
            }

            .meta-bottom {
              margin-top: 12px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              gap: 16px;
            }

            .qr-card {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 12px;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              background: #f8fafc;
            }

            .qr-card img {
              width: 74px;
              height: 74px;
              border-radius: 8px;
              background: white;
            }

            .qr-mini {
              font-size: 9px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              margin-bottom: 4px;
            }

            .qr-code-text {
              font-size: 11px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.2;
              word-break: break-word;
              max-width: 140px;
            }

            .content {
              padding: 16px 20px 18px;
            }

            .hero {
              display: grid;
              grid-template-columns: 1.3fr 0.7fr;
              gap: 12px;
            }

            .hero-card, .hero-total {
              border-radius: 16px;
              border: 1px solid #e5e7eb;
              background: #ffffff;
            }

            .hero-card {
              padding: 12px 14px;
            }

            .hero-total {
              padding: 12px 14px;
              background: linear-gradient(135deg, #ecfeff, #f5f3ff);
              border-color: #c7d2fe;
            }

            .hero-label {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }

            .hero-value {
              margin-top: 6px;
              font-size: 24px;
              font-weight: 900;
              color: #059669;
              line-height: 1.1;
            }

            .hero-line {
              display: flex;
              justify-content: space-between;
              gap: 8px;
              margin-top: 7px;
              font-size: 12px;
              color: #475569;
            }

            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-top: 12px;
            }

            .card {
              background: #f8fafc;
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 10px 12px;
            }

            .card-wide {
              grid-column: 1 / -1;
            }

            .label {
              font-size: 9px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.4px;
              margin-bottom: 5px;
            }

            .value {
              font-size: 13px;
              font-weight: 800;
              color: #0f172a;
              line-height: 1.25;
              word-break: break-word;
            }

            .soft {
              color: #475569;
              font-weight: 600;
            }

            .section-title {
              font-size: 14px;
              font-weight: 900;
              margin: 16px 0 8px;
              color: #0f172a;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-top: 2px;
            }

            thead th {
              text-align: left;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.2px;
              padding: 0 0 8px;
              border-bottom: 2px solid #dbeafe;
            }

            tbody td {
              vertical-align: top;
              font-size: 12px;
            }

            .summary {
              margin-top: 12px;
              display: flex;
              justify-content: flex-end;
            }

            .summary-card {
              min-width: 250px;
              background: linear-gradient(135deg, #ecfeff, #f5f3ff);
              border: 1px solid #c7d2fe;
              border-radius: 16px;
              padding: 12px 14px;
            }

            .summary-line {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 6px;
              font-size: 12px;
              color: #334155;
            }

            .summary-total {
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid #cbd5e1;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 12px;
            }

            .summary-total span:first-child {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.3px;
              color: #475569;
            }

            .summary-total span:last-child {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              line-height: 1.1;
            }

            .footer {
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #64748b;
              font-size: 10px;
              gap: 10px;
            }

            @media print {
              body {
                background: white;
                font-size: 11px;
              }

              .wrap {
                max-width: 100%;
                margin: 0;
                padding: 0;
              }

              .page {
                box-shadow: none;
                border-radius: 0;
                width: 100%;
              }

              .print-hide { display: none; }

              .hero,
              .grid,
              .summary,
              .footer,
              table,
              tr,
              td,
              th {
                page-break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="actions print-hide">
              <button class="btn" onclick="window.print()">Imprimir comprobante</button>
            </div>

            <div class="page">
              <div class="header">
                <div class="header-top">
                  <div style="display:flex; align-items:center; gap:12px;">
                    ${
                      logoUrl
                        ? `<div style="width:64px; height:64px; border-radius:16px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; padding:8px;"><img src="${logoUrl}" alt="Logo" style="max-width:100%; max-height:100%; object-fit:contain;" /></div>`
                        : ""
                    }
                    <div>
                      <h1 class="store-name">${businessName || "Mi Tienda"}</h1>
                      <div class="brand-sub">Comprobante Premium · Mahu Plexus</div>
                    </div>
                  </div>

                  <div class="ticket-badge">
                    <div class="mini">Comprobante</div>
                    <div class="code">${saleCode}</div>
                  </div>
                </div>
              </div>

              <div class="content">
                <div class="hero">
                  <div class="hero-card">
                    <div class="hero-label">Resumen rápido</div>
                    <div class="hero-line"><span>Fecha</span><strong>${formatFullDateTime(sale.created_at)}</strong></div>
                    <div class="hero-line"><span>Cliente</span><strong>${sale.customer_name || "Cliente general"}</strong></div>
                    <div class="hero-line"><span>Método</span><strong style="text-transform: capitalize;">${sale.payment_method || "efectivo"}</strong></div>
                  </div>

                  <div class="hero-total">
                    <div class="hero-label">Total de la venta</div>
                    <div class="hero-value">S/ ${Number(sale.total).toFixed(2)}</div>
                  </div>
                </div>

                <div class="grid">
                  <div class="card"><div class="label">Cliente</div><div class="value">${sale.customer_name || "Cliente general"}</div></div>
                  <div class="card"><div class="label">${documentLabel}</div><div class="value">${sale.customer_dni || "-"}</div></div>
                  <div class="card"><div class="label">Teléfono</div><div class="value">${sale.customer_phone || "-"}</div></div>
                  <div class="card"><div class="label">Ubicación</div><div class="value">${locationHtml || "-"}</div></div>
                  <div class="card card-wide"><div class="label">Dirección</div><div class="value soft">${sale.customer_address || "-"}</div></div>
                  <div class="card card-wide"><div class="label">Detalle de pago</div><div class="value soft">${sale.payment_detail || "Sin detalle adicional"}</div></div>
                </div>

                <div class="section-title">Detalle de productos</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 46%;">Producto</th>
                      <th style="width: 14%; text-align:center;">Cantidad</th>
                      <th style="width: 20%; text-align:right;">Precio</th>
                      <th style="width: 20%; text-align:right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>${itemsHtml}</tbody>
                </table>

                <div class="meta-bottom">
                  <div class="summary">
                    <div class="summary-card">
                      <div class="summary-line"><span>Productos</span><span>${(sale.sale_items || []).length}</span></div>
                      <div class="summary-line"><span>Unidades</span><span>${totalUnits}</span></div>
                      <div class="summary-total"><span>Total final</span><span>S/ ${Number(sale.total).toFixed(2)}</span></div>
                    </div>
                  </div>

                  <div class="qr-card">
                    <img src="${qrUrl}" alt="QR comprobante" />
                    <div>
                      <div class="qr-mini">Código de comprobante</div>
                      <div class="qr-code-text">${saleCode}</div>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  <div>Powered by Mahu Plexus</div>
                  <div>Gracias por su compra</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    receiptWindow.document.close()
  }

  const handlePrintDailyReport = () => {
    if (!canViewDailyReport) {
      showToast("No tienes permiso para generar el reporte del día")
      return
    }

    const reportWindow = window.open("", "_blank", "width=1100,height=1200")

    if (!reportWindow) {
      showToast("No se pudo abrir el reporte del día")
      return
    }

    const rowsHtml =
      dailyProductReport.length === 0
        ? `
          <tr>
            <td colspan="4" style="padding: 18px; text-align: center; color: #64748b;">
              No hay productos vendidos hoy
            </td>
          </tr>
        `
        : dailyProductReport
            .map(
              (item) => `
                <tr>
                  <td style="padding: 14px 10px; border-bottom: 1px solid #e5e7eb; color: #0f172a; font-weight: 700;">
                    ${item.name}
                    <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-top: 4px;">
                      Serie: ${item.serial_code || "-"}
                    </div>
                  </td>
                  <td style="padding: 14px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #0f172a;">
                    ${item.quantity}
                  </td>
                  <td style="padding: 14px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #0f172a;">
                    ${item.salesCount}
                  </td>
                  <td style="padding: 14px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: 800;">
                    S/ ${item.total.toFixed(2)}
                  </td>
                </tr>
              `
            )
            .join("")

    reportWindow.document.write(`
      <html>
        <head>
          <title>Reporte del día</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; background: #eef2ff; color: #111827; }
            .wrap { max-width: 1080px; margin: 18px auto; padding: 0 14px; }
            .actions { text-align: right; margin-bottom: 14px; }
            .btn { background: #0f172a; color: white; border: 0; padding: 12px 18px; border-radius: 12px; font-weight: 700; cursor: pointer; }
            .page { background: white; border-radius: 30px; overflow: hidden; box-shadow: 0 28px 90px rgba(15, 23, 42, 0.16); }
            .header { background: linear-gradient(135deg, #020617, #0f172a, #1d4ed8, #7c3aed); color: white; padding: 34px 38px 30px; }
            .title { margin: 0; font-size: 32px; font-weight: 900; }
            .sub { margin-top: 8px; font-size: 13px; opacity: 0.86; letter-spacing: 1.2px; text-transform: uppercase; }
            .content { padding: 24px 34px 34px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 22px; }
            .card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 20px; padding: 16px 18px; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.6px; }
            .value { margin-top: 8px; font-size: 28px; font-weight: 900; color: #0f172a; }
            .green { color: #059669; }
            .blue { color: #0891b2; }
            .sectionTitle { margin: 24px 0 14px; font-size: 18px; font-weight: 900; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; }
            thead th { text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; padding: 12px 10px; border-bottom: 2px solid #dbeafe; }
            .footer { margin-top: 22px; padding-top: 18px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 12px; }
            @media print {
              body { background: white; }
              .wrap { max-width: 100%; margin: 0; padding: 0; }
              .page { box-shadow: none; border-radius: 0; }
              .print-hide { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="actions print-hide">
              <button class="btn" onclick="window.print()">Guardar como PDF / Imprimir</button>
            </div>

            <div class="page">
              <div class="header">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:18px;">
                  <div style="display:flex; align-items:center; gap:14px;">
                    ${
                      logoUrl
                        ? `<div style="width:68px; height:68px; border-radius:18px; background:rgba(255,255,255,0.14); border:1px solid rgba(255,255,255,0.20); display:flex; align-items:center; justify-content:center; padding:8px;"><img src="${logoUrl}" alt="Logo" style="max-width:100%; max-height:100%; object-fit:contain;" /></div>`
                        : ""
                    }
                    <div>
                      <h1 class="title">${businessName || "Mi Tienda"}</h1>
                      <div class="sub">Reporte completo del día · ${formatGroupLabel(new Date().toISOString())} · Mahu Plexus</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="content">
                <div class="stats">
                  <div class="card">
                    <div class="label">Ventas de hoy</div>
                    <div class="value">${cantidadVentasHoy}</div>
                  </div>
                  <div class="card">
                    <div class="label">Unidades vendidas</div>
                    <div class="value blue">${totalUnidadesHoy}</div>
                  </div>
                  <div class="card">
                    <div class="label">Total vendido</div>
                    <div class="value green">S/ ${totalVentasHoy.toFixed(2)}</div>
                  </div>
                </div>

                <div class="sectionTitle">Detalle de productos vendidos hoy</div>

                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th style="text-align:center;">Unidades</th>
                      <th style="text-align:center;">Ventas</th>
                      <th style="text-align:right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>

                <div class="footer">
                  <div>Powered by Mahu Plexus</div>
                  <div>Reporte generado el ${formatFullDateTime(new Date().toISOString())}</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)

    reportWindow.document.close()
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-4 sm:px-6">
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>{isDark ? "☀️" : "🌙"}</span>
            <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut()
              router.push("/login")
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isDark
                ? "border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                : "border-red-300 bg-white text-red-600 hover:bg-red-50"
            }`}
          >
            Salir
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-3xl font-semibold md:text-4xl ${titleTextClass}`}>
              Registro de ventas
            </h1>
            <p className={`mt-1 text-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
              {isOwner
                ? "Modo dueño: control total del negocio."
                : "Modo vendedor: vender, crear productos, ver historial y generar PDF del día."}
            </p>
          </div>

          {isOwner && (
            <a
              href="/dashboard"
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                isDark
                  ? "border-white/10 bg-white/10 text-white hover:bg-white/20"
                  : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              Volver al panel
            </a>
          )}
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${softTextClass}`}>
              Ventas de hoy
            </p>
            <p className={`mt-2 text-3xl font-semibold ${titleTextClass}`}>
              {cantidadVentasHoy}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${softTextClass}`}>
              Unidades vendidas
            </p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">
              {totalUnidadesHoy}
            </p>
          </div>

          <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <p className={`text-xs uppercase tracking-[0.22em] ${softTextClass}`}>
              Total vendido hoy
            </p>
            <p className="mt-2 text-3xl font-semibold text-green-400">
              S/ {totalVentasHoy.toFixed(2)}
            </p>
          </div>
        </div>

        <div className={`rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-4">
            <h2 className={`text-xl font-semibold ${titleTextClass}`}>
              Buscar producto por serie
            </h2>
            <p className={`mt-1 text-sm ${softTextClass}`}>
              Si hay una sola coincidencia, se selecciona automáticamente.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={serialSearch}
              onChange={(e) => setSerialSearch(e.target.value)}
              placeholder="Buscar por código de serie..."
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Producto identificado</p>
              <p className={`mt-1 text-lg font-semibold ${titleTextClass}`}>
                {currentProduct?.name || "Ninguno"}
              </p>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                {currentProduct?.serial_code || "Sin serie seleccionada"}
              </p>
            </div>
          </div>

          {serialSearch.trim() && serialMatches.length > 1 && (
            <div className="mt-3 grid gap-3">
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
                  <p className={`mt-1 text-sm ${softTextClass}`}>
                    Serie: {product.serial_code || "-"} · Stock: {product.stock} · Precio: S/ {product.price}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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

            <select
              value={customerDocumentType}
              onChange={(e) => setCustomerDocumentType(e.target.value as "dni" | "cee")}
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            >
              <option value="dni">DNI</option>
              <option value="cee">Carnet de extranjería</option>
            </select>

            <div className="relative">
              <input
                value={customerDocumentNumber}
                onChange={(e) => handleDocumentChange(e.target.value)}
                placeholder={customerDocumentType === "dni" ? "DNI" : "Carnet de extranjería"}
                maxLength={customerDocumentType === "dni" ? 8 : 15}
                className={`w-full rounded-2xl border p-4 pr-20 outline-none ${inputClass}`}
              />
              {dniLoading && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-cyan-300">
                  Buscando...
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={customerDepartment}
              onChange={(e) => setCustomerDepartment(e.target.value)}
              placeholder="Departamento"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <input
              value={customerProvince}
              onChange={(e) => setCustomerProvince(e.target.value)}
              placeholder="Provincia"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <input
              value={customerDistrict}
              onChange={(e) => setCustomerDistrict(e.target.value)}
              placeholder="Distrito"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />

            <input
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Dirección"
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            />
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={`rounded-2xl border p-4 outline-none ${inputClass}`}
            >
              <option value="efectivo">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
              <option value="transferencia">Transferencia</option>
              <option value="mixto">Mixto</option>
            </select>

            <input
              value={paymentDetail}
              onChange={(e) => setPaymentDetail(e.target.value)}
              placeholder="Detalle de pago"
              className={`rounded-2xl border p-4 outline-none md:col-span-2 ${inputClass}`}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Producto elegido</p>
              <p className={`mt-1 text-lg font-semibold ${titleTextClass}`}>
                {currentProduct?.name || "Ninguno"}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Serie</p>
              <p className={`mt-1 text-sm font-semibold break-all ${titleTextClass}`}>
                {currentProduct?.serial_code || "-"}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
              <p className={`text-sm ${softTextClass}`}>Vista previa</p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                S/ {totalPreview.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
          >
            Agregar producto
          </button>
        </div>

        <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>Carrito de venta</h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Todos los productos del cliente en un solo comprobante.
              </p>
            </div>

            <div className={`rounded-2xl border px-4 py-2 text-sm ${mediumTextClass} ${panelDarkClass}`}>
              {cart.length} producto(s)
            </div>
          </div>

          {cart.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-8 text-center ${panelDarkClass}`}>
              <p className={`text-lg ${mediumTextClass}`}>Aún no hay productos en el carrito</p>
            </div>
          ) : (
            <div className="grid gap-3">
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

              <div className="rounded-2xl border border-green-400/20 bg-green-400/10 p-4">
                <p className={`text-sm ${softTextClass}`}>Total de la venta</p>
                <p className="mt-1 text-3xl font-bold text-green-300">
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

        {canCreateProducts && (
          <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4">
              <h2 className={`text-xl font-semibold ${titleTextClass}`}>
                Crear producto nuevo
              </h2>
              <p className={`mt-1 text-sm ${softTextClass}`}>
                Owner y vendedor pueden crear productos nuevos. No se edita ni elimina inventario aquí.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Producto"
                className={`rounded-2xl border p-4 outline-none ${inputClass}`}
              />
              <input
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="Precio"
                className={`rounded-2xl border p-4 outline-none ${inputClass}`}
              />
              <input
                value={productStock}
                onChange={(e) => setProductStock(e.target.value)}
                placeholder="Stock"
                className={`rounded-2xl border p-4 outline-none ${inputClass}`}
              />
              <input
                value={productSerialCode}
                onChange={(e) => setProductSerialCode(e.target.value)}
                placeholder="Código / serie"
                className={`rounded-2xl border p-4 outline-none ${inputClass}`}
              />
              <input
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Descripción"
                className={`rounded-2xl border p-4 outline-none ${inputClass}`}
              />
            </div>

            <button
              onClick={handleCreateProduct}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-4 font-semibold text-black transition hover:scale-[1.01]"
            >
              Crear producto
            </button>
          </div>
        )}

        <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
          <div className="mb-4">
            <h2 className={`text-xl font-semibold ${titleTextClass}`}>Stock actual</h2>
            <p className={`mt-1 text-sm ${softTextClass}`}>Productos disponibles para venta inmediata.</p>
          </div>

          {availableProducts.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-8 text-center ${panelDarkClass}`}>
              <p className={`text-lg ${mediumTextClass}`}>No hay productos con stock disponible</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {availableProducts.map((product) => (
                <div
                  key={product.id}
                  className={`rounded-3xl border p-4 transition ${
                    selectedProduct === product.id
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : isDark
                        ? "border-white/10 bg-black/20 hover:border-cyan-400/30"
                        : "border-gray-200 bg-white hover:border-cyan-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`text-xl font-semibold ${titleTextClass}`}>{product.name}</h3>
                      <p className={`mt-2 text-sm ${softTextClass}`}>Precio</p>
                      <p className="text-lg font-bold text-cyan-300">S/ {product.price}</p>
                      <p className={`mt-2 text-sm ${softTextClass}`}>Serie</p>
                      <p className={`text-sm font-semibold break-all ${titleTextClass}`}>{product.serial_code || "-"}</p>
                    </div>

                    <div className="min-w-[92px] rounded-2xl border border-green-400/20 bg-green-400/10 px-3 py-3 text-center">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-green-200/70">Stock</p>
                      <p className="mt-1 text-3xl font-extrabold text-green-300">{product.stock}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePickProduct(product.id)}
                    className={`mt-4 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
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

        {isOwner && (
          <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>Eliminar registros por mes</h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  Solo el dueño puede eliminar ventas antiguas.
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
        )}

        {canViewHistory && (
          <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>Historial por día</h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  {isOwner
                    ? "Registro completo organizado por fecha y hora."
                    : "Historial visible con comprobante por venta."}
                </p>
              </div>

              <div className={`rounded-2xl border px-4 py-2 text-sm ${mediumTextClass} ${panelDarkClass}`}>
                {sales.length} venta(s)
              </div>
            </div>

            {groupedSales.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-8 text-center ${panelDarkClass}`}>
                <p className={`text-lg ${mediumTextClass}`}>Aún no hay ventas registradas</p>
              </div>
            ) : (
              <div className="grid gap-5">
                {groupedSales.map((group) => (
                  <div key={group.dateKey} className={`rounded-3xl border p-4 ${panelDarkClass}`}>
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <p className={`text-sm ${softTextClass}`}>Fecha</p>
                        <p className={`mt-1 text-lg font-semibold ${titleTextClass}`}>{group.label}</p>
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

                    <div className={`mt-4 h-px w-full ${dividerClass}`} />

                    <div className="mt-4 grid gap-3">
                      {group.sales.map((sale) => (
                        <div
                          key={sale.id}
                          className={`rounded-2xl border p-4 ${
                            isDark
                              ? "border-white/10 bg-white/[0.03]"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          {isSeller ? (
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="grid gap-3 sm:grid-cols-3 md:flex-1">
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
                                  <p className={`text-sm ${softTextClass}`}>Total</p>
                                  <p className="mt-1 text-xl font-bold text-green-400">
                                    S/ {Number(sale.total).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-end">
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
                          ) : (
                            <>
                              <div className="grid gap-3 md:grid-cols-5">
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
                                  <p className={`text-sm ${softTextClass}`}>
                                    Teléfono / {getDocumentLabel(sale.customer_dni)}
                                  </p>
                                  <p className={`mt-1 font-medium ${titleTextClass}`}>
                                    {sale.customer_phone || "-"} {sale.customer_dni ? `· ${sale.customer_dni}` : ""}
                                  </p>
                                </div>

                                <div>
                                  <p className={`text-sm ${softTextClass}`}>Pago</p>
                                  <p className={`mt-1 font-medium capitalize ${titleTextClass}`}>
                                    {sale.payment_method || "efectivo"}
                                  </p>
                                  <p className={`mt-1 text-xs ${softTextClass}`}>
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
                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
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

                                    <div className="text-right">
                                      <p className={`text-sm ${softTextClass}`}>Subtotal</p>
                                      <p className="text-lg font-semibold text-cyan-300">
                                        S/ {Number(item.subtotal).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                <div className="flex justify-end">
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
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {canViewDailyReport && (
          <div className={`mt-5 rounded-3xl border p-4 backdrop-blur-xl ${surfaceClass}`}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className={`text-xl font-semibold ${titleTextClass}`}>
                  Reporte completo del día
                </h2>
                <p className={`mt-1 text-sm ${softTextClass}`}>
                  Resumen rápido con PDF de todas las ventas del día.
                </p>
              </div>

              <button
                onClick={handlePrintDailyReport}
                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.01]"
              >
                Generar PDF del día
              </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Ventas</p>
                <p className={`mt-1 text-2xl font-bold ${titleTextClass}`}>{cantidadVentasHoy}</p>
              </div>

              <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Unidades</p>
                <p className="mt-1 text-2xl font-bold text-cyan-300">{totalUnidadesHoy}</p>
              </div>

              <div className={`rounded-2xl border p-4 ${panelDarkClass}`}>
                <p className={`text-xs uppercase tracking-[0.2em] ${softTextClass}`}>Total</p>
                <p className="mt-1 text-2xl font-bold text-green-400">
                  S/ {totalVentasHoy.toFixed(2)}
                </p>
              </div>
            </div>

            {dailyProductReport.length === 0 ? (
              <div className={`rounded-2xl border border-dashed p-6 text-center ${panelDarkClass}`}>
                <p className={`text-base ${mediumTextClass}`}>Hoy todavía no hay productos vendidos</p>
              </div>
            ) : (
              <div className={`overflow-hidden rounded-2xl border ${panelDarkClass}`}>
                <div className={`grid grid-cols-[minmax(0,2fr)_90px_90px_120px] gap-3 border-b px-4 py-3 text-xs uppercase tracking-[0.2em] ${softTextClass} ${isDark ? "border-white/10" : "border-gray-200"}`}>
                  <p>Producto</p>
                  <p className="text-center">Unid.</p>
                  <p className="text-center">Ventas</p>
                  <p className="text-right">Total</p>
                </div>

                <div className="divide-y divide-white/10">
                  {dailyProductReport.map((item) => (
                    <div
                      key={item.product_id}
                      className={`grid grid-cols-[minmax(0,2fr)_90px_90px_120px] gap-3 px-4 py-3 ${isDark ? "divide-white/10" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${titleTextClass}`}>{item.name}</p>
                        <p className={`mt-1 truncate text-sm ${softTextClass}`}>
                          Serie: {item.serial_code || "-"}
                        </p>
                      </div>

                      <div className={`flex items-center justify-center font-semibold ${titleTextClass}`}>
                        {item.quantity}
                      </div>

                      <div className="flex items-center justify-center font-semibold text-cyan-300">
                        {item.salesCount}
                      </div>

                      <div className="flex items-center justify-end font-semibold text-green-400">
                        S/ {item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-10 text-center">
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
