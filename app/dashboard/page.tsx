"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { TrialModal } from "../components/TrialModal"
import { ExpiredWall } from "../components/ExpiredWall"
import { UsageMeter } from "../components/UsageMeter"
import { LogoIntro } from "../components/LogoIntro"
import { CountUp } from "../components/CountUp"
import { toast } from "../components/Toast"
import { getSubscriptionInfo, activateTrialIfNew, getUsageStats, type SubscriptionInfo } from "../lib/subscription"

// ── Types ─────────────────────────────────────────────────────────
type Product = { id:string; name:string; price:number; stock:number; description?:string; serial_code?:string|null; cost?:number; sku?:string|null; category?:string|null; brand?:string|null; min_stock?:number|null; created_at?:string|null }
type SaleItem = { id:string; quantity:number; price:number; subtotal:number; product_id?:string|null; products?:{id:string;name:string;serial_code?:string|null}|null }
type Sale = { id:string; total:number; created_at:string; seller_id?:string|null; sale_items:SaleItem[] }
type SellerProfile = { id:string; full_name?:string|null; email?:string|null }
type MovementFilter = "today"|"yesterday"|"7days"|"30days"
type InventoryMovement = { id:string; product_id?:string|null; user_id?:string|null; type:string; quantity?:number|null; note?:string|null; created_at:string }

