"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabase"
import { MahuPlexusLogo } from "../components/Logo"
import { authRedirect } from "../lib/appUrl"
import { toast } from "../components/Toast"

// ── Animated Plexus canvas ────────────────────────────────────────
function PlexusCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let raf: number
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener("resize", resize)
    const N = 72, DIST = 150, SPEED = 0.3
    type P = { x:number; y:number; vx:number; vy:number; r:number; op:number }
    const pts: P[] = Array.from({length:N},()=>({
      x: Math.random()*canvas.width,  y: Math.random()*canvas.height,
      vx: (Math.random()-.5)*SPEED,   vy: (Math.random()-.5)*SPEED,
      r: Math.random()*1.8+.7,        op: Math.random()*.6+.15
    }))
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x<0||p.x>canvas.width) p.vx*=-1
        if (p.y<0||p.y>canvas.height) p.vy*=-1
      }
      for (let i=0;i<pts.length;i++) {
        for (let j=i+1;j<pts.length;j++) {
          const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y
          const d=Math.sqrt(dx*dx+dy*dy)
          if (d<DIST) {
            ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y)
            ctx.strokeStyle=`rgba(212,175,55,${(1-d/DIST)*.3})`; ctx.lineWidth=.9; ctx.stroke()
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=`rgba(212,175,55,${p.op})`; ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize) }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 z-0" style={{opacity:.55}} />
}

