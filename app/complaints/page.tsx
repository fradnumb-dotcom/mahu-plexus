"use client"

import { useState } from "react"
import Link from "next/link"

type ComplaintType = "queja" | "reclamo"
type FormState = "idle" | "loading" | "success" | "error"

const LegalLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-[#E6E6E6]/35 hover:text-[#D4AF37] transition text-xs">{label}</Link>
)

export default function ComplaintsPage() {
  const [type,       setType]       = useState<ComplaintType>("reclamo")
  const [name,       setName]       = useState("")
  const [email,      setEmail]      = useState("")
  const [phone,      setPhone]      = useState("")
  const [docNumber,  setDocNumber]  = useState("")
  const [orderId,    setOrderId]    = useState("")
  const [detail,     setDetail]     = useState("")
  const [action,     setAction]     = useState("")
  const [formState,  setFormState]  = useState<FormState>("idle")
  const [ticketId,   setTicketId]   = useState("")
  const [errorMsg,   setErrorMsg]   = useState("")

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !detail.trim()) {
      setErrorMsg("Nombre, correo y descripción son obligatorios.")
      return
    }
    if (!email.includes("@")) {
      setErrorMsg("Ingresa un correo electrónico válido.")
      return
    }
    setErrorMsg("")
    setFormState("loading")

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             name.trim(),
          email:            email.trim().toLowerCase(),
          phone:            phone.trim() || null,
          document_number:  docNumber.trim() || null,
          order_id:         orderId.trim() || null,
          complaint_type:   type,
          description:      detail.trim(),
          requested_action: action.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || "Error al enviar"); setFormState("error"); return }

      const id = data.id || `MP-${Date.now().toString(36).toUpperCase()}`
      setTicketId(id)
      setFormState("success")
    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.")
      setFormState("error")
    }
  }

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setDocNumber(""); setOrderId("")
    setDetail(""); setAction(""); setTicketId(""); setErrorMsg("")
    setFormState("idle")
  }

  const inp = "w-full rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/55 px-4 py-3 text-sm text-[#E6E6E6] outline-none transition placeholder:text-[#E6E6E6]/22 focus:border-[#D4AF37]/45 focus:bg-[#0B0B0D]/75"

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]" style={{ fontFamily: "'Poppins',sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-[#2B2B30]/60 bg-[#0B0B0D]/94 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/landing">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 34, width: "auto" }} />
          </Link>
          <Link href="/landing" className="text-sm text-[#E6E6E6]/45 hover:text-[#D4AF37] transition">← Inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]/70">Atención al Cliente</span>
          <h1 className="mt-2 text-3xl font-black text-[#E6E6E6]">Libro de Reclamaciones</h1>
          <p className="mt-2 text-sm text-[#E6E6E6]/45">
            Conforme al Código de Protección y Defensa del Consumidor (Ley N.° 29571), ponemos a tu disposición nuestro Libro de Reclamaciones digital.
          </p>
        </div>

        {/* Info boxes */}
        <div className="grid gap-4 mb-8 md:grid-cols-3">
          {[
            { icon: "📋", title: "Queja", desc: "Malestar por atención o servicio sin afectación económica directa." },
            { icon: "⚠️", title: "Reclamo", desc: "Disconformidad con un producto o servicio con posible afectación económica." },
            { icon: "⏱", title: "Tiempo de respuesta", desc: "Nos comprometemos a responder en un máximo de 15 días hábiles." },
          ].map(b => (
            <div key={b.title} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-4 text-center">
              <span className="text-2xl">{b.icon}</span>
              <p className="mt-2 text-sm font-bold text-[#E6E6E6]">{b.title}</p>
              <p className="mt-1 text-xs text-[#E6E6E6]/45 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {formState === "success" ? (
          /* Success state */
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-black text-[#E6E6E6] mb-2">Reclamo registrado correctamente</h2>
            <p className="text-sm text-[#E6E6E6]/55 mb-4 leading-relaxed">
              Tu reclamación ha sido recibida y registrada. Nos pondremos en contacto contigo en un plazo máximo de <strong className="text-[#D4AF37]">15 días hábiles</strong>.
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-5 py-2.5 mb-6">
              <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]/70">Número de ticket</span>
              <span className="text-base font-black text-[#D4AF37]">{ticketId}</span>
            </div>
            <p className="text-xs text-[#E6E6E6]/35 mb-6">Guarda este número como comprobante de tu reclamación.</p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button onClick={resetForm}
                className="rounded-xl border border-[#2B2B30] bg-[#2B2B30] px-5 py-2.5 text-sm font-semibold text-[#E6E6E6]/70 hover:text-[#E6E6E6] transition">
                Nueva reclamación
              </button>
              <Link href="/landing"
                className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-5 py-2.5 text-sm font-bold text-[#0B0B0D] transition hover:-translate-y-0.5">
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          /* Form */
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/65 p-6 md:p-8">
            <h2 className="text-base font-bold text-[#E6E6E6] mb-5">Datos de la reclamación</h2>

            {/* Type selector */}
            <div className="mb-5">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.28em] text-[#E6E6E6]/35">
                Tipo de reclamación *
              </label>
              <div className="flex gap-3">
                {(["queja", "reclamo"] as ComplaintType[]).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    className={`flex-1 rounded-xl border py-3 text-sm font-semibold capitalize transition ${
                      type === t
                        ? "border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37]"
                        : "border-[#2B2B30] bg-[#0B0B0D]/40 text-[#E6E6E6]/45 hover:text-[#E6E6E6]"
                    }`}>
                    {t === "queja" ? "📋 Queja" : "⚠️ Reclamo"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Personal data */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Nombre completo *</label>
                <input placeholder="Tu nombre y apellido" value={name} onChange={e => setName(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Correo electrónico *</label>
                <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Teléfono / WhatsApp</label>
                <input placeholder="+51 9XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">DNI / RUC</label>
                <input placeholder="Número de documento" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inp} />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">N.° de orden / suscripción (si aplica)</label>
                <input placeholder="ID de orden o suscripción" value={orderId} onChange={e => setOrderId(e.target.value)} className={inp} />
              </div>

              {/* Complaint detail */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">
                  Descripción detallada de la {type} *
                </label>
                <textarea
                  placeholder={`Describe con detalle el motivo de tu ${type}, qué ocurrió, cuándo y cómo afectó el servicio...`}
                  value={detail} onChange={e => setDetail(e.target.value)}
                  rows={5}
                  className={`${inp} resize-none`}
                />
                <p className="mt-1 text-[10px] text-[#E6E6E6]/28">{detail.length}/1000 caracteres</p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">
                  Acción solicitada (opcional)
                </label>
                <textarea
                  placeholder="¿Qué solución o acción esperas de nuestra parte?"
                  value={action} onChange={e => setAction(e.target.value)}
                  rows={3}
                  className={`${inp} resize-none`}
                />
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/22 bg-rose-500/8 px-4 py-3">
                <span className="text-rose-400 font-bold text-sm">!</span>
                <p className="text-xs text-rose-300">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#E6E6E6]/28 leading-relaxed max-w-xs">
                Al enviar, aceptas que procesemos tu información para atender tu reclamación conforme a nuestra{" "}
                <Link href="/privacy" className="text-[#D4AF37]/65 hover:text-[#D4AF37] underline">Política de Privacidad</Link>.
              </p>
              <button onClick={handleSubmit} disabled={formState === "loading"}
                className="shrink-0 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-7 py-3 text-sm font-black text-[#0B0B0D] shadow-[0_8px_24px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(212,175,55,0.35)] disabled:opacity-60 disabled:cursor-not-allowed">
                {formState === "loading" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-[#0B0B0D]/25 border-t-[#0B0B0D] animate-spin" />
                    Enviando...
                  </span>
                ) : `Registrar ${type}`}
              </button>
            </div>
          </div>
        )}

        {/* Alternative contact */}
        <div className="mt-8 rounded-2xl border border-[#2B2B30] bg-[#141418]/50 p-5">
          <p className="text-sm font-semibold text-[#E6E6E6] mb-3">También puedes contactarnos directamente:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <a href="mailto:mahuplexus@gmail.com"
              className="flex items-center gap-3 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-4 py-3 transition hover:border-[#D4AF37]/22">
              <span className="text-xl">✉️</span>
              <div>
                <p className="text-[10px] text-[#E6E6E6]/35 uppercase tracking-widest">Correo</p>
                <p className="text-sm font-semibold text-[#D4AF37]">mahuplexus@gmail.com</p>
              </div>
            </a>
            <a href="https://wa.me/51964271242?text=Tengo%20una%20reclamaci%C3%B3n%20sobre%20Mahu%20Plexus"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-[#2B2B30] bg-[#0B0B0D]/40 px-4 py-3 transition hover:border-[#25D366]/22">
              <span className="text-xl">💬</span>
              <div>
                <p className="text-[10px] text-[#E6E6E6]/35 uppercase tracking-widest">WhatsApp</p>
                <p className="text-sm font-semibold text-[#D4AF37]">+51 964 271 242</p>
              </div>
            </a>
          </div>
        </div>
      </main>

      <footer className="mt-8 border-t border-[#2B2B30]/50 py-8">
        <div className="mx-auto max-w-4xl px-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-5">
            <LegalLink href="/terms" label="Términos" />
            <LegalLink href="/privacy" label="Privacidad" />
            <LegalLink href="/returns" label="Devoluciones" />
            <LegalLink href="/complaints" label="Reclamaciones" />
            <LegalLink href="/contact" label="Contacto" />
          </div>
          <p className="text-xs text-[#E6E6E6]/22">© 2025 Mahu Plexus</p>
        </div>
      </footer>
    </div>
  )
}
