"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "../components/Toast"

const LegalLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-[#E6E6E6]/35 hover:text-[#D4AF37] transition text-xs">{label}</Link>
)

export default function ContactPage() {
  const [name,    setName]    = useState("")
  const [email,   setEmail]   = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)

  const handleSend = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Nombre, correo y mensaje son obligatorios")
      return
    }
    setLoading(true)
    // Simulate sending — in production connect to an email API
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSent(true)
    toast.info("Mensaje enviado correctamente")
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

      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]/70">Soporte</span>
          <h1 className="mt-2 text-3xl font-black text-[#E6E6E6]">Contacto</h1>
          <p className="mt-3 text-[#E6E6E6]/45 max-w-xl mx-auto">
            Nuestro equipo está disponible para ayudarte con cualquier consulta sobre el sistema, ventas, suscripciones o soporte técnico.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Contact methods */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-[#E6E6E6] mb-4">Canales de atención</h2>

            {[
              {
                icon: "💬",
                title: "WhatsApp (Recomendado)",
                subtitle: "Respuesta inmediata en horario de atención",
                value: "+51 964 271 242",
                href: "https://wa.me/51964271242?text=Hola%2C%20necesito%20información%20sobre%20Mahu%20Plexus",
                cta: "Abrir WhatsApp",
                color: "border-[#25D366]/18 bg-[#25D366]/6",
              },
              {
                icon: "✉️",
                title: "Correo electrónico",
                subtitle: "Respuesta en menos de 24 horas",
                value: "mahuplexus@gmail.com",
                href: "mailto:mahuplexus@gmail.com",
                cta: "Enviar correo",
                color: "border-[#D4AF37]/18 bg-[#D4AF37]/5",
              },
            ].map(c => (
              <div key={c.title} className={`rounded-2xl border p-5 ${c.color}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#E6E6E6] text-sm">{c.title}</p>
                    <p className="text-xs text-[#E6E6E6]/45 mt-0.5 mb-2">{c.subtitle}</p>
                    <p className="text-sm font-semibold text-[#D4AF37]">{c.value}</p>
                  </div>
                  <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    className="shrink-0 rounded-xl border border-[#D4AF37]/22 bg-[#D4AF37]/10 px-3.5 py-2 text-xs font-bold text-[#D4AF37] transition hover:bg-[#D4AF37]/18">
                    {c.cta}
                  </a>
                </div>
              </div>
            ))}

            {/* Hours */}
            <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/65 p-5">
              <h3 className="text-sm font-bold text-[#E6E6E6] mb-3">Horario de atención</h3>
              <div className="space-y-2">
                {[
                  ["Lunes a viernes", "9:00 am – 6:00 pm"],
                  ["Sábados", "9:00 am – 1:00 pm"],
                  ["Domingos y feriados", "No disponible"],
                ].map(([day, hours]) => (
                  <div key={day} className="flex items-center justify-between text-sm">
                    <span className="text-[#E6E6E6]/55">{day}</span>
                    <span className="font-semibold text-[#E6E6E6]">{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick FAQ */}
            <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/65 p-5">
              <h3 className="text-sm font-bold text-[#E6E6E6] mb-3">Preguntas frecuentes</h3>
              <div className="space-y-3">
                {[
                  { q: "¿Cómo recupero mi contraseña?", a: "Desde la pantalla de login, clic en '¿Olvidaste tu contraseña?' y sigue las instrucciones." },
                  { q: "¿Cómo cancelo mi suscripción?", a: "Desde Configuración > Suscripción dentro del sistema." },
                  { q: "¿Mis datos están seguros?", a: "Sí. Usamos cifrado SSL/TLS y Supabase con estándares de seguridad empresarial." },
                ].map(faq => (
                  <div key={faq.q} className="border-b border-[#2B2B30] pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-[#E6E6E6]">{faq.q}</p>
                    <p className="mt-1 text-xs text-[#E6E6E6]/45">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-2xl border border-[#2B2B30] bg-[#141418]/65 p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="text-xl font-black text-[#E6E6E6] mb-2">¡Mensaje enviado!</h2>
                <p className="text-sm text-[#E6E6E6]/50 leading-relaxed mb-6">
                  Hemos recibido tu mensaje. Te responderemos a <strong className="text-[#D4AF37]">{email}</strong> en menos de 24 horas.
                </p>
                <button onClick={() => { setSent(false); setName(""); setEmail(""); setSubject(""); setMessage("") }}
                  className="rounded-xl border border-[#2B2B30] bg-[#2B2B30] px-5 py-2.5 text-sm font-semibold text-[#E6E6E6]/70 hover:text-[#E6E6E6] transition">
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-base font-bold text-[#E6E6E6] mb-5">Enviar mensaje</h2>
                <div className="space-y-3.5">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Nombre *</label>
                    <input placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Correo electrónico *</label>
                    <input type="email" placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Asunto</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className={inp}>
                      <option value="">Selecciona un asunto</option>
                      <option value="ventas">Información sobre planes</option>
                      <option value="soporte">Soporte técnico</option>
                      <option value="facturacion">Facturación y pagos</option>
                      <option value="cuenta">Problemas con mi cuenta</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#E6E6E6]/35">Mensaje *</label>
                    <textarea placeholder="Describe tu consulta con el mayor detalle posible..." value={message}
                      onChange={e => setMessage(e.target.value)} rows={5} className={`${inp} resize-none`} />
                  </div>
                  <button onClick={handleSend} disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] py-3.5 text-sm font-black text-[#0B0B0D] shadow-[0_8px_24px_rgba(212,175,55,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(212,175,55,0.35)] disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 rounded-full border-2 border-[#0B0B0D]/25 border-t-[#0B0B0D] animate-spin" />
                        Enviando...
                      </span>
                    ) : "Enviar mensaje"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-12 border-t border-[#2B2B30]/50 py-8">
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