// ── Motivational messages ─────────────────────────────────────────
const MSGS = [
  "Gestiona tu negocio con precisión de élite.",
  "Control total. Resultados extraordinarios.",
  "Tecnología premium para negocios premium.",
  "Tu operación, reinventada.",
  "De la idea al resultado, sin fricción.",
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => { setMsgIdx(i => (i+1) % MSGS.length); setMsgVisible(true) }, 400)
    }, 4200)
    return () => clearInterval(interval)
  }, [])

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError("Completa todos los campos"); return }
    setLoading(true); setError(""); setNeedsVerification(false)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) {
        // Supabase returns a specific message when the email is not confirmed
        const msg = authError.message?.toLowerCase() || ""
        if (msg.includes("confirm") || msg.includes("verif")) {
          setError("Debes verificar tu correo antes de ingresar. Revisa tu bandeja de entrada.")
          setNeedsVerification(true)
        } else {
          setError("Credenciales incorrectas")
        }
        return
      }
      // Extra guard: block access if email is not confirmed
      const user = data?.user
      if (user && !user.email_confirmed_at && !user.confirmed_at) {
        await supabase.auth.signOut()
        setError("Tu correo aún no está verificado. Revisa tu bandeja de entrada.")
        setNeedsVerification(true)
        return
      }
      router.push("/dashboard")
    } catch { setError("Error de conexión. Intenta de nuevo.") }
    finally { setLoading(false) }
  }

  const handleResend = async () => {
    if (!email.trim() || !email.includes("@")) { toast.error("Ingresa tu correo primero"); return }
    setResending(true)
    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), redirect_to: authRedirect("/login") }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "No se pudo reenviar"); return }
      toast.info("Correo de verificación reenviado. Revisa tu bandeja.")
    } catch { toast.error("Error de conexión") }
    finally { setResending(false) }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0B0B0D]">
      {/* Multi-layer background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-60 -top-60 h-[700px] w-[700px] rounded-full bg-[#D4AF37]/5 blur-[160px]" />
        <div className="absolute -right-40 bottom-0 h-[600px] w-[600px] rounded-full bg-[#D4AF37]/4 blur-[180px]" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/3 blur-[200px]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(212,175,55,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.4)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <PlexusCanvas />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl">
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_430px]">

            {/* Left: brand */}
            <div className="hidden lg:block mp-fade-up">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/8 px-4 py-2 backdrop-blur-xl">
                <span className="mp-pulse-gold h-2 w-2 rounded-full bg-[#D4AF37]" />
                <span className="text-[10px] uppercase tracking-[0.38em] text-[#D4AF37]/75">Plataforma Premium · v3</span>
              </div>

              <h1 className="mt-8 text-[3.6rem] font-black leading-[1.03] tracking-tight text-[#E6E6E6]">
                Control total<br />
                <span className="mp-gold-text">de tu negocio.</span>
              </h1>

              {/* Rotating message */}
              <div className="mt-6 h-8 overflow-hidden">
                <p className={`text-lg text-[#E6E6E6]/55 font-medium transition-all duration-400 ${msgVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
                  {MSGS[msgIdx]}
                </p>
              </div>

              <p className="mt-4 max-w-md text-sm leading-7 text-[#E6E6E6]/35">
                Gestiona ventas, inventario y operaciones en una sola plataforma.
                Diseñada para negocios que exigen excelencia.
              </p>

              {/* Feature list */}
              <div className="mt-8 grid gap-2.5">
                {[
                  { icon: "◈", label: "Ventas ultra-rápidas con búsqueda instantánea" },
                  { icon: "◉", label: "Inventario empresarial en tiempo real" },
                  { icon: "◆", label: "Reportes PDF con un clic" },
                  { icon: "◇", label: "Integración Culqi para pagos online" },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-3 mp-fade-up" style={{animationDelay:"80ms"}}>
                    <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/8 text-[#D4AF37] text-xs">
                      {f.icon}
                    </div>
                    <span className="text-sm text-[#E6E6E6]/55">{f.label}</span>
                  </div>
                ))}
              </div>

              {/* Trusted by */}
              <div className="mt-10 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["A","B","C","D"].map(l => (
                    <div key={l} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#2B2B30] text-xs font-bold text-[#D4AF37]">{l}</div>
                  ))}
                </div>
                <p className="text-xs text-[#E6E6E6]/35">Cientos de negocios confían en Mahu Plexus</p>
              </div>
            </div>

            {/* Right: login card */}
            <div className="mp-fade-up delay-100">
              {/* Card */}
              <div className="relative overflow-hidden rounded-[28px] border border-[#D4AF37]/14 bg-[#141418]/88 p-7 shadow-[0_48px_120px_rgba(0,0,0,0.75)] backdrop-blur-3xl">
                {/* Glow inner */}
                <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
                {/* Top shimmer line */}
                <div className="absolute left-1/4 right-1/4 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/45 to-transparent" />

                <div className="relative">
                  {/* Logo */}
                  <div className="mb-7 flex flex-col items-center gap-3">
                    <div className="mp-logo-glow">
                      <MahuPlexusLogo size={46} showText />
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-[#D4AF37]/14 bg-[#D4AF37]/7 px-3.5 py-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="mp-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-65" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E6E6E6]/40">Acceso seguro · TLS</span>
                    </div>
                  </div>

                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-[#E6E6E6]">Iniciar sesión</h2>
                    <p className="mt-1.5 text-sm text-[#E6E6E6]/40">Bienvenido a tu panel de gestión</p>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#E6E6E6]/30">
                        Correo electrónico
                      </label>
                      <input
                        type="email" placeholder="correo@ejemplo.com"
                        value={email} onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key==="Enter" && handleLogin()}
                        autoComplete="email"
                        className="mp-input"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#E6E6E6]/30">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showPass ? "text" : "password"} placeholder="Tu contraseña"
                          value={password} onChange={e => setPassword(e.target.value)}
                          onKeyDown={e => e.key==="Enter" && handleLogin()}
                          autoComplete="current-password"
                          className="mp-input pr-11"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#E6E6E6]/30 hover:text-[#E6E6E6]/60 transition">
                          {showPass
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="flex items-center gap-2 rounded-xl border border-rose-500/22 bg-rose-500/8 px-3.5 py-2.5">
                        <span className="text-sm text-rose-400 font-semibold">!</span>
                        <p className="text-xs text-rose-300">{error}</p>
                      </div>
                    )}

                    {needsVerification && (
                      <button onClick={handleResend} disabled={resending}
                        className="w-full rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/8 py-2.5 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/14 disabled:opacity-60">
                        {resending ? "Reenviando..." : "Reenviar correo de verificación"}
                      </button>
                    )}

                    {/* CTA */}
                    <button onClick={handleLogin} disabled={loading}
                      className="relative mt-1 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#E4C04A] to-[#B8960C] py-3.5 text-[15px] font-black text-[#0B0B0D] shadow-[0_8px_36px_rgba(212,175,55,0.22)] transition hover:shadow-[0_14px_48px_rgba(212,175,55,0.38)] hover:scale-[1.015] active:scale-[0.99] disabled:opacity-55 disabled:cursor-not-allowed disabled:hover:scale-100">
                      {loading ? (
                        <span className="flex items-center justify-center gap-2.5">
                          <span className="mp-spin h-4 w-4 rounded-full border-2 border-[#0B0B0D]/25 border-t-[#0B0B0D]" />
                          Verificando acceso...
                        </span>
                      ) : "Entrar al sistema"}
                      {/* Shimmer overlay */}
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                    </button>
                  </div>

                  {/* Security badge */}
                  <div className="mt-6 border-t border-[#2B2B30] pt-5">
                    <div className="flex items-center justify-center gap-6">
                      {[["🔒","SSL/TLS"], ["🛡","Datos seguros"], ["⚡","99.9% uptime"]].map(([icon, label]) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <span className="text-base">{icon}</span>
                          <span className="text-[9px] text-[#E6E6E6]/30 uppercase tracking-widest">{label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-center text-[10px] uppercase tracking-[0.35em] text-[#E6E6E6]/18">
                      Mahu Plexus · Conectamos ideas, creamos soluciones
                    </p>
                  </div>
                </div>
              </div>

              {/* Below-card links */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <a href="/forgot-password" className="text-xs text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">
                    ¿Olvidaste tu contraseña?
                  </a>
                  <a href="https://wa.me/51964271242?text=Hola%2C%20necesito%20ayuda%20con%20Mahu%20Plexus" target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">
                    ¿Necesitas ayuda?
                  </a>
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-[#2B2B30] bg-[#141418]/60 px-4 py-3">
                  <span className="text-xs text-[#E6E6E6]/35">¿No tienes cuenta?</span>
                  <a href="/register" className="text-xs font-bold text-[#D4AF37] hover:text-[#E8C84A] transition">
                    Crear cuenta gratis →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
