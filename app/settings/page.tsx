"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { Sidebar } from "../components/Sidebar"
import { LoadingScreen } from "../components/LoadingScreen"
import { MobileNav } from "../components/MobileNav"
import { toast } from "../components/Toast"
import { getSubscriptionInfo, type SubscriptionInfo } from "../lib/subscription"

export default function SettingsPage() {
  const router = useRouter()

  const [businessId, setBId]    = useState<string|null>(null)
  const [name,       setName]   = useState("")
  const [phone,      setPhone]  = useState("")
  const [address,    setAddr]   = useState("")
  const [footer,     setFooter] = useState("")
  const [logoUrl,    setLogo]   = useState("")
  const [loading,    setLoad]   = useState(false)
  const [pageLoad,   setPageL]  = useState(true)
  const [subInfo,    setSubInfo] = useState<SubscriptionInfo|null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: p } = await supabase.from("profiles").select("business_id,role").eq("id",user.id).single()
      if (!p?.business_id) { toast.error("No se pudo cargar el perfil"); return }
      if (p.role !== "owner") { router.push("/sales"); return }

      setBId(p.business_id)

      const [biz, info] = await Promise.all([
        supabase.from("businesses").select("name,phone,address,receipt_footer,logo_url").eq("id",p.business_id).single(),
        getSubscriptionInfo(p.business_id),
      ])
      if (biz.error) { toast.error("No se pudo cargar la tienda"); return }
      if (biz.data) {
        setName(biz.data.name||""); setPhone(biz.data.phone||"")
        setAddr(biz.data.address||""); setFooter(biz.data.receipt_footer||"")
        setLogo(biz.data.logo_url||"")
      }
      setSubInfo(info)
      setTimeout(() => setPageL(false), 350)
    })()
  }, [router])

  const handleUpload = async (file: File) => {
    try {
      if (!businessId) return null
      const ext = file.name.split(".").pop()?.toLowerCase()||"png"
      const path = `public/${businessId}_${Date.now()}.${ext}`
      const { error: up } = await supabase.storage.from("logos").upload(path,file,{cacheControl:"3600",upsert:true})
      if (up) { toast.error("Error subiendo imagen"); return null }
      const { data } = supabase.storage.from("logos").getPublicUrl(path)
      return data.publicUrl
    } catch { toast.error("Error subiendo imagen"); return null }
  }

  const handleSave = async () => {
    if (!businessId) return
    setLoad(true)
    const { error } = await supabase.from("businesses").update({name,phone,address,receipt_footer:footer,logo_url:logoUrl||null}).eq("id",businessId)
    setLoad(false)
    if (error) toast.error("Error al guardar: " + error.message)
    else toast.update("Configuración guardada")
  }

  const inp = "mp-input"

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/3 blur-[160px]" />
      </div>

      <Sidebar activePage="settings" role="owner" subStatus={subInfo?.status} subEndsAt={subInfo?.trialEndsAt||subInfo?.currentPeriodEnd} />

      <div className="relative z-10 xl:ml-64">
        <header className="sticky top-0 z-30 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/90 px-5 py-4 backdrop-blur-2xl md:px-8">
          <h1 className="text-xl font-bold text-[#E6E6E6]">Configuración</h1>
          <p className="mt-0.5 text-xs text-[#E6E6E6]/40">Datos de tu negocio y personalización</p>
        </header>

        <div className="px-5 py-6 md:px-8 space-y-5 pb-28 xl:pb-6">
          {/* Business info */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
            <p className="mb-4 text-sm font-bold text-[#E6E6E6]">Datos del negocio</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input placeholder="Nombre del negocio" value={name} onChange={e=>setName(e.target.value)} className={inp} />
              <input placeholder="Teléfono" value={phone} onChange={e=>setPhone(e.target.value)} className={inp} />
              <input placeholder="Dirección" value={address} onChange={e=>setAddr(e.target.value)} className={`${inp} md:col-span-2`} />
              <textarea placeholder="Texto pie de página del comprobante" value={footer} onChange={e=>setFooter(e.target.value)} rows={3} className={`${inp} md:col-span-2 resize-none`} />
            </div>
          </div>

          {/* Logo */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
            <p className="mb-1 text-sm font-bold text-[#E6E6E6]">Logo del negocio</p>
            <p className="mb-4 text-xs text-[#E6E6E6]/40">Aparece en comprobantes y reportes PDF</p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {logoUrl ? (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#D4AF37]/18 bg-[#0B0B0D]/60 p-2 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-[#2B2B30] shrink-0">
                  <span className="text-[10px] text-[#E6E6E6]/22 text-center">Sin logo</span>
                </div>
              )}
              <div>
                <label className="cursor-pointer rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/7 px-4 py-2.5 text-xs font-bold text-[#D4AF37] hover:bg-[#D4AF37]/12 transition inline-block">
                  Subir imagen
                  <input type="file" accept="image/*" className="hidden" onChange={async e=>{
                    const f=e.target.files?.[0]; if (!f) return
                    const url=await handleUpload(f); if (url) setLogo(url)
                  }} />
                </label>
                {logoUrl && <button onClick={()=>setLogo("")} className="ml-3 text-xs text-rose-400 hover:text-rose-300 transition">Quitar</button>}
                <p className="mt-2 text-[10px] text-[#E6E6E6]/28">PNG, JPG o WebP · Máx 2MB</p>
              </div>
            </div>
          </div>

          {/* Subscription link */}
          <div className="rounded-2xl border border-[#D4AF37]/14 bg-[#D4AF37]/4 p-5">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/9 text-[#D4AF37]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#D4AF37]">Suscripción activa</p>
                <p className="mt-1 text-xs text-[#E6E6E6]/45 leading-relaxed">
                  Plan: {subInfo?.plan||"trial"} · Planes de pago con Culqi estarán disponibles próximamente.
                </p>
                <a href="/subscription" className="mt-1.5 inline-block text-xs text-[#D4AF37] hover:underline">Ver planes →</a>
              </div>
            </div>
          </div>

          <button onClick={handleSave} disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_8px_24px_rgba(16,185,129,0.28)] disabled:opacity-60">
            {loading?"Guardando...":"Guardar configuración"}
          </button>

          <div className="py-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/18">Mahu Plexus · Conectamos ideas, creamos soluciones</p>
          </div>
        </div>
      </div>

      {pageLoad && <LoadingScreen message="Cargando configuración..." />}
          <MobileNav active="settings" role="owner" />

    </main>
  )
}
