"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MahuPlexusLogo } from "../components/Logo"
import { toast } from "../components/Toast"
import { authRedirect } from "../lib/appUrl"

export default function RegisterPage() {
  const router = useRouter()
  const [firstName,   setFirstName]   = useState("")
  const [lastName,    setLastName]    = useState("")
  const [businessName,setBusiness]    = useState("")
  const [email,       setEmail]       = useState("")
  const [phone,       setPhone]       = useState("")
  const [dni,         setDni]         = useState("")
  const [password,    setPassword]    = useState("")
  const [confirm,     setConfirm]     = useState("")
  const [showPass,    setShowPass]    = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [errors,      setErrors]      = useState<Record<string,string>>({})
  const [done,        setDone]        = useState(false)

  const validate = () => {
    const e: Record<string,string> = {}
    if (!firstName.trim()) e.firstName = "El nombre es obligatorio"
    if (!lastName.trim())  e.lastName  = "El apellido es obligatorio"
    if (!businessName.trim()) e.businessName = "El nombre del negocio es obligatorio"
    if (!email.trim() || !email.includes("@")) e.email = "Correo inválido"
    if (phone && !/^[0-9+\s-]{6,15}$/.test(phone)) e.phone = "Teléfono inválido"
    if (dni && !/^[0-9]{8}$/.test(dni)) e.dni = "El DNI debe tener 8 dígitos"
    if (password.length < 6) e.password = "Mínimo 6 caracteres"
    if (password !== confirm) e.confirm = "Las contraseñas no coinciden"
    if (!acceptTerms) e.terms = "Debes aceptar los Términos y Condiciones"
    if (!acceptPrivacy) e.privacy = "Debes aceptar la Política de Privacidad"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) { toast.error("Revisa los campos marcados"); return }
    setLoading(true)
    try {
      const redirectTo = authRedirect("/login")
      const res = await fetch("/api/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          dni: dni.trim(),
          password,
          business_name: businessName.trim(),
          require_verification: true,
          redirect_to: redirectTo,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Error al crear la cuenta"); return }

      // Email verification required — show confirmation screen, do NOT auto-login
      setDone(true)
      toast.create("Cuenta creada. Revisa tu correo para verificar.")
    } catch { toast.error("Error de conexión") }
    finally { setLoading(false) }
  }

  const inp = (field: string) =>
    `w-full rounded-xl border ${errors[field] ? "border-rose-500/50 bg-rose-500/5" : "border-[#2B2B30] bg-[#0B0B0D]/55"} px-4 py-3 text-sm text-[#E6E6E6] outline-none transition placeholder:text-[#E6E6E6]/22 focus:border-[#D4AF37]/45 focus:bg-[#0B0B0D]/75`

  if (done) {
    return (
      <main className="min-h-screen bg-[#0B0B0D] flex items-center justify-center px-4">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/6 blur-[160px]" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mb-8 flex justify-center"><MahuPlexusLogo size={48} showText /></div>
          <div className="rounded-[28px] border border-[#D4AF37]/14 bg-[#141418]/90 p-8 shadow-[0_40px_100px_rgba(0,0,0,0.7)] backdrop-blur-3xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4z" stroke="none"/><path d="M22 6l-10 7L2 6" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="4" width="20" height="16" rx="2" stroke="#D4AF37" strokeWidth="2"/></svg>
            </div>
            <h1 className="text-2xl font-black text-[#E6E6E6] mb-2">Verifica tu correo</h1>
            <p className="text-sm text-[#E6E6E6]/55 leading-relaxed mb-6">
              Hemos enviado un enlace de verificación a <strong className="text-[#D4AF37]">{email}</strong>.
              Debes confirmar tu correo antes de poder iniciar sesión.
            </p>
            <div className="rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 p-4 mb-6 text-left">
              <p className="text-xs text-[#E6E6E6]/45 leading-relaxed">
                <strong className="text-[#E6E6E6]/70">Siguiente paso:</strong> abre el correo, haz clic en el enlace de confirmación y regresa para iniciar sesión. Revisa también tu carpeta de spam.
              </p>
            </div>
            <Link href="/login" className="block w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-sm font-black text-[#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(212,175,55,0.3)]">
              Ir a iniciar sesión
            </Link>
          </div>
          <p className="mt-4 text-xs text-[#E6E6E6]/30">
            ¿No recibiste el correo? <a href="https://wa.me/51964271242" target="_blank" rel="noopener noreferrer" className="text-[#D4AF37]/65 hover:text-[#D4AF37]">Contáctanos</a>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0B0B0D] flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-[#D4AF37]/5 blur-[140px]" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-[#D4AF37]/4 blur-[160px]" />
        <div className="absolute inset-0 opacity-[0.02] [background-image:linear-gradient(rgba(212,175,55,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.4)_1px,transparent_1px)] [background-size:56px_56px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-7 flex flex-col items-center gap-3">
          <Link href="/landing"><MahuPlexusLogo size={46} showText /></Link>
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/22 bg-emerald-500/8 px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80">3 días gratis · Sin tarjeta</span>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#D4AF37]/12 bg-[#141418]/88 p-7 shadow-[0_40px_100px_rgba(0,0,0,0.7)] backdrop-blur-3xl">
          <h1 className="mb-1.5 text-2xl font-black text-[#E6E6E6]">Crear cuenta</h1>
          <p className="mb-6 text-sm text-[#E6E6E6]/40">Empieza tu prueba gratuita de 3 días hoy mismo.</p>

          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input placeholder="Nombre *" value={firstName} onChange={e=>setFirstName(e.target.value)} className={inp("firstName")} />
                {errors.firstName && <p className="mt-1 text-[10px] text-rose-400">{errors.firstName}</p>}
              </div>
              <div>
                <input placeholder="Apellidos *" value={lastName} onChange={e=>setLastName(e.target.value)} className={inp("lastName")} />
                {errors.lastName && <p className="mt-1 text-[10px] text-rose-400">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <input placeholder="Nombre de tu negocio *" value={businessName} onChange={e=>setBusiness(e.target.value)} className={inp("businessName")} />
              {errors.businessName && <p className="mt-1 text-[10px] text-rose-400">{errors.businessName}</p>}
            </div>

            <div>
              <input type="email" placeholder="Correo electrónico *" value={email} onChange={e=>setEmail(e.target.value)} className={inp("email")} />
              {errors.email && <p className="mt-1 text-[10px] text-rose-400">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input placeholder="Teléfono" value={phone} onChange={e=>setPhone(e.target.value)} className={inp("phone")} />
                {errors.phone && <p className="mt-1 text-[10px] text-rose-400">{errors.phone}</p>}
              </div>
              <div>
                <input placeholder="DNI" value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g,"").slice(0,8))} maxLength={8} className={inp("dni")} />
                {errors.dni && <p className="mt-1 text-[10px] text-rose-400">{errors.dni}</p>}
              </div>
            </div>

            <div>
              <div className="relative">
                <input type={showPass?"text":"password"} placeholder="Contraseña * (mín. 6 caracteres)" value={password} onChange={e=>setPassword(e.target.value)} className={`${inp("password")} pr-11`} />
                <button type="button" onClick={()=>setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#E6E6E6]/30 hover:text-[#E6E6E6]/60 transition">
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  }
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[10px] text-rose-400">{errors.password}</p>}
            </div>

            <div>
              <input type="password" placeholder="Confirmar contraseña *" value={confirm} onChange={e=>setConfirm(e.target.value)} className={inp("confirm")} />
              {errors.confirm && <p className="mt-1 text-[10px] text-rose-400">{errors.confirm}</p>}
            </div>

            {/* Legal checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#2B2B30] bg-[#0B0B0D] accent-[#D4AF37] cursor-pointer" />
                <span className="text-xs text-[#E6E6E6]/55 leading-relaxed">
                  He leído y acepto los{" "}
                  <Link href="/terms" target="_blank" className="text-[#D4AF37] hover:underline">Términos y Condiciones</Link>
                </span>
              </label>
              {errors.terms && <p className="text-[10px] text-rose-400 ml-6">{errors.terms}</p>}

              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={acceptPrivacy} onChange={e=>setAcceptPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#2B2B30] bg-[#0B0B0D] accent-[#D4AF37] cursor-pointer" />
                <span className="text-xs text-[#E6E6E6]/55 leading-relaxed">
                  He leído y acepto la{" "}
                  <Link href="/privacy" target="_blank" className="text-[#D4AF37] hover:underline">Política de Privacidad</Link>
                </span>
              </label>
              {errors.privacy && <p className="text-[10px] text-rose-400 ml-6">{errors.privacy}</p>}
            </div>

            <button onClick={handleRegister} disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-[15px] font-black text-[#0B0B0D] shadow-[0_8px_32px_rgba(212,175,55,0.22)] transition hover:shadow-[0_14px_44px_rgba(212,175,55,0.36)] hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="h-4 w-4 rounded-full border-2 border-[#0B0B0D]/25 border-t-[#0B0B0D] animate-spin" />
                  Creando cuenta...
                </span>
              ) : "Crear cuenta gratis"}
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link href="/login" className="text-sm text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
          <a href="https://wa.me/51964271242" target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#E6E6E6]/40 hover:text-[#D4AF37] transition">
            ¿Necesitas ayuda?
          </a>
        </div>
      </div>
    </main>
  )
}
