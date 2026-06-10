"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { toast } from "../components/Toast"
import { authRedirect } from "../lib/appUrl"
import { getSubscriptionInfo, type SubscriptionInfo } from "../lib/subscription"

type Seller = { id:string; email?:string|null; full_name?:string|null; role?:string|null; active?:boolean|null }

export default function SellersPage() {
  const router = useRouter()

  const [businessId,       setBId]       = useState<string|null>(null)
  const [ownerId,          setOwnerId]   = useState<string|null>(null)
  const [role,             setRole]      = useState<string|null>(null)
  const [subInfo,          setSubInfo]   = useState<SubscriptionInfo|null>(null)
  const [fullName,         setFullName]  = useState("")
  const [email,            setEmail]     = useState("")
  const [password,         setPassword]  = useState("123456")
  const [loading,          setLoading]   = useState(false)
  const [pageLoading,      setPageLoad]  = useState(true)
  const [sellers,          setSellers]   = useState<Seller[]>([])
  const [editingId,        setEditId]    = useState<string|null>(null)
  const [editingName,      setEditName]  = useState("")

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setOwnerId(user.id)

      const { data: p } = await supabase.from("profiles").select("business_id,role").eq("id",user.id).single()
      if (!p) { toast.error("No se pudo cargar el perfil"); return }
      if (p.role !== "owner") { router.push("/sales"); return }

      setBId(p.business_id)
      setRole(p.role)

      if (p.business_id) {
        const [info] = await Promise.all([
          getSubscriptionInfo(p.business_id),
          loadSellers(p.business_id),
        ])
        setSubInfo(info)
      }
      setTimeout(() => setPageLoad(false), 350)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadSellers = async (bId: string) => {
    const { data, error } = await supabase
      .from("profiles").select("id,email,full_name,role,active")
      .eq("business_id", bId).eq("role","seller").order("id",{ascending:false})
    if (error) { toast.error(error.message||"Error al cargar vendedores"); return }
    setSellers(data||[])
  }

  const handleCreate = async () => {
    if (!businessId||!ownerId) { toast.error("No se pudo identificar el negocio"); return }
    if (!email||!password)     { toast.error("Completa correo y contraseña"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/create-seller",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:fullName,email,password,business_id:businessId,owner_id:ownerId})})
      const data = await res.json()
      if (!res.ok) { toast.error(data.error||"No se pudo crear el vendedor"); return }
      toast.create("Vendedor creado correctamente")
      setFullName(""); setEmail(""); setPassword("123456")
      await loadSellers(businessId)
    } catch { toast.error("Error de conexión") }
    finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!businessId) return
    if (!confirm("¿Eliminar este vendedor? Esta acción no se puede deshacer.")) return
    const res = await fetch("/api/delete-seller",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})})
    const data = await res.json()
    if (!res.ok) { toast.error(data.error||"No se pudo eliminar"); return }
    toast.delete("Vendedor eliminado")
    await loadSellers(businessId)
  }

  const handleToggle = async (id: string, nextActive: boolean) => {
    if (!businessId) return
    const res = await fetch("/api/toggle-seller",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,active:nextActive})})
    const data = await res.json()
    if (!res.ok) { toast.error(data.error||"Error al actualizar"); return }
    toast.update(nextActive?"Vendedor activado":"Vendedor desactivado")
    await loadSellers(businessId)
  }

  const handleUpdate = async (id: string) => {
    if (!businessId) return
    const res = await fetch("/api/update-seller",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,full_name:editingName})})
    const data = await res.json()
    if (!res.ok) { toast.error(data.error||"Error al actualizar"); return }
    toast.update("Vendedor actualizado")
    setEditId(null); setEditName("")
    await loadSellers(businessId)
  }

  const handleReset = async (sellerEmail?: string|null) => {
    if (!sellerEmail) { toast.error("Sin correo registrado"); return }
    const { error } = await supabase.auth.resetPasswordForEmail(sellerEmail,{redirectTo:authRedirect("/login")})
    if (error) { toast.error("No se pudo enviar el correo"); return }
    toast.info("Correo de recuperación enviado")
  }

  const inp = "mp-input"

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/3 blur-[140px]" />
      </div>

      <Sidebar activePage="sellers" role="owner" subStatus={subInfo?.status} subEndsAt={subInfo?.trialEndsAt||subInfo?.currentPeriodEnd} />

      <div className="relative z-10 xl:ml-64">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/90 px-5 py-4 backdrop-blur-2xl md:px-8">
          <h1 className="text-xl font-bold text-[#E6E6E6]">Vendedores</h1>
          <p className="mt-0.5 text-xs text-[#E6E6E6]/40">Gestión de equipo de ventas</p>
        </header>

        <div className="px-5 py-6 md:px-8 space-y-5 pb-28 xl:pb-6">
          {/* Create */}
          <div className="rounded-2xl border border-[#D4AF37]/14 bg-[#141418]/60 p-5">
            <p className="mb-1 text-sm font-bold text-[#E6E6E6]">Nuevo vendedor</p>
            <p className="mb-4 text-xs text-[#E6E6E6]/40">Los vendedores acceden solo a Ventas. El dueño controla el equipo completo.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <input placeholder="Nombre completo" value={fullName} onChange={e=>setFullName(e.target.value)} className={inp} />
              <input placeholder="Correo electrónico *" type="email" value={email} onChange={e=>setEmail(e.target.value)} className={inp} />
              <input placeholder="Contraseña inicial *" value={password} onChange={e=>setPassword(e.target.value)} className={inp} />
            </div>
            <button onClick={handleCreate} disabled={loading}
              className="mt-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-5 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,175,55,0.28)] disabled:opacity-60">
              {loading?"Creando...":"Crear vendedor"}
            </button>
          </div>

          {/* List */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-[#E6E6E6]">Equipo de ventas</p>
              <span className="rounded-xl border border-[#2B2B30] px-2.5 py-1 text-[10px] text-[#E6E6E6]/38">{sellers.length} vendedor(es)</span>
            </div>

            {sellers.length===0 ? (
              <div className="rounded-xl border border-dashed border-[#2B2B30] p-10 text-center">
                <p className="text-sm text-[#E6E6E6]/38">Sin vendedores registrados</p>
                <p className="mt-1 text-xs text-[#E6E6E6]/22">Crea el primero arriba</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {sellers.map(seller => (
                  <div key={seller.id} className="rounded-2xl border border-[#2B2B30] bg-[#0B0B0D]/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#D4AF37]/14 bg-[#D4AF37]/8 text-sm font-black text-[#D4AF37]">
                            {(seller.full_name||seller.email||"V").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            {editingId===seller.id ? (
                              <input value={editingName} onChange={e=>setEditName(e.target.value)} className="rounded-lg border border-[#D4AF37]/28 bg-[#0B0B0D]/60 px-3 py-1.5 text-sm text-[#E6E6E6] outline-none w-full" />
                            ) : (
                              <p className="truncate text-sm font-semibold text-[#E6E6E6]">{seller.full_name||"Sin nombre"}</p>
                            )}
                            <p className="truncate text-xs text-[#E6E6E6]/38">{seller.email||"-"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${seller.active===false?"bg-rose-500/14 text-rose-300":"bg-emerald-500/14 text-emerald-300"}`}>
                            {seller.active===false?"Inactivo":"Activo"}
                          </span>
                          <span className="rounded-full border border-[#D4AF37]/14 bg-[#D4AF37]/7 px-2 py-0.5 text-[10px] font-medium text-[#D4AF37]/65">Vendedor</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {editingId===seller.id ? (
                          <>
                            <button onClick={()=>handleUpdate(seller.id)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-400">Guardar</button>
                            <button onClick={()=>{setEditId(null);setEditName("")}} className="rounded-lg border border-[#2B2B30] bg-[#2B2B30] px-3 py-1.5 text-xs font-bold text-[#E6E6E6]/55 transition hover:text-[#E6E6E6]">Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={()=>{setEditId(seller.id);setEditName(seller.full_name||"")}} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-[#0B0B0D] transition hover:bg-amber-400">Editar</button>
                            <button onClick={()=>handleReset(seller.email)} className="rounded-lg border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs font-bold text-[#E6E6E6]/55 transition hover:text-[#E6E6E6]">Reset pw</button>
                            <button onClick={()=>handleToggle(seller.id,seller.active===false)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${seller.active===false?"bg-emerald-500 text-white hover:bg-emerald-400":"bg-orange-500 text-white hover:bg-orange-400"}`}>
                              {seller.active===false?"Activar":"Pausar"}
                            </button>
                            <button onClick={()=>handleDelete(seller.id)} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-400">Eliminar</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/18">Mahu Plexus · Conectamos ideas, creamos soluciones</p>
          </div>
        </div>
      </div>

      {pageLoading && <LoadingScreen message="Cargando vendedores..." />}
          <MobileNav active="sellers" role={role as "owner" | "seller" | null} />

    </main>
  )
}
