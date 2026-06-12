"use client"

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { EmptyState } from "../components/EmptyState"
import { ExpiredWall } from "../components/ExpiredWall"
import { toast } from "../components/Toast"
import { getSubscriptionInfo, activateTrialIfNew, type SubscriptionInfo } from "../lib/subscription"

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
  products?: { id: string; name: string; serial_code?: string | null } | null
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
  seller_id?: string | null
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
  const [loading, setLoading] = useState(true)
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null)

  const [productSearch, setProductSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [expandedSale, setExpandedSale] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"sell" | "history" | "report">("sell")

  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerDocumentType, setCustomerDocumentType] = useState<"dni" | "cee" | "ruc">("dni")
  const [customerDocumentNumber, setCustomerDocumentNumber] = useState("")
  const [customerDepartment, setCustomerDepartment] = useState("")
  const [customerProvince, setCustomerProvince] = useState("")
  const [customerDistrict, setCustomerDistrict] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")
  const [dniLoading, setDniLoading] = useState(false)
  const [customerRazonSocial, setCustomerRazonSocial] = useState("")
  const [lastDocumentQueried, setLastDocumentQueried] = useState("")

  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const [paymentDetail, setPaymentDetail] = useState("")

  const [deleteMonth, setDeleteMonth] = useState("")
  const [deleteYear, setDeleteYear] = useState(String(new Date().getFullYear()))
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [productName, setProductName] = useState("")
  const [productPrice, setProductPrice] = useState("")
  const [productStock, setProductStock] = useState("")
  const [productSerialCode, setProductSerialCode] = useState("")
  const [productDescription, setProductDescription] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const [saleLoading, setSaleLoading] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const timeZone = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"

  const isOwner = role === "owner"
  const canSell = isOwner || role === "seller"

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    setIsMounted(true)
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        setUserId(user.id)

        const { data, error } = await supabase.from("profiles").select("business_id, role, active").eq("id", user.id).single()
        if (error) { showToast("Error al cargar perfil", false); return }
        if (data?.active === false) { await supabase.auth.signOut(); router.push("/login"); return }

        setBusinessId(data?.business_id || null)
        setRole(data?.role as "owner" | "seller")

        if (data?.business_id) {
          const bId = data.business_id
          // Subscription chain stays ordered (trial activation must precede getSubscriptionInfo).
          const subChain = (async () => {
            await activateTrialIfNew(bId)
            const info = await getSubscriptionInfo(bId)
            setSubInfo(info)
          })()
          // Business name + products + sales + subscription all in parallel.
          loadBusinessName(bId)
          await Promise.all([
            loadProducts(bId),
            loadSales(bId, data?.role as "owner" | "seller", user.id),
            subChain,
          ])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadBusinessName = async (bId: string) => {
    const { data } = await supabase.from("businesses").select("name, logo_url").eq("id", bId).single()
    if (data) { setBusinessName(data.name || "Mi Tienda"); setLogoUrl(data.logo_url || "") }
  }

  const loadProducts = async (bId: string) => {
    const res = await fetch(`/api/products?business_id=${bId}`)
    const data = await res.json()
    if (res.ok) setProducts(data.data || [])
  }

  const loadSales = async (bId: string, r: "owner" | "seller" | null = role, uid: string | null = userId) => {
    let url = `/api/sales?business_id=${bId}`
    if (r === "seller" && uid) url += `&seller_id=${uid}&role=seller`
    else url += `&role=owner`
    const res = await fetch(url)
    const data = await res.json()
    if (res.ok) setSales(data.data || [])
  }

  // Products search & quick-add
  const availableProducts = useMemo(() => products.filter(p => Number(p.stock) > 0), [products])

  const recentProductIds = useMemo(() => {
    const seen = new Set<string>()
    const recent: string[] = []
    for (const s of sales) {
      for (const item of s.sale_items || []) {
        if (!seen.has(item.product_id) && recent.length < 6) {
          seen.add(item.product_id)
          recent.push(item.product_id)
        }
      }
    }
    return recent
  }, [sales])

  const topProductIds = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sales) {
      for (const item of s.sale_items || []) {
        map.set(item.product_id, (map.get(item.product_id) || 0) + Number(item.quantity || 0))
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0])
  }, [sales])

  const searchResults = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return []
    return availableProducts.filter(p =>
      p.name.toLowerCase().includes(q) || (p.serial_code || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q)
    ).slice(0, 8)
  }, [productSearch, availableProducts])

  const quickAddProduct = (product: Product, qty = 1) => {
    const existing = cart.find(i => i.product_id === product.id)
    const alreadyInCart = existing ? existing.quantity : 0
    if (alreadyInCart + qty > Number(product.stock)) {
      showToast(`Stock insuficiente para ${product.name}`, false)
      return
    }
    if (existing) {
      setCart(prev => prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i))
    } else {
      setCart(prev => [...prev, { product_id: product.id, name: product.name, price: Number(product.price), quantity: qty, stock: Number(product.stock), serial_code: product.serial_code || null }])
    }
    setProductSearch("")
    showToast(`+ ${product.name}`)
    searchRef.current?.focus()
  }

  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)

  const handleDocumentChange = async (value: string) => {
    let clean = value
    if (customerDocumentType === "dni") clean = value.replace(/\D/g, "").slice(0, 8)
    else if (customerDocumentType === "ruc") clean = value.replace(/\D/g, "").slice(0, 11)
    else clean = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 15)

    setCustomerDocumentNumber(clean)
    const minLen = customerDocumentType === "dni" ? 8 : customerDocumentType === "ruc" ? 11 : 6
    if (clean.length < minLen) { setLastDocumentQueried(""); return }
    if (clean === lastDocumentQueried) return

    try {
      setDniLoading(true)

      if (customerDocumentType === "ruc") {
        const res = await fetch(`/api/ruc?numero=${clean}`)
        const data = await res.json()
        if (!res.ok || !data?.success) { showToast(data?.error || "RUC no encontrado", false); return }
        const d = data.data
        setCustomerName(d.razon_social || d.nombre_comercial || "")
        setCustomerRazonSocial(d.razon_social || "")
        setCustomerDepartment(d.departamento || "")
        setCustomerProvince(d.provincia || "")
        setCustomerDistrict(d.distrito || "")
        setCustomerAddress(d.direccion || "")
        setCustomerPhone(d.telefono || customerPhone)
        setLastDocumentQueried(clean)
      } else {
        const res = await fetch(`/api/dni?tipo=${customerDocumentType}&numero=${clean}`)
        const data = await res.json()
        if (!res.ok || !data?.success) { showToast(data?.error || "No se pudo consultar el documento", false); return }
        const full = data.data?.nombre_completo || `${data.data?.nombres||""} ${data.data?.apellido_paterno||""} ${data.data?.apellido_materno||""}`.trim()
        setCustomerName(full)
        setCustomerRazonSocial("")
        setCustomerDepartment(data.data?.departamento || "")
        setCustomerProvince(data.data?.provincia || "")
        setCustomerDistrict(data.data?.distrito || "")
        setCustomerAddress(data.data?.direccion_completa || data.data?.direccion || "")
        setLastDocumentQueried(clean)
      }
    } catch { showToast("Error al consultar documento", false) }
    finally { setDniLoading(false) }
  }

  const handleSale = async () => {
    if (!cart.length) { showToast("Agrega al menos un producto", false); return }
    if (!businessId || !userId) { showToast("Error de sesión", false); return }
    try {
      setSaleLoading(true)
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          seller_id: userId,
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
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
      if (!res.ok) { showToast(data.error || "Error al registrar venta", false); return }
      showToast("Venta registrada ✓")
      setCart([]); setCustomerName(""); setCustomerPhone(""); setCustomerDocumentNumber(""); setCustomerDepartment(""); setCustomerProvince(""); setCustomerDistrict(""); setCustomerAddress(""); setLastDocumentQueried(""); setPaymentMethod("efectivo"); setPaymentDetail(""); setProductSearch("")
      if (businessId) { await loadProducts(businessId); await loadSales(businessId) }
    } catch { showToast("Error de conexión", false) }
    finally { setSaleLoading(false) }
  }

  const handleCreateProduct = async () => {
    if (!productName || !productPrice || !productStock || !businessId) { showToast("Completa nombre, precio y stock", false); return }
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: productName, price: Number(productPrice), stock: Number(productStock), serial_code: productSerialCode, description: productDescription, business_id: businessId, user_id: userId }),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error || "Error al crear producto", false); return }
    showToast("Producto creado ✓")
    setProductName(""); setProductPrice(""); setProductStock(""); setProductSerialCode(""); setProductDescription("")
    if (businessId) await loadProducts(businessId)
  }

  const handleDeleteByMonth = async () => {
    if (!isOwner || !businessId || !deleteMonth || !deleteYear) { showToast("Datos incompletos", false); return }
    if (!confirm(`¿Eliminar todos los registros de ${deleteMonth}/${deleteYear}? Esta acción no se puede deshacer.`)) return
    const res = await fetch(`/api/sales?business_id=${businessId}&month=${deleteMonth}&year=${deleteYear}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { showToast(data.error || "Error al eliminar", false); return }
    showToast(`${data.deleted || 0} registros eliminados`)
    await loadSales(businessId)
  }

  // Receipt printer
  const fmtFull = (d: string) => isMounted ? new Intl.DateTimeFormat("es-PE", { timeZone, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d)) : "--"
  const fmtHour = (d: string) => isMounted ? new Intl.DateTimeFormat("es-PE", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(d)) : "--"
  const fmtDate = (d: string) => isMounted ? new Intl.DateTimeFormat("es-PE", { timeZone, day: "2-digit", month: "long", year: "numeric" }).format(new Date(d)) : "--"
  const dateKey = (d: string) => isMounted ? new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d)) : ""

  const getSaleCode = (s: Sale) => {
    if (s.sale_code) return s.sale_code
    const d = new Date(s.created_at)
    const p = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d).replace(/-/g, "")
    return `VTA-${p}-${s.id.slice(0, 4).toUpperCase()}`
  }

  const handlePrintReceipt = (sale: Sale) => {
    const w = window.open("", "_blank", "width=960,height=1100")
    if (!w) { showToast("No se pudo abrir el comprobante", false); return }
    const itemsHtml = (sale.sale_items || []).map(item => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e7eb"><b>${item.products?.name || "Producto"}</b>${item.products?.serial_code ? `<div style="font-size:11px;color:#64748b">Serie: ${item.products.serial_code}</div>` : ""}</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right">S/ ${Number(item.price).toFixed(2)}</td><td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right"><b>S/ ${Number(item.subtotal).toFixed(2)}</b></td></tr>`).join("")
    const loc = [sale.customer_department, sale.customer_province, sale.customer_district].filter(Boolean).join(" - ")
    const saleCode = getSaleCode(sale)
    const totalUnits = (sale.sale_items || []).reduce((a, i) => a + Number(i.quantity || 0), 0)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(JSON.stringify({ code: saleCode, total: Number(sale.total).toFixed(2), customer: sale.customer_name || "General", date: fmtFull(sale.created_at) }))}`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante ${saleCode}</title><style>*{box-sizing:border-box}@page{size:A4;margin:12mm}body{margin:0;font-family:Arial,sans-serif;background:#eef2ff;font-size:12px}.wrap{max-width:740px;margin:12px auto}.actions{text-align:right;margin-bottom:10px}.btn{background:#0B0B0D;color:#D4AF37;border:0;padding:10px 16px;border-radius:10px;font-weight:700;cursor:pointer;font-size:12px}.page{background:white;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.14)}.header{background:linear-gradient(135deg,#0B0B0D,#141418,#2B2B30);color:white;padding:22px 26px 18px}.store{font-size:22px;font-weight:900;margin:0}.sub{margin-top:4px;font-size:10px;opacity:.7;letter-spacing:1.5px;text-transform:uppercase;color:#D4AF37}.badge{background:rgba(212,175,55,.15);border:1px solid rgba(212,175,55,.3);border-radius:12px;padding:8px 12px;text-align:right}.badge-mini{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;opacity:.7}.badge-code{margin-top:3px;font-size:14px;font-weight:800;color:#D4AF37}.content{padding:16px 22px 20px}.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:10px;margin-bottom:14px}.hcard{border:1px solid #e5e7eb;border-radius:14px;padding:12px}.htotal{border:1px solid #D4AF37;border-radius:14px;padding:12px;background:rgba(212,175,55,.05)}.hlabel{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.3px}.hvalue{font-size:28px;font-weight:900;color:#059669;margin-top:4px}.hline{display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-top:5px}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}.card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;padding:9px 11px}.card-wide{grid-column:1/-1}.clabel{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.3px}.cvalue{font-size:12px;font-weight:700;color:#0f172a;margin-top:3px}.section{font-size:13px;font-weight:900;margin:14px 0 8px;color:#0f172a}table{width:100%;border-collapse:collapse}thead th{text-align:left;font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;padding:0 0 7px;border-bottom:2px solid #e5e7eb}.summary{display:flex;justify-content:flex-end;margin-top:12px}.sumcard{min-width:230px;border:1px solid #e5e7eb;border-radius:14px;padding:12px}.sumline{display:flex;justify-content:space-between;font-size:11px;color:#475569;margin-bottom:5px}.sumtotal{display:flex;justify-content:space-between;border-top:1px solid #e5e7eb;padding-top:8px;margin-top:6px}.sumtotal span:first-child{font-size:10px;text-transform:uppercase;color:#64748b}.sumtotal span:last-child{font-size:20px;font-weight:900;color:#0f172a}.qrblock{display:flex;align-items:center;gap:10px;margin-top:12px;padding:10px 12px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc}.footer{margin-top:12px;padding-top:8px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#64748b;font-size:10px}@media print{body{background:white}.wrap{max-width:100%;margin:0}.page{box-shadow:none;border-radius:0}.actions{display:none}}</style></head><body><div class="wrap"><div class="actions"><button class="btn" onclick="window.print()">🖨 Imprimir comprobante</button></div><div class="page"><div class="header"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px">${logoUrl ? `<div style="display:flex;align-items:center;gap:12px"><div style="width:52px;height:52px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;padding:6px"><img src="${logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain"></div><div><p class="store">${businessName}</p><p class="sub">Comprobante · Mahu Plexus</p></div></div>` : `<div><p class="store">${businessName}</p><p class="sub">Comprobante · Mahu Plexus</p></div>`}<div class="badge"><div class="badge-mini">Código</div><div class="badge-code">${saleCode}</div></div></div></div><div class="content"><div class="hero"><div class="hcard"><div class="hlabel">Resumen</div><div class="hline"><span>Fecha</span><b>${fmtFull(sale.created_at)}</b></div><div class="hline"><span>Cliente</span><b>${sale.customer_name || "Cliente general"}</b></div><div class="hline"><span>Pago</span><b style="text-transform:capitalize">${sale.payment_method || "efectivo"}</b></div></div><div class="htotal"><div class="hlabel">Total venta</div><div class="hvalue">S/ ${Number(sale.total).toFixed(2)}</div></div></div><div class="grid"><div class="card"><div class="clabel">Cliente</div><div class="cvalue">${sale.customer_name || "Cliente general"}</div></div><div class="card"><div class="clabel">${/^\d{8}$/.test(sale.customer_dni || "") ? "DNI" : "Documento"}</div><div class="cvalue">${sale.customer_dni || "-"}</div></div><div class="card"><div class="clabel">Teléfono</div><div class="cvalue">${sale.customer_phone || "-"}</div></div><div class="card"><div class="clabel">Ubicación</div><div class="cvalue">${loc || "-"}</div></div>${sale.customer_address ? `<div class="card card-wide"><div class="clabel">Dirección</div><div class="cvalue">${sale.customer_address}</div></div>` : ""}${sale.payment_detail ? `<div class="card card-wide"><div class="clabel">Detalle de pago</div><div class="cvalue">${sale.payment_detail}</div></div>` : ""}</div><div class="section">Productos</div><table><thead><tr><th style="width:46%">Producto</th><th style="width:14%;text-align:center">Cant.</th><th style="width:20%;text-align:right">Precio</th><th style="width:20%;text-align:right">Subtotal</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="summary"><div class="sumcard"><div class="sumline"><span>Productos</span><span>${sale.sale_items?.length || 0}</span></div><div class="sumline"><span>Unidades</span><span>${totalUnits}</span></div><div class="sumtotal"><span>Total</span><span>S/ ${Number(sale.total).toFixed(2)}</span></div></div></div><div class="qrblock"><img src="${qrUrl}" style="width:68px;height:68px;border-radius:8px"><div><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px">Código comprobante</div><div style="font-size:12px;font-weight:800;color:#0f172a;margin-top:4px">${saleCode}</div></div></div><div class="footer"><span>Powered by Mahu Plexus</span><span>Gracias por su compra</span></div></div></div></div></body></html>`)
    w.document.close()
  }

  // Daily report
  const todayKey = isMounted ? new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()) : ""
  const salesToday = sales.filter(s => dateKey(s.created_at) === todayKey)
  const totalHoy = salesToday.reduce((a, s) => a + Number(s.total || 0), 0)
  const unidadesHoy = salesToday.reduce((a, s) => a + (s.sale_items || []).reduce((b, i) => b + Number(i.quantity || 0), 0), 0)

  const dailyProductReport: DailyProductReport[] = useMemo(() => {
    const map = new Map<string, DailyProductReport>()
    for (const s of salesToday) {
      for (const item of s.sale_items || []) {
        const cur = map.get(item.product_id)
        if (cur) { cur.quantity += Number(item.quantity || 0); cur.total += Number(item.subtotal || 0); cur.salesCount++ }
        else map.set(item.product_id, { product_id: item.product_id, name: item.products?.name || "Producto", serial_code: item.products?.serial_code || null, quantity: Number(item.quantity || 0), total: Number(item.subtotal || 0), salesCount: 1 })
      }
    }
    return [...map.values()].sort((a, b) => b.quantity - a.quantity)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, todayKey])

  const handlePrintDailyReport = () => {
    const w = window.open("", "_blank", "width=1100,height=1200")
    if (!w) return
    const rowsHtml = dailyProductReport.map(item => `<tr><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb"><b>${item.name}</b>${item.serial_code ? `<div style="font-size:11px;color:#64748b">Serie: ${item.serial_code}</div>` : ""}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.salesCount}</td><td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#059669;font-weight:800">S/ ${item.total.toFixed(2)}</td></tr>`).join("") || `<tr><td colspan="4" style="padding:18px;text-align:center;color:#64748b">Sin ventas hoy</td></tr>`
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte del día</title><style>*{box-sizing:border-box}@page{size:A4;margin:12mm}body{margin:0;font-family:Arial,sans-serif;background:#eef2ff;font-size:12px}.wrap{max-width:900px;margin:14px auto;padding:0 12px}.actions{text-align:right;margin-bottom:12px}.btn{background:#0B0B0D;color:#D4AF37;border:0;padding:10px 16px;border-radius:10px;font-weight:700;cursor:pointer}.page{background:white;border-radius:22px;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,.14)}.header{background:linear-gradient(135deg,#0B0B0D,#141418,#2B2B30);color:white;padding:26px 30px 22px}.title{margin:0;font-size:26px;font-weight:900}.sub{margin-top:6px;font-size:11px;opacity:.7;letter-spacing:1.2px;text-transform:uppercase;color:#D4AF37}.content{padding:20px 28px 28px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}.card{background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:14px 16px}.label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px}.value{margin-top:6px;font-size:26px;font-weight:900;color:#0f172a}.green{color:#059669}.blue{color:#0891b2}.section{font-size:16px;font-weight:900;margin:20px 0 12px;color:#0f172a}table{width:100%;border-collapse:collapse}thead th{text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1.3px;padding:10px 8px;border-bottom:2px solid #e5e7eb}.footer{margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;color:#64748b;font-size:11px}@media print{body{background:white}.wrap{max-width:100%;margin:0;padding:0}.page{box-shadow:none;border-radius:0}.actions{display:none}}</style></head><body><div class="wrap"><div class="actions"><button class="btn" onclick="window.print()">🖨 Guardar como PDF</button></div><div class="page"><div class="header">${logoUrl ? `<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><div style="width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,.1);border:1px solid rgba(212,175,55,.3);display:flex;align-items:center;justify-content:center;padding:6px"><img src="${logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain"></div><div><h1 class="title">${businessName}</h1><p class="sub">Reporte del día · Mahu Plexus</p></div></div>` : `<h1 class="title">${businessName}</h1><p class="sub">Reporte del día · Mahu Plexus</p>`}</div><div class="content"><div class="stats"><div class="card"><div class="label">Ventas</div><div class="value">${salesToday.length}</div></div><div class="card"><div class="label">Unidades</div><div class="value blue">${unidadesHoy}</div></div><div class="card"><div class="label">Total</div><div class="value green">S/ ${totalHoy.toFixed(2)}</div></div></div><div class="section">Detalle de productos vendidos hoy</div><table><thead><tr><th>Producto</th><th style="text-align:center">Unidades</th><th style="text-align:center">Ventas</th><th style="text-align:right">Total</th></tr></thead><tbody>${rowsHtml}</tbody></table><div class="footer"><span>Powered by Mahu Plexus</span><span>Reporte: ${fmtFull(new Date().toISOString())}</span></div></div></div></div></body></html>`)
    w.document.close()
  }

  // Grouped sales for history
  const groupedSales: GroupedSales[] = useMemo(() => {
    if (!isMounted) return []
    const groups: Record<string, GroupedSales> = {}
    for (const s of sales) {
      const k = dateKey(s.created_at)
      if (!groups[k]) groups[k] = { dateKey: k, label: fmtDate(s.created_at), total: 0, units: 0, count: 0, sales: [] }
      groups[k].sales.push(s)
      groups[k].count++
      groups[k].total += Number(s.total || 0)
      groups[k].units += (s.sale_items || []).reduce((b, i) => b + Number(i.quantity || 0), 0)
    }
    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, isMounted])

  const recentProducts = useMemo(() => availableProducts.filter(p => recentProductIds.includes(p.id)).slice(0, 6), [availableProducts, recentProductIds])
  const topProducts = useMemo(() => availableProducts.filter(p => topProductIds.includes(p.id)).slice(0, 6), [availableProducts, topProductIds])

  const inp = "rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-3 py-2.5 text-sm text-[#E6E6E6] outline-none transition placeholder:text-[#E6E6E6]/25 focus:border-[#D4AF37]/50 w-full"

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/3 blur-[140px]" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#D4AF37]/2 blur-[160px]" />
      </div>

      <Sidebar activePage="sales" role={role || undefined} subStatus={subInfo?.status} subEndsAt={subInfo?.trialEndsAt || subInfo?.currentPeriodEnd} />

      <div className="relative z-10 xl:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/90 px-5 py-3.5 backdrop-blur-2xl md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold text-[#E6E6E6]">Ventas</h1>
                <p className="text-[10px] text-[#E6E6E6]/40 uppercase tracking-widest">{isOwner ? "Modo dueño" : "Modo vendedor"}</p>
              </div>
              {/* Tabs */}
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-[#2B2B30] bg-[#141418] p-1">
                {([
                  { id: "sell", label: "Nueva venta" },
                  { id: "history", label: "Historial" },
                  { id: "report", label: "Reporte del día" },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === t.id ? "bg-[#D4AF37] text-[#0B0B0D]" : "text-[#E6E6E6]/50 hover:text-[#E6E6E6]"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "sell" && (
                <div className="hidden md:flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">Carrito</span>
                  <span className="text-sm font-bold text-[#D4AF37]">{cart.length} items · S/ {cartTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          {/* Mobile tabs */}
          <div className="mt-2 flex gap-1 sm:hidden">
            {([{ id: "sell", label: "Vender" }, { id: "history", label: "Historial" }, { id: "report", label: "Reporte" }] as const).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${activeTab === t.id ? "bg-[#D4AF37] text-[#0B0B0D]" : "border border-[#2B2B30] text-[#E6E6E6]/50"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </header>

        <div className="px-5 py-5 md:px-8 pb-28 xl:pb-5">

          {/* ═══════════════ SELL TAB ═══════════════ */}
          {activeTab === "sell" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                {/* Left: Product search */}
                <div className="space-y-4">
                  {/* Fast search */}
                  <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Búsqueda rápida</p>
                    <div className="relative">
                      <input
                        ref={searchRef}
                        autoFocus
                        placeholder="Buscar producto por nombre o código de serie..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-4 py-3 pl-10 text-sm text-[#E6E6E6] outline-none transition placeholder:text-[#E6E6E6]/25 focus:border-[#D4AF37]/50"
                      />
                      <svg className="absolute left-3 top-3.5 h-4 w-4 text-[#E6E6E6]/30" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="mt-2 grid gap-1.5">
                        {searchResults.map(p => (
                          <button key={p.id} onClick={() => quickAddProduct(p)}
                            className="flex items-center justify-between rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-4 py-3 text-left transition hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 active:scale-[0.99]">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#E6E6E6]">{p.name}</p>
                              <p className="text-xs text-[#E6E6E6]/40">{p.serial_code ? `Serie: ${p.serial_code} · ` : ""}{p.description || ""}</p>
                            </div>
                            <div className="ml-4 flex items-center gap-3 shrink-0">
                              <span className="text-sm font-bold text-[#D4AF37]">S/ {Number(p.price).toFixed(2)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${Number(p.stock) <= 5 ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/10 text-emerald-300"}`}>{p.stock}</span>
                              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#D4AF37] text-[#0B0B0D] font-black text-sm">+</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {productSearch.trim() && searchResults.length === 0 && (
                      <p className="mt-2 text-sm text-[#E6E6E6]/40 px-1">Sin resultados para &quot;{productSearch}&quot;</p>
                    )}
                  </div>

                  {/* Quick access: Recent & Top */}
                  {!productSearch && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {recentProducts.length > 0 && (
                        <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/40">Recientes</p>
                          <div className="grid gap-1.5">
                            {recentProducts.map(p => (
                              <button key={p.id} onClick={() => quickAddProduct(p)}
                                className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 transition hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/5">
                                <span className="truncate text-sm text-[#E6E6E6]/80">{p.name}</span>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                  <span className="text-xs font-bold text-[#D4AF37]">S/ {Number(p.price).toFixed(2)}</span>
                                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black">+</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {topProducts.length > 0 && (
                        <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/40">Más vendidos</p>
                          <div className="grid gap-1.5">
                            {topProducts.map(p => (
                              <button key={p.id} onClick={() => quickAddProduct(p)}
                                className="flex items-center justify-between rounded-xl border border-transparent px-3 py-2 transition hover:border-[#D4AF37]/20 hover:bg-[#D4AF37]/5">
                                <span className="truncate text-sm text-[#E6E6E6]/80">{p.name}</span>
                                <div className="flex items-center gap-2 ml-2 shrink-0">
                                  <span className="text-xs font-bold text-[#D4AF37]">S/ {Number(p.price).toFixed(2)}</span>
                                  <span className="grid h-6 w-6 place-items-center rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-black">+</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer info */}
                  <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/40">Cliente (opcional)</p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <select value={customerDocumentType} onChange={e => { setCustomerDocumentType(e.target.value as "dni" | "cee" | "ruc"); setCustomerDocumentNumber(""); setLastDocumentQueried(""); setCustomerName(""); setCustomerRazonSocial("") }}
                          className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-3 py-2.5 text-sm text-[#E6E6E6] outline-none focus:border-[#D4AF37]/50 w-24 shrink-0">
                          <option value="dni">DNI</option>
                          <option value="cee">CEE</option>
                          <option value="ruc">RUC</option>
                        </select>
                        <div className="relative flex-1">
                          <input placeholder={customerDocumentType === "dni" ? "12345678" : customerDocumentType === "ruc" ? "20123456789" : "Documento"} value={customerDocumentNumber}
                            onChange={e => handleDocumentChange(e.target.value)} maxLength={customerDocumentType === "dni" ? 8 : customerDocumentType === "ruc" ? 11 : 15}
                            className={inp} />
                          {dniLoading && <span className="absolute right-3 top-3 h-4 w-4 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />}
                        </div>
                      </div>
                      <div className="relative">
                        <input placeholder={customerDocumentType === "ruc" ? "Razón social" : "Nombre del cliente"} value={customerName} onChange={e => setCustomerName(e.target.value)} className={inp} />
                        {customerRazonSocial && customerDocumentType === "ruc" && (
                          <p className="mt-1 text-[10px] text-[#D4AF37]/70 px-1">RUC: {customerRazonSocial}</p>
                        )}
                      </div>
                      <input placeholder="Teléfono" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inp} />
                      <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inp}>
                        <option value="efectivo">Efectivo</option>
                        <option value="yape">Yape</option>
                        <option value="plin">Plin</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="otro">Otro</option>
                      </select>
                      {(customerDepartment || customerProvince || customerDistrict) && (
                        <input placeholder="Ubicación" value={[customerDepartment, customerProvince, customerDistrict].filter(Boolean).join(" - ")} readOnly className={`${inp} col-span-full opacity-60`} />
                      )}
                    </div>
                  </div>

                  {/* Create product */}
                  <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/40">Crear producto rápido</p>
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                      <input placeholder="Nombre *" value={productName} onChange={e => setProductName(e.target.value)} className={inp} />
                      <input placeholder="Precio *" type="number" min="0" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)} className={inp} />
                      <input placeholder="Stock *" type="number" min="0" value={productStock} onChange={e => setProductStock(e.target.value)} className={inp} />
                      <input placeholder="Código/Serie" value={productSerialCode} onChange={e => setProductSerialCode(e.target.value)} className={inp} />
                      <input placeholder="Descripción" value={productDescription} onChange={e => setProductDescription(e.target.value)} className={`${inp} sm:col-span-1 lg:col-span-2`} />
                    </div>
                    <button onClick={handleCreateProduct}
                      className="mt-3 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/15 hover:-translate-y-0.5">
                      + Crear producto
                    </button>
                  </div>
                </div>

                {/* Right: Cart */}
                <div className="lg:sticky lg:top-20 space-y-3">
                  <div className="rounded-2xl border border-[#D4AF37]/15 bg-[#141418]/80 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">Carrito ({cart.length})</p>
                      {cart.length > 0 && (
                        <button onClick={() => setCart([])} className="text-[10px] text-rose-400 hover:text-rose-300 transition">Vaciar</button>
                      )}
                    </div>

                    {cart.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#2B2B30] p-6 text-center">
                        <p className="text-xs text-[#E6E6E6]/30">Agrega productos para vender</p>
                        <p className="mt-1 text-[10px] text-[#E6E6E6]/20">Busca arriba o haz clic en los productos rápidos</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                        {cart.map(item => (
                          <div key={item.product_id} className="flex items-center gap-2 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-xs font-semibold text-[#E6E6E6]">{item.name}</p>
                              <p className="text-[10px] text-[#E6E6E6]/40">S/ {item.price.toFixed(2)} c/u</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => setCart(p => p.map(i => i.product_id === item.product_id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                                className="grid h-6 w-6 place-items-center rounded-lg bg-[#2B2B30] text-xs font-bold text-[#E6E6E6]/70 hover:bg-[#D4AF37]/20 transition">−</button>
                              <span className="w-5 text-center text-sm font-bold text-[#E6E6E6]">{item.quantity}</span>
                              <button onClick={() => setCart(p => p.map(i => i.product_id === item.product_id && i.quantity < i.stock ? { ...i, quantity: i.quantity + 1 } : i))}
                                className="grid h-6 w-6 place-items-center rounded-lg bg-[#2B2B30] text-xs font-bold text-[#E6E6E6]/70 hover:bg-[#D4AF37]/20 transition">+</button>
                            </div>
                            <div className="w-16 text-right shrink-0">
                              <p className="text-xs font-bold text-[#D4AF37]">S/ {(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                            <button onClick={() => setCart(p => p.filter(i => i.product_id !== item.product_id))}
                              className="grid h-6 w-6 place-items-center rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition text-xs">✕</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {cart.length > 0 && (
                      <div className="mt-3 border-t border-[#2B2B30] pt-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-[#E6E6E6]/50">Total a cobrar</span>
                          <span className="text-xl font-black text-[#D4AF37]">S/ {cartTotal.toFixed(2)}</span>
                        </div>
                        <button onClick={handleSale} disabled={saleLoading || !canSell}
                          className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-sm font-black text-[#0B0B0D] shadow-[0_8px_24px_rgba(212,175,55,0.25)] transition hover:shadow-[0_12px_32px_rgba(212,175,55,0.4)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed">
                          {saleLoading ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="h-4 w-4 rounded-full border-2 border-[#0B0B0D]/30 border-t-[#0B0B0D] animate-spin" />
                              Registrando...
                            </span>
                          ) : `Confirmar venta · S/ ${cartTotal.toFixed(2)}`}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Today summary */}
                  <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#E6E6E6]/30">Resumen de hoy</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center"><p className="text-lg font-black text-[#D4AF37]">{salesToday.length}</p><p className="text-[9px] text-[#E6E6E6]/40">ventas</p></div>
                      <div className="text-center"><p className="text-lg font-black text-emerald-400">S/ {totalHoy.toFixed(2)}</p><p className="text-[9px] text-[#E6E6E6]/40">total</p></div>
                      <div className="text-center"><p className="text-lg font-black text-[#E6E6E6]/70">{unidadesHoy}</p><p className="text-[9px] text-[#E6E6E6]/40">unidades</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ HISTORY TAB ═══════════════ */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#E6E6E6]">Historial de ventas</p>
                  <p className="text-xs text-[#E6E6E6]/40 mt-0.5">{sales.length} ventas registradas</p>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <select value={deleteMonth} onChange={e => setDeleteMonth(e.target.value)}
                      className="rounded-xl border border-[#2B2B30] bg-[#141418] px-3 py-2 text-xs text-[#E6E6E6]/70 outline-none focus:border-[#D4AF37]/40">
                      <option value="">Mes</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                      ))}
                    </select>
                    <input value={deleteYear} onChange={e => setDeleteYear(e.target.value)} placeholder="Año" maxLength={4}
                      className="w-20 rounded-xl border border-[#2B2B30] bg-[#141418] px-3 py-2 text-xs text-[#E6E6E6]/70 outline-none focus:border-[#D4AF37]/40" />
                    <button onClick={handleDeleteByMonth}
                      className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15">
                      Eliminar mes
                    </button>
                  </div>
                )}
              </div>

              {groupedSales.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2B2B30]">
                  <EmptyState
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 6h18M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>}
                    title="No hay ventas registradas"
                    description="Cuando registres tu primera venta aparecerá aquí con todo su detalle."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedSales.map(group => (
                    <div key={group.dateKey} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 overflow-hidden">
                      {/* Day header */}
                      <div className="flex items-center justify-between border-b border-[#2B2B30] bg-[#0B0B0D]/40 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${group.dateKey === todayKey ? "bg-[#D4AF37] text-[#0B0B0D]" : "bg-[#2B2B30] text-[#E6E6E6]/60"}`}>
                            {group.dateKey === todayKey ? "HOY" : group.label}
                          </span>
                          {group.dateKey === todayKey && <span className="text-xs text-[#E6E6E6]/50">{group.label}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-[#E6E6E6]/40">{group.count} ventas · {group.units} uds</span>
                          <span className="text-sm font-bold text-emerald-400">S/ {group.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Compact sale rows */}
                      <div className="divide-y divide-[#2B2B30]/50">
                        {group.sales.map(sale => (
                          <div key={sale.id}>
                            {/* Compact row */}
                            <button onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                              className="mp-row-hover w-full flex items-center gap-3 px-4 py-2.5 text-left">
                              <span className="text-xs font-mono text-[#E6E6E6]/40 w-10 shrink-0">{fmtHour(sale.created_at)}</span>
                              <span className="flex-1 truncate text-xs text-[#E6E6E6]/70">{sale.customer_name || "Cliente general"}</span>
                              <span className="text-xs text-[#E6E6E6]/40 hidden sm:block">{sale.payment_method || "efectivo"}</span>
                              <span className="text-sm font-bold text-[#D4AF37] shrink-0">S/ {Number(sale.total).toFixed(2)}</span>
                              <span className="text-[#E6E6E6]/30 text-xs">{expandedSale === sale.id ? "▲" : "▼"}</span>
                            </button>

                            {/* Expanded */}
                            {expandedSale === sale.id && (
                              <div className="border-t border-[#2B2B30]/50 bg-[#0B0B0D]/30 px-4 py-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                  <div>
                                    <p className="text-xs font-mono text-[#D4AF37]/80">{getSaleCode(sale)}</p>
                                    <p className="text-xs text-[#E6E6E6]/40 mt-0.5">{fmtFull(sale.created_at)}</p>
                                  </div>
                                  <button onClick={() => handlePrintReceipt(sale)}
                                    className="rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/15">
                                    Ver comprobante
                                  </button>
                                </div>
                                {/* Items */}
                                <div className="space-y-1.5">
                                  {(sale.sale_items || []).map(item => (
                                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#141418]/60 px-3 py-2">
                                      <div>
                                        <p className="text-xs font-medium text-[#E6E6E6]">{item.products?.name || "Producto"}</p>
                                        {item.products?.serial_code && <p className="text-[10px] text-[#E6E6E6]/40">Serie: {item.products.serial_code}</p>}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs text-[#E6E6E6]/60">{item.quantity} × S/ {Number(item.price).toFixed(2)}</p>
                                        <p className="text-xs font-bold text-[#D4AF37]">S/ {Number(item.subtotal).toFixed(2)}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
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

          {/* ═══════════════ REPORT TAB ═══════════════ */}
          {activeTab === "report" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#E6E6E6]">Reporte del día</p>
                  <p className="text-xs text-[#E6E6E6]/40 mt-0.5">{isMounted ? fmtDate(new Date().toISOString()) : ""}</p>
                </div>
                <button onClick={handlePrintDailyReport}
                  className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-4 py-2.5 text-xs font-bold text-[#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,175,55,0.3)]">
                  Generar PDF del día
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Ventas hoy", value: salesToday.length.toString(), color: "text-[#D4AF37]" },
                  { label: "Unidades", value: unidadesHoy.toString(), color: "text-[#E6E6E6]" },
                  { label: "Total", value: `S/ ${totalHoy.toFixed(2)}`, color: "text-emerald-400" },
                ].map(k => (
                  <div key={k.label} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-widest text-[#E6E6E6]/40">{k.label}</p>
                    <p className={`mt-2 text-2xl font-black ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {dailyProductReport.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2B2B30]">
                  <EmptyState
                    compact
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 15l3-4 3 2 4-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    title="No hay ventas registradas hoy"
                    description="El resumen del día se actualiza automáticamente con cada venta."
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 overflow-hidden">
                  <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_100px] gap-3 border-b border-[#2B2B30] bg-[#0B0B0D]/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-[#E6E6E6]/35">
                    <p>Producto</p><p className="text-center">Uds</p><p className="text-center">Ventas</p><p className="text-right">Total</p>
                  </div>
                  <div className="divide-y divide-[#2B2B30]/50">
                    {dailyProductReport.map(item => (
                      <div key={item.product_id} className="grid grid-cols-[minmax(0,1fr)_80px_80px_100px] gap-3 items-center px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-[#E6E6E6]">{item.name}</p>
                          {item.serial_code && <p className="text-xs text-[#E6E6E6]/40">Serie: {item.serial_code}</p>}
                        </div>
                        <p className="text-center text-sm font-bold text-[#E6E6E6]">{item.quantity}</p>
                        <p className="text-center text-sm text-[#E6E6E6]/60">{item.salesCount}</p>
                        <p className="text-right text-sm font-bold text-emerald-400">S/ {item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 mp-slide-up flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${toast.ok ? "border-[#D4AF37]/25 bg-[#141418]/95" : "border-rose-500/25 bg-[#141418]/95"}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${toast.ok ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-rose-500/15 text-rose-300"}`}>
            {toast.ok ? "✓" : "!"}
          </span>
          <p className="text-sm font-medium text-[#E6E6E6]">{toast.msg}</p>
        </div>
      )}

      {subInfo?.isBlockedPage && (
        <ExpiredWall status={subInfo.status as "expired" | "suspended"} businessName={businessName} />
      )}

      {loading && <LoadingScreen message="Cargando ventas..." />}
          <MobileNav active="sales" role={role as "owner" | "seller" | null} />

    </main>
  )
}