// ── Helpers ───────────────────────────────────────────────────────
const TZ = typeof window!=="undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
const toKey   = (d: Date) => new Intl.DateTimeFormat("sv-SE", {timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d)
const fmtDate = (s: string) => new Intl.DateTimeFormat("es-PE", {timeZone:TZ,day:"2-digit",month:"short",year:"numeric"}).format(new Date(s))
const fmtTime = (s: string) => new Intl.DateTimeFormat("es-PE", {timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date(s))

export default function DashboardPage() {
  const router = useRouter()

  // state
  const [products,   setProducts]   = useState<Product[]>([])
  const [sales,      setSales]      = useState<Sale[]>([])
  const [movements,  setMovements]  = useState<InventoryMovement[]>([])
  const [profiles,   setProfiles]   = useState<Record<string,SellerProfile>>({})
  const [businessId, setBId]        = useState<string|null>(null)
  const [businessName, setBName]    = useState("Mi Tienda")
  const [userId,     setUID]        = useState<string|null>(null)
  const [role,       setRole]       = useState<"owner"|"seller"|null>(null)
  const [subInfo,    setSubInfo]    = useState<SubscriptionInfo|null>(null)
  const [usage,      setUsage]      = useState<{products:{used:number;limit:number;pct:number};sellers:{used:number;limit:number;pct:number}}|null>(null)
  const [showIntro,  setShowIntro]  = useState(true)

  // product form
  const [name,       setName]       = useState("")
  const [price,      setPrice]      = useState("")
  const [stock,      setStock]      = useState("")
  const [serial,     setSerial]     = useState("")
  const [sku,        setSku]        = useState("")
  const [category,   setCategory]   = useState("")
  const [brand,      setBrand]      = useState("")
  const [minStock,   setMinStock]   = useState("")
  const [desc,       setDesc]       = useState("")
  const [editing,    setEditing]    = useState<Product|null>(null)

  // UI
  const [search,     setSearch]     = useState("")
  const [invTab,     setInvTab]     = useState<"all"|"low"|"out">("all")
  const [invSort,    setInvSort]    = useState<"name"|"stock_low"|"stock_high"|"price_low"|"price_high">("name")
  const [invPage,    setInvPage]    = useState(1)
  const [pageSize,   setPageSize]   = useState(50)
  const [mvFilter,   setMvFilter]   = useState<MovementFilter>("today")
  const [loading,    setLoading]    = useState(true)
  const [isMounted,  setIsMounted]  = useState(false)
  const [clock,      setClock]      = useState("")
  const [showTrial,  setShowTrial]  = useState(false)

  // ── Loaders ────────────────────────────────────────────────────
  const loadProfiles = useCallback(async (ids: string[]) => {
    const unique = [...new Set(ids.filter(Boolean))]
    if (!unique.length) return
    const { data } = await supabase.from("profiles").select("id,full_name,email").in("id", unique)
    if (data) setProfiles(prev => { const m={...prev}; data.forEach(p => { m[p.id]=p }); return m })
  }, [])

  const loadProducts = useCallback(async (bId: string) => {
    const res = await fetch(`/api/products?business_id=${bId}`)
    const data = await res.json()
    if (res.ok) setProducts(data.data || [])
  }, [])

  const loadSales = useCallback(async (bId: string) => {
    const res = await fetch(`/api/sales?business_id=${bId}&role=owner`)
    const data = await res.json()
    if (res.ok) {
      setSales(data.data || [])
      const ids = (data.data||[]).map((s:Sale)=>s.seller_id).filter(Boolean) as string[]
      await loadProfiles(ids)
    }
  }, [loadProfiles])

  const loadMovements = useCallback(async (bId: string) => {
    const { data } = await supabase
      .from("inventory_movements").select("id,product_id,user_id,type,quantity,note,created_at")
      .eq("business_id", bId).order("created_at",{ascending:false}).limit(300)
    if (data) {
      setMovements(data as InventoryMovement[])
      const ids = data.map((m:InventoryMovement)=>m.user_id).filter(Boolean) as string[]
      if (ids.length) await loadProfiles(ids)
    }
  }, [loadProfiles])

  // ── Mount ──────────────────────────────────────────────────────
  useEffect(() => {
    setIsMounted(true)
    // Logo intro only once per browser session
    try {
      if (sessionStorage.getItem("mp-intro-shown") === "1") {
        setShowIntro(false)
      } else {
        sessionStorage.setItem("mp-intro-shown", "1")
      }
    } catch { setShowIntro(false) }
    const tick = () => setClock(new Intl.DateTimeFormat("es-PE",{timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date()))
    tick(); const id = setInterval(tick,1000); return ()=>clearInterval(id)
  },[])

  useEffect(() => {
    ;(async () => {
      const { data:{user} } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUID(user.id)

      const { data:p } = await supabase.from("profiles").select("business_id,role,active").eq("id",user.id).single()
      if (!p) { router.push("/login"); return }
      if (p.active===false) { await supabase.auth.signOut(); router.push("/login"); return }
      if (p.role==="seller") { router.push("/sales"); return }

      setRole(p.role as "owner")
      setBId(p.business_id)

      if (p.business_id) {
        // Load business name
        const { data:biz } = await supabase.from("businesses").select("name").eq("id",p.business_id).single()
        if (biz) setBName(biz.name||"Mi Tienda")

        // Subscription + auto-trial
        const wasNew = await activateTrialIfNew(p.business_id)
        if (wasNew) setShowTrial(true)
        const info = await getSubscriptionInfo(p.business_id)
        setSubInfo(info)
        const usageData = await getUsageStats(p.business_id, info.plan)
        setUsage(usageData)

        await Promise.all([loadProducts(p.business_id), loadSales(p.business_id), loadMovements(p.business_id)])
      }
      setTimeout(()=>setLoading(false),400)
    })()
  }, [router, loadProducts, loadSales, loadMovements])

  // ── Derived ────────────────────────────────────────────────────
  const todayKey  = isMounted ? toKey(new Date()) : ""
  const salesToday = sales.filter(s => isMounted && toKey(new Date(s.created_at))===todayKey)
  const totalToday = salesToday.reduce((a,s)=>a+Number(s.total||0),0)
  const unitsToday = salesToday.reduce((a,s)=>a+(s.sale_items||[]).reduce((b,i)=>b+Number(i.quantity||0),0),0)

  // Week/month stats
  const weekSales  = useMemo(()=>{ const d=new Date(); d.setDate(d.getDate()-7); return sales.filter(s=>new Date(s.created_at)>=d) },[sales])
  const monthSales = useMemo(()=>{ const d=new Date(); d.setDate(d.getDate()-30); return sales.filter(s=>new Date(s.created_at)>=d) },[sales])
  const weekTotal  = weekSales.reduce((a,s)=>a+Number(s.total||0),0)
  const monthTotal = monthSales.reduce((a,s)=>a+Number(s.total||0),0)

  // Cost/margin
  const totalCost   = sales.reduce((a,s)=>{
    return a+(s.sale_items||[]).reduce((b,i)=>{
      const p = products.find(p=>p.id===i.product_id)
      return b + (Number(p?.cost||0)*Number(i.quantity||0))
    },0)
  },0)
  const totalRevenue = sales.reduce((a,s)=>a+Number(s.total||0),0)
  const totalMargin  = totalRevenue>0 ? Math.round(((totalRevenue-totalCost)/totalRevenue)*100) : 0

  // Top products
  const topProducts = useMemo(()=>{
    const map = new Map<string,{name:string;qty:number;total:number}>()
    for (const s of sales) for (const i of s.sale_items||[]) {
      const pid = i.product_id
      if (!pid) continue
      const p = products.find(p=>p.id===pid)
      const cur = map.get(pid)
      if (cur) { cur.qty+=Number(i.quantity||0); cur.total+=Number(i.subtotal||0) }
      else map.set(pid,{name:i.products?.name||p?.name||"Producto",qty:Number(i.quantity||0),total:Number(i.subtotal||0)})
    }
    return [...map.values()].sort((a,b)=>b.qty-a.qty).slice(0,5)
  },[sales,products])

  // Seller ranking
  const sellerRanking = useMemo(()=>{
    const map = new Map<string,{name:string;total:number;count:number}>()
    for (const s of sales) {
      const sid = s.seller_id||"desconocido"
      const name = profiles[sid]?.full_name || (sid==="desconocido"?"Sin asignar":"Vendedor")
      const cur = map.get(sid)
      if (cur) { cur.total+=Number(s.total||0); cur.count++ }
      else map.set(sid,{name,total:Number(s.total||0),count:1})
    }
    return [...map.values()].sort((a,b)=>b.total-a.total).slice(0,5)
  },[sales,profiles])

  // Sales chart (last 7 days)
  const chart7 = useMemo(()=>Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i))
    const key=toKey(d)
    const label=isMounted?new Intl.DateTimeFormat("es-PE",{timeZone:TZ,weekday:"short"}).format(d).replace(".",""):"---"
    const total=sales.filter(s=>isMounted&&toKey(new Date(s.created_at))===key).reduce((a,s)=>a+Number(s.total||0),0)
    return {label,total,isToday:key===todayKey}
  }),[sales,todayKey,isMounted])
  const maxBar = Math.max(...chart7.map(d=>d.total),1)

  // Inventory derived
  const lowStock  = products.filter(p=>Number(p.stock)>0&&Number(p.stock)<=(Number(p.min_stock||0)||5))
  const outStock  = products.filter(p=>Number(p.stock)===0)
  const invHealth = products.length ? Math.round(((products.length-outStock.length)/products.length)*100) : 100

  // Filtered inventory
  const filtered = useMemo(()=>products.filter(p=>`${p.name}${p.description||""}${p.serial_code||""}${p.sku||""}${p.category||""}${p.brand||""}`.toLowerCase().includes(search.toLowerCase())),[products,search])
  const invList  = useMemo(()=>invTab==="low"?filtered.filter(p=>Number(p.stock)>0&&Number(p.stock)<=(Number(p.min_stock||0)||5)):invTab==="out"?filtered.filter(p=>Number(p.stock)===0):filtered,[filtered,invTab])
  const sortedInv = useMemo(()=>{
    const s=[...invList]
    if (invSort==="stock_low")  return s.sort((a,b)=>Number(a.stock)-Number(b.stock))
    if (invSort==="stock_high") return s.sort((a,b)=>Number(b.stock)-Number(a.stock))
    if (invSort==="price_low")  return s.sort((a,b)=>Number(a.price)-Number(b.price))
    if (invSort==="price_high") return s.sort((a,b)=>Number(b.price)-Number(a.price))
    return s.sort((a,b)=>a.name.localeCompare(b.name))
  },[invList,invSort])
  const totalPages = Math.max(1,Math.ceil(sortedInv.length/pageSize))
  const safePage   = Math.min(invPage,totalPages)
  const paginated  = useMemo(()=>sortedInv.slice((safePage-1)*pageSize,safePage*pageSize),[sortedInv,safePage,pageSize])

  // Movements filter
  const filteredMv = useMemo(()=>{
    const now=new Date(),t=new Date(now);t.setHours(0,0,0,0)
    const y=new Date(t);y.setDate(y.getDate()-1)
    const d7=new Date(t);d7.setDate(d7.getDate()-7)
    const d30=new Date(t);d30.setDate(d30.getDate()-30)
    return movements.filter(m=>{
      const md=new Date(m.created_at)
      if (mvFilter==="today")     return md>=t
      if (mvFilter==="yesterday") return md>=y&&md<t
      if (mvFilter==="7days")     return md>=d7
      return md>=d30
    })
  },[movements,mvFilter])

  // ── Product form handlers ──────────────────────────────────────
  const resetForm = () => { setEditing(null);setName("");setPrice("");setStock("");setSerial("");setSku("");setCategory("");setBrand("");setMinStock("");setDesc("") }

  const handleSave = async () => {
    if (!name||!price||!stock||!businessId) { toast.error("Completa nombre, precio y stock"); return }
    try {
      if (editing) {
        const res = await fetch("/api/products",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:editing.id,name,price:Number(price),stock:Number(stock),serial_code:serial,description:desc,user_id:userId,sku,category,brand,min_stock:minStock?Number(minStock):null})})
        const data = await res.json()
        if (!res.ok) { toast.error(data.error||"Error al actualizar"); return }
        toast.update("Producto actualizado")
      } else {
        // Check plan limit
        if (usage && usage.products.pct>=100) { toast.error("Límite de productos alcanzado. Actualiza tu plan."); return }
        const res = await fetch("/api/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,price:Number(price),stock:Number(stock),serial_code:serial,description:desc,business_id:businessId,user_id:userId,sku,category,brand,min_stock:minStock?Number(minStock):null})})
        const data = await res.json()
        if (!res.ok) { toast.error(data.error||"Error al crear"); return }
        toast.create("Producto creado")
      }
      resetForm()
      if (businessId) { await loadProducts(businessId); await loadMovements(businessId); const u=await getUsageStats(businessId,subInfo?.plan||null); setUsage(u) }
    } catch { toast.error("Error de conexión") }
  }

  const handleDelete = async (id: string) => {
    if (!businessId) return
    const res = await fetch(`/api/products?id=${id}&user_id=${userId||""}`,{method:"DELETE"})
    const data = await res.json()
    if (!res.ok) { toast.error(data.error||"Error al eliminar"); return }
    toast.delete("Producto eliminado")
    await loadProducts(businessId); await loadMovements(businessId)
  }

  const handleEdit = (p: Product) => {
    setEditing(p);setName(p.name);setPrice(String(p.price));setStock(String(p.stock))
    setSerial(p.serial_code||"");setSku(p.sku||"");setCategory(p.category||"")
    setBrand(p.brand||"");setMinStock(p.min_stock?String(p.min_stock):"");setDesc(p.description||"")
    toast.edit("Editando: " + p.name)
    document.getElementById("inv-form")?.scrollIntoView({behavior:"smooth",block:"start"})
  }

  const exportInventory = () => {
    if (!products.length) { toast.error("Sin productos para exportar"); return }
    const esc = (v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").trim()
    const rows = [...sortedInv]
    const html = `<html><head><meta charset="UTF-8"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px}table{border-collapse:collapse;width:100%}th{background:#0B0B0D;color:#D4AF37;padding:9px;text-align:left;font-size:11px}td{border:1px solid #e5e7eb;padding:8px;font-size:11px}tr:nth-child(even)td{background:#f8fafc}.r{text-align:right}</style></head><body><h2 style="margin-bottom:6px">Inventario — ${businessName}</h2><p style="font-size:11px;color:#64748b;margin-bottom:12px">${new Intl.DateTimeFormat("es-PE",{dateStyle:"full",timeStyle:"short"}).format(new Date())} · ${rows.length} productos</p><table><thead><tr><th>#</th><th>Producto</th><th>SKU</th><th>Categoría</th><th>Marca</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Stock Mín</th><th>Estado</th><th>Valor</th></tr></thead><tbody>${rows.map((p,i)=>`<tr><td>${i+1}</td><td><b>${esc(p.name)}</b></td><td>${esc(p.sku||"-")}</td><td>${esc(p.category||"-")}</td><td>${esc(p.brand||"-")}</td><td class="r">S/ ${Number(p.price).toFixed(2)}</td><td class="r">S/ ${Number(p.cost||0).toFixed(2)}</td><td class="r">${p.stock}</td><td class="r">${p.min_stock||"-"}</td><td>${Number(p.stock)===0?"Sin stock":Number(p.stock)<=(Number(p.min_stock||0)||5)?"Stock bajo":"OK"}</td><td class="r">S/ ${(Number(p.price)*Number(p.stock)).toFixed(2)}</td></tr>`).join("")}</tbody></table></body></html>`
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([html],{type:"application/vnd.ms-excel;charset=utf-8;"}));a.download=`inventario-${new Date().toISOString().slice(0,10)}.xls`;document.body.appendChild(a);a.click();document.body.removeChild(a)
    toast.export("Inventario exportado")
  }

  const inp = "mp-input"

  // ── Render ─────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/4 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#D4AF37]/3 blur-[160px]" />
      </div>

      <Sidebar
        activePage="dashboard" role={role}
        subStatus={subInfo?.status}
        subEndsAt={subInfo?.trialEndsAt||subInfo?.currentPeriodEnd}
      />

      <div className="relative z-10 xl:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/90 px-5 py-4 backdrop-blur-2xl md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[#E6E6E6]">Dashboard</h1>
              <p className="mt-0.5 text-xs text-[#E6E6E6]/40">{isMounted ? new Intl.DateTimeFormat("es-PE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date()) : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="xl:hidden flex gap-2">
                {[{href:"/sales",label:"Ventas"},{href:"/sellers",label:"Vendedores"}].map(l=>(
                  <a key={l.href} href={l.href} className="rounded-xl border border-[#2B2B30] bg-[#141418] px-3 py-2 text-xs font-medium text-[#E6E6E6]/60 hover:text-[#D4AF37] transition">{l.label}</a>
                ))}
              </div>
              <div className="hidden sm:block rounded-xl border border-[#2B2B30] bg-[#141418] px-3 py-2">
                <p className="font-mono text-sm font-bold text-[#D4AF37]">{clock||"--:--:--"}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-5 py-5 md:px-8 space-y-5 pb-28 xl:pb-5">

          {/* ── KPI row ── */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {[
              { label:"Ventas hoy",  node:<CountUp value={salesToday.length} />,                          sub:`${unitsToday} unidades`,       color:"text-[#D4AF37]" },
              { label:"Total hoy",   node:<CountUp value={totalToday} prefix="S/ " decimals={2} />,        sub:`Ticket: S/ ${salesToday.length?( totalToday/salesToday.length).toFixed(2):"0.00"}`, color:"text-emerald-400" },
              { label:"Esta semana", node:<CountUp value={weekTotal} prefix="S/ " decimals={2} />,         sub:`${weekSales.length} ventas`,   color:"text-[#E6E6E6]" },
              { label:"Este mes",    node:<CountUp value={monthTotal} prefix="S/ " decimals={2} />,        sub:`${monthSales.length} ventas`,  color:"text-[#E6E6E6]" },
            ].map((k,i)=>(
              <div key={i} className="mp-card p-4 rounded-2xl border border-[#2B2B30] mp-fade-up" style={{animationDelay:`${i*55}ms`}}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-[#E6E6E6]/38">{k.label}</p>
                <p className={`mt-2 text-xl font-black tabular-nums ${k.color}`}>{k.node}</p>
                <p className="mt-1 text-xs text-[#E6E6E6]/35">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* Bar chart */}
            <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5 mp-fade-up delay-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-bold text-[#E6E6E6]">Ventas — últimos 7 días</p>
                  <p className="text-xs text-[#E6E6E6]/38 mt-0.5">{sales.length} ventas totales registradas</p>
                </div>
                <span className="rounded-xl border border-[#D4AF37]/15 bg-[#D4AF37]/8 px-2.5 py-1 text-[10px] font-bold text-[#D4AF37]">
                  S/ {totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex h-36 items-end gap-1.5">
                {chart7.map((d,i)=>(
                  <div key={i} className="flex h-full flex-1 flex-col justify-end gap-1">
                    <div
                      className={`min-h-[3px] rounded-t-lg transition-all ${d.isToday ? "bg-gradient-to-t from-[#D4AF37] to-[#E8C84A]" : "bg-[#2B2B30] hover:bg-[#D4AF37]/40"}`}
                      style={{height:`${Math.max(3,(d.total/maxBar)*100)}%`}}
                      title={`S/ ${d.total.toFixed(2)}`}
                    />
                    <span className={`truncate text-center text-[9px] ${d.isToday?"text-[#D4AF37]":"text-[#E6E6E6]/35"}`}>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metrics panel */}
            <div className="grid gap-3 content-start mp-fade-up delay-150">
              {/* Margin */}
              <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#E6E6E6]/38 mb-2">Margen bruto</p>
                <div className="flex items-end gap-2">
                  <span className={`text-3xl font-black ${totalMargin>30?"text-emerald-400":totalMargin>10?"text-amber-400":"text-rose-400"}`}>{totalMargin}%</span>
                  <span className="text-xs text-[#E6E6E6]/38 mb-1">sobre ventas totales</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[#2B2B30] overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${totalMargin>30?"bg-emerald-400":totalMargin>10?"bg-amber-400":"bg-rose-400"}`} style={{width:`${Math.min(100,totalMargin)}%`}} />
                </div>
              </div>

              {/* Inventory health */}
              <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4">
                <p className="text-[10px] uppercase tracking-widest text-[#E6E6E6]/38 mb-2">Salud inventario</p>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-3xl font-black ${invHealth>80?"text-emerald-400":invHealth>50?"text-amber-400":"text-rose-400"}`}>{invHealth}%</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-rose-300">{outStock.length} agotados</span>
                  <span className="text-amber-300">{lowStock.length} bajo stock</span>
                  <span className="text-emerald-300">{products.length-outStock.length-lowStock.length} OK</span>
                </div>
              </div>

              {/* Plan usage */}
              {usage && (
                <div className="space-y-2">
                  <UsageMeter label="Productos" used={usage.products.used} limit={usage.products.limit} pct={usage.products.pct} icon="◈" />
                </div>
              )}
            </div>
          </div>

          {/* ── Top products + Seller ranking ── */}
          <div className="grid gap-4 lg:grid-cols-2 mp-fade-up delay-200">
            <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
              <p className="text-sm font-bold text-[#E6E6E6] mb-3">Productos más vendidos</p>
              {topProducts.length===0 ? (
                <p className="text-sm text-[#E6E6E6]/38">Sin ventas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((p,i)=>(
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3 py-2.5">
                      <span className="text-sm font-black text-[#D4AF37] w-5 shrink-0">{i+1}</span>
                      <p className="flex-1 truncate text-xs font-semibold text-[#E6E6E6]">{p.name}</p>
                      <span className="text-xs text-[#E6E6E6]/50">{p.qty} uds</span>
                      <span className="text-xs font-bold text-emerald-400">S/ {p.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
              <p className="text-sm font-bold text-[#E6E6E6] mb-3">Ranking de vendedores</p>
              {sellerRanking.length===0 ? (
                <p className="text-sm text-[#E6E6E6]/38">Sin ventas registradas.</p>
              ) : (
                <div className="space-y-2">
                  {sellerRanking.map((s,i)=>{
                    const medals = ["🥇","🥈","🥉"]
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3 py-2.5">
                        <span className="text-base shrink-0">{medals[i]||<span className="text-xs font-bold text-[#E6E6E6]/40">{i+1}</span>}</span>
                        <p className="flex-1 truncate text-xs font-semibold text-[#E6E6E6]">{s.name}</p>
                        <span className="text-xs text-[#E6E6E6]/50">{s.count} ventas</span>
                        <span className="text-xs font-bold text-[#D4AF37]">S/ {s.total.toFixed(2)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Critical stock alerts ── */}
          {(lowStock.length>0||outStock.length>0) && (
            <div className="rounded-2xl border border-amber-400/18 bg-amber-400/5 p-4 mp-fade-up delay-200">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300 mb-3">⚠ Alertas de inventario</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[...outStock.slice(0,6),...lowStock.slice(0,6)].slice(0,9).map(p=>(
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-3 py-2">
                    <p className="truncate text-xs text-[#E6E6E6]/70">{p.name}</p>
                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${Number(p.stock)===0?"bg-rose-500/15 text-rose-300":"bg-amber-400/15 text-amber-300"}`}>
                      {Number(p.stock)===0?"Agotado":`Stock: ${p.stock}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Inventory management ── */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5 mp-fade-up delay-250">
            {/* Form */}
            <div id="inv-form" className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#E6E6E6]">{editing?"Editando producto":"Agregar producto"}</p>
                {editing && <button onClick={resetForm} className="rounded-xl border border-[#2B2B30] bg-[#2B2B30] px-3 py-1.5 text-xs text-[#E6E6E6]/55 hover:text-[#E6E6E6] transition">Cancelar</button>}
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <input placeholder="Nombre *" value={name} onChange={e=>setName(e.target.value)} className={inp} />
                <input placeholder="Precio *" type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className={inp} />
                <input placeholder="Stock *" type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} className={inp} />
                <input placeholder="Stock mínimo" type="number" min="0" value={minStock} onChange={e=>setMinStock(e.target.value)} className={inp} />
                <input placeholder="SKU / Código" value={sku} onChange={e=>setSku(e.target.value)} className={inp} />
                <input placeholder="Número de serie" value={serial} onChange={e=>setSerial(e.target.value)} className={inp} />
                <input placeholder="Categoría" value={category} onChange={e=>setCategory(e.target.value)} className={inp} />
                <input placeholder="Marca" value={brand} onChange={e=>setBrand(e.target.value)} className={inp} />
                <input placeholder="Descripción" value={desc} onChange={e=>setDesc(e.target.value)} className={`${inp} sm:col-span-2 lg:col-span-3 xl:col-span-4`} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleSave}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 ${editing?"bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_4px_16px_rgba(16,185,129,0.22)]":"bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-[#0B0B0D] hover:shadow-[0_8px_24px_rgba(212,175,55,0.28)]"}`}>
                  {editing?"Guardar cambios":"Crear producto"}
                </button>
                <button onClick={exportInventory}
                  className="rounded-xl border border-blue-500/22 bg-blue-500/8 px-4 py-2.5 text-xs font-bold text-blue-300 transition hover:bg-blue-500/14 hover:-translate-y-0.5">
                  Exportar Excel
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-2.5 mb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 p-1">
                {(["all","low","out"] as const).map(tab=>{
                  const counts={all:filtered.length,low:filtered.filter(p=>Number(p.stock)>0&&Number(p.stock)<=(Number(p.min_stock||0)||5)).length,out:filtered.filter(p=>Number(p.stock)===0).length}
                  const labels={all:"Todos",low:"Bajo stock",out:"Agotados"}
                  return <button key={tab} onClick={()=>{setInvTab(tab);setInvPage(1)}} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${invTab===tab?"bg-[#D4AF37] text-[#0B0B0D]":"text-[#E6E6E6]/45 hover:text-[#E6E6E6]"}`}>{labels[tab]} ({counts[tab]})</button>
                })}
              </div>
              <div className="flex gap-2">
                <select value={invSort} onChange={e=>setInvSort(e.target.value as typeof invSort)} className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-3 py-2 text-xs text-[#E6E6E6] outline-none focus:border-[#D4AF37]/40">
                  <option value="name">Nombre A-Z</option>
                  <option value="stock_low">Stock ↑ bajo</option>
                  <option value="stock_high">Stock ↑ alto</option>
                  <option value="price_low">Precio ↑</option>
                  <option value="price_high">Precio ↓</option>
                </select>
                <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/60 px-3 py-2 text-xs text-[#E6E6E6] outline-none focus:border-[#D4AF37]/40">
                  {[25,50,100,200].map(n=><option key={n} value={n}>{n}/pág</option>)}
                </select>
              </div>
            </div>

            <input placeholder="Buscar por nombre, SKU, serie, categoría, marca..." value={search} onChange={e=>{setSearch(e.target.value);setInvPage(1)}} className={`${inp} mb-3`} />

            {/* Table */}
            {sortedInv.length===0 ? (
              <div className="rounded-xl border border-dashed border-[#2B2B30] p-10 text-center">
                <p className="text-[#E6E6E6]/35">Sin productos en esta vista</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#2B2B30]">
                {/* Sticky header */}
                <div className="sticky top-0 z-10 hidden xl:grid grid-cols-[minmax(0,2fr)_70px_60px_80px_90px_80px_80px_140px] gap-2 border-b border-[#2B2B30] bg-[#141418] px-4 py-2.5 text-[9px] uppercase tracking-[0.22em] text-[#E6E6E6]/30">
                  <p>Producto</p><p>SKU</p><p>Stock</p><p>Mín</p><p>Precio</p><p>Costo</p><p>Valor</p><p className="text-right">Acciones</p>
                </div>
                <div className="max-h-[520px] overflow-y-auto divide-y divide-[#2B2B30]/50">
                  {paginated.map(p=>(
                    <div key={p.id} className="mp-table-row grid gap-2 px-4 py-3 xl:grid-cols-[minmax(0,2fr)_70px_60px_80px_90px_80px_80px_140px] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-[#E6E6E6]">{p.name}</p>
                          {p.category && <span className="rounded-full border border-[#D4AF37]/14 bg-[#D4AF37]/7 px-1.5 py-0.5 text-[9px] text-[#D4AF37]/65">{p.category}</span>}
                          {p.brand && <span className="rounded-full border border-blue-400/14 bg-blue-400/7 px-1.5 py-0.5 text-[9px] text-blue-300/65">{p.brand}</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[#E6E6E6]/35">{p.description||p.serial_code||"—"}</p>
                      </div>
                      <p className="font-mono text-xs text-[#E6E6E6]/45">{p.sku||"—"}</p>
                      <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-bold ${Number(p.stock)===0?"bg-rose-500/14 text-rose-300":Number(p.stock)<=(Number(p.min_stock||0)||5)?"bg-amber-400/14 text-amber-300":"bg-[#2B2B30] text-[#E6E6E6]/65"}`}>{p.stock}</span>
                      <p className="text-xs text-[#E6E6E6]/40">{p.min_stock||"—"}</p>
                      <p className="text-sm font-bold text-[#D4AF37]">S/ {Number(p.price).toFixed(2)}</p>
                      <p className="text-xs text-[#E6E6E6]/45">S/ {Number(p.cost||0).toFixed(2)}</p>
                      <p className="text-xs text-[#E6E6E6]/45">S/ {(Number(p.price)*Number(p.stock)).toFixed(2)}</p>
                      <div className="flex gap-1.5 xl:justify-end">
                        <button onClick={()=>handleEdit(p)} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#0B0B0D] hover:bg-amber-400 transition hover:-translate-y-0.5">Editar</button>
                        <button onClick={()=>handleDelete(p.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-400 transition hover:-translate-y-0.5">Eliminar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pagination */}
            {sortedInv.length>pageSize && (
              <div className="mt-3 flex items-center justify-between border-t border-[#2B2B30] pt-3">
                <p className="text-xs text-[#E6E6E6]/35">{Math.min((safePage-1)*pageSize+1,sortedInv.length)}–{Math.min(safePage*pageSize,sortedInv.length)} de {sortedInv.length}</p>
                <div className="flex gap-2">
                  <button onClick={()=>setInvPage(p=>Math.max(1,p-1))} disabled={safePage<=1} className="rounded-lg border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs text-[#E6E6E6]/55 disabled:opacity-35 hover:text-[#E6E6E6] transition">← Ant</button>
                  <span className="rounded-lg border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs text-[#E6E6E6]/55">{safePage}/{totalPages}</span>
                  <button onClick={()=>setInvPage(p=>Math.min(totalPages,p+1))} disabled={safePage>=totalPages} className="rounded-lg border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs text-[#E6E6E6]/55 disabled:opacity-35 hover:text-[#E6E6E6] transition">Sig →</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Operational history ── */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5 mp-fade-up">
            <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-[#E6E6E6]">Historial operativo</p>
                <p className="text-xs text-[#E6E6E6]/38 mt-0.5">{filteredMv.length} movimiento(s) en el período</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([["today","Hoy"],["yesterday","Ayer"],["7days","7 días"],["30days","30 días"]] as const).map(([id,label])=>(
                  <button key={id} onClick={()=>setMvFilter(id)} className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${mvFilter===id?"border-[#D4AF37]/22 bg-[#D4AF37]/9 text-[#D4AF37]":"border-[#2B2B30] bg-[#141418] text-[#E6E6E6]/45 hover:text-[#E6E6E6]"}`}>{label}</button>
                ))}
                <button onClick={()=>businessId&&loadMovements(businessId)} className="rounded-xl border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs text-[#E6E6E6]/45 hover:text-[#E6E6E6] transition">↻</button>
              </div>
            </div>

            {filteredMv.length===0 ? (
              <div className="rounded-xl border border-dashed border-[#2B2B30] p-8 text-center">
                <p className="text-sm text-[#E6E6E6]/35">Sin movimientos en este período.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#2B2B30]">
                <div className="sticky top-0 hidden md:grid grid-cols-[100px_minmax(0,1fr)_110px_130px] gap-2 border-b border-[#2B2B30] bg-[#141418] px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] text-[#E6E6E6]/30">
                  <p>Tipo</p><p>Detalle</p><p>Usuario</p><p>Fecha</p>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-[#2B2B30]/50">
                  {filteredMv.map(m=>{
                    const actor = m.user_id?profiles[m.user_id]?.full_name||"Usuario":"Sistema"
                    const cfg:{[k:string]:{label:string;cls:string}} = {
                      created: {label:"Ingreso",  cls:"bg-[#D4AF37]/9 text-[#D4AF37] border-[#D4AF37]/14"},
                      updated: {label:"Edición",  cls:"bg-blue-500/9 text-blue-300 border-blue-400/14"},
                      sold:    {label:"Venta",    cls:"bg-emerald-500/9 text-emerald-300 border-emerald-400/14"},
                      deleted: {label:"Eliminado",cls:"bg-rose-500/9 text-rose-300 border-rose-400/14"},
                    }
                    const c = cfg[m.type] || {label:m.type,cls:"bg-[#2B2B30] text-[#E6E6E6]/45 border-[#2B2B30]"}
                    return (
                      <div key={m.id} className="mp-table-row grid gap-2 px-4 py-3 md:grid-cols-[100px_minmax(0,1fr)_110px_130px] md:items-center">
                        <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${c.cls}`}>{c.label}</span>
                        <div>
                          <p className="text-xs font-medium text-[#E6E6E6]">{m.note||"Movimiento"}</p>
                          <p className="text-[10px] text-[#E6E6E6]/35">Cantidad: {Number(m.quantity||0)}</p>
                        </div>
                        <p className="text-xs text-[#E6E6E6]/50">{actor}</p>
                        <p className="font-mono text-[10px] text-[#E6E6E6]/35">{isMounted?fmtDate(m.created_at)+" "+fmtTime(m.created_at).slice(0,5):"--"}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="py-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/18">Mahu Plexus · Conectamos ideas, creamos soluciones</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTrial && subInfo && (
        <TrialModal
          businessName={businessName}
          trialDays={3}
          onClose={()=>setShowTrial(false)}
        />
      )}

      {subInfo?.isBlockedPage && (
        <ExpiredWall status={subInfo.status as "expired"|"suspended"} businessName={businessName} />
      )}

      {loading && <LoadingScreen />}

      {showIntro && <LogoIntro onDone={() => setShowIntro(false)} />}
          <MobileNav active="dashboard" role={role as "owner" | "seller" | null} />

    </main>
  )
}
