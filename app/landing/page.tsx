import type { Metadata } from "next"
import Link from "next/link"
import { PaymentMarks } from "../components/PaymentMarks"

export const metadata: Metadata = {
  title: "Mahu Plexus — Sistema Empresarial de Gestión",
  description: "Plataforma SaaS premium para gestión de ventas, inventario y operaciones. Conectamos ideas, creamos soluciones.",
}

const PLANS = [
  {
    name: "Básico",
    price: "S/ 9.90",
    period: "/día",
    description: "Para pequeños negocios que inician",
    features: ["500 productos", "2 usuarios", "Ventas ilimitadas", "Reportes básicos", "Soporte estándar"],
    cta: "Comenzar prueba gratis",
    highlight: false,
    color: "border-[#2B2B30]",
    badge: null,
  },
  {
    name: "Profesional",
    price: "S/ 29.90",
    period: "/semana",
    description: "Para negocios en crecimiento",
    features: ["5,000 productos", "10 usuarios", "Ventas ilimitadas", "Reportes avanzados", "Exportación Excel", "Alertas automáticas", "Soporte prioritario"],
    cta: "Comenzar prueba gratis",
    highlight: true,
    color: "border-[#D4AF37]/40",
    badge: "Más popular",
  },
  {
    name: "Empresarial",
    price: "S/ 89.90",
    period: "/mes",
    description: "Para empresas con operación compleja",
    features: ["Productos ilimitados", "Usuarios ilimitados", "Multi sucursal", "Auditoría completa", "Dashboard ejecutivo", "Analítica avanzada", "Soporte VIP 24/7"],
    cta: "Comenzar prueba gratis",
    highlight: false,
    color: "border-[#2B2B30]",
    badge: "Mejor valor",
  },
]

const ICONS: Record<string, React.ReactNode> = {
  inventory: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="#D4AF37" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 7v10l9 4 9-4V7" stroke="#D4AF37" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 11v10" stroke="#D4AF37" strokeWidth="1.6"/></svg>,
  sales: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="20" r="1.4" stroke="#D4AF37" strokeWidth="1.6"/><circle cx="18" cy="20" r="1.4" stroke="#D4AF37" strokeWidth="1.6"/></svg>,
  analytics: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round"/><path d="M7 15l3-4 3 2 4-6" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  team: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="#D4AF37" strokeWidth="1.6"/><path d="M3 20a6 6 0 0 1 12 0" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round"/><path d="M16 5.5a3.2 3.2 0 0 1 0 6.3M17 20a6 6 0 0 0-2-4.5" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  reports: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 2h8l4 4v16H6z" stroke="#D4AF37" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 2v4h4" stroke="#D4AF37" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 13h6M9 17h6M9 9h2" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  subscriptions: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="2.5" stroke="#D4AF37" strokeWidth="1.6"/><path d="M2 10h20" stroke="#D4AF37" strokeWidth="1.6"/><path d="M6 15h4" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round"/></svg>,
}

const SERVICES = [
  {
    iconKey: "inventory",
    name: "Gestión de Inventario",
    description: "Control total de tu stock en tiempo real. SKU, códigos de barra, categorías, alertas de stock crítico y kardex completo.",
    price: "Incluido en todos los planes",
    tag: "Inventario",
  },
  {
    iconKey: "sales",
    name: "Módulo de Ventas",
    description: "Registra ventas en segundos. Búsqueda instantánea, carrito rápido, comprobantes PDF con QR y consulta DNI/RUC automática.",
    price: "Incluido en todos los planes",
    tag: "Ventas",
  },
  {
    iconKey: "analytics",
    name: "Dashboard Ejecutivo",
    description: "Métricas de negocio en tiempo real. Ventas del día, semana y mes, margen de ganancia, productos más vendidos y ranking de vendedores.",
    price: "Incluido en todos los planes",
    tag: "Analítica",
  },
  {
    iconKey: "team",
    name: "Gestión de Equipo",
    description: "Crea y administra tu equipo de vendedores. Control de accesos, roles diferenciados y seguimiento de rendimiento individual.",
    price: "Incluido en planes Profesional y Empresarial",
    tag: "Equipo",
  },
  {
    iconKey: "reports",
    name: "Comprobantes y Reportes",
    description: "Genera comprobantes profesionales con logo, QR y datos del cliente. Exporta reportes diarios en PDF y Excel.",
    price: "Incluido en todos los planes",
    tag: "Reportes",
  },
  {
    iconKey: "subscriptions",
    name: "Sistema de Suscripciones",
    description: "Gestión de planes con prueba gratuita de 3 días. Pagos seguros vía Izipay (Visa, Mastercard, Yape). Control total de acceso.",
    price: "Configuración incluida",
    tag: "Suscripciones",
  },
]

const HOW_IT_WORKS = [
  { step: "01", title: "Crea tu cuenta", desc: "Regístrate gratis en menos de 2 minutos. Sin tarjeta de crédito. 3 días de prueba completa." },
  { step: "02", title: "Configura tu negocio", desc: "Agrega tu logo, datos de la empresa, crea tu equipo de vendedores y carga tu inventario inicial." },
  { step: "03", title: "Empieza a vender", desc: "Registra ventas, controla stock y genera reportes desde el primer día. Interfaz intuitiva y veloz." },
  { step: "04", title: "Elige tu plan", desc: "Al terminar los 3 días, elige el plan que mejor se ajuste a tu negocio. Tus datos nunca se pierden." },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 border-b border-[#D4AF37]/10 bg-[#0B0B0D]/92 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <a href="/landing" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 36, width: "auto" }} />
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {[["#servicios", "Servicios"], ["#planes", "Planes"], ["#como-funciona", "Cómo funciona"], ["#contacto", "Contacto"]].map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-[#E6E6E6]/60 transition hover:text-[#D4AF37]">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-[#E6E6E6]/70 transition hover:text-[#D4AF37]">
              Iniciar sesión
            </Link>
            <Link href="/register"
              className="rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-4 py-2 text-sm font-bold text-[#0B0B0D] transition hover:shadow-[0_8px_24px_rgba(212,175,55,0.3)] hover:-translate-y-0.5">
              Prueba gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Background glows */}
        <div className="pointer-events-none absolute inset-0">
          <div className="mp-orb-1 absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-[#D4AF37]/6 blur-[140px]" />
          <div className="mp-orb-2 absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/4 blur-[160px]" />
          <div className="mp-grid-anim absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(212,175,55,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.4)_1px,transparent_1px)] [background-size:56px_56px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-[#D4AF37]/22 bg-[#D4AF37]/8 px-5 py-2 backdrop-blur-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.35em] text-[#D4AF37]/80">Plataforma SaaS Empresarial · v3.0</span>
          </div>

          <h1 className="mb-6 text-4xl font-black leading-[1.04] tracking-tight text-[#E6E6E6] md:text-6xl lg:text-7xl">
            Gestiona tu negocio<br />
            <span style={{ background: "linear-gradient(135deg, #D4AF37, #F0CC50, #B8960C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              con precisión de élite.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-[#E6E6E6]/55 leading-relaxed">
            Ventas ultra-rápidas, inventario empresarial, reportes ejecutivos y gestión de equipo.
            Todo en una plataforma diseñada para negocios que exigen excelencia.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register"
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#B8960C] px-8 py-4 text-base font-black text-[#0B0B0D] shadow-[0_12px_40px_rgba(212,175,55,0.28)] transition hover:shadow-[0_18px_50px_rgba(212,175,55,0.42)] hover:-translate-y-1">
              Comenzar gratis — 3 días sin costo
            </Link>
            <Link href="/login"
              className="rounded-2xl border border-[#2B2B30] bg-[#141418] px-8 py-4 text-base font-semibold text-[#E6E6E6]/70 transition hover:border-[#D4AF37]/25 hover:text-[#E6E6E6]">
              Ya tengo cuenta →
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#E6E6E6]/35">
            {["✓ Sin tarjeta de crédito", "✓ 3 días gratis", "✓ Datos seguros SSL", "✓ Cancela cuando quieras", "✓ Soporte en español"].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicios" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-14 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-[#D4AF37]/70">Servicios</span>
            <h2 className="mt-3 text-3xl font-black text-[#E6E6E6] md:text-4xl">Todo lo que necesita tu negocio</h2>
            <p className="mt-4 text-[#E6E6E6]/45">Una plataforma completa para operar con eficiencia y escalar con confianza.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map(svc => (
              <div key={svc.name} className="group rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-6 transition hover:border-[#D4AF37]/22 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
                <div className="mb-4 flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/8">{ICONS[svc.iconKey]}</span>
                  <span className="rounded-full border border-[#D4AF37]/18 bg-[#D4AF37]/8 px-2.5 py-0.5 text-[10px] font-bold text-[#D4AF37]/70">{svc.tag}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-[#E6E6E6]">{svc.name}</h3>
                <p className="mb-4 text-sm leading-relaxed text-[#E6E6E6]/50">{svc.description}</p>
                <p className="text-[11px] font-semibold text-[#D4AF37]/60">{svc.price}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-20 md:py-28 border-t border-[#2B2B30]/50">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-14 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-[#D4AF37]/70">Proceso</span>
            <h2 className="mt-3 text-3xl font-black text-[#E6E6E6] md:text-4xl">Cómo funciona</h2>
            <p className="mt-4 text-[#E6E6E6]/45">Configura tu negocio y empieza a operar en menos de 10 minutos.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute right-0 top-6 hidden h-px w-full bg-gradient-to-r from-[#D4AF37]/20 to-transparent md:block" style={{ left: "50%" }} />
                )}
                <div className="relative rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-6">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#D4AF37]/22 bg-[#D4AF37]/10 text-lg font-black text-[#D4AF37]">
                    {step.step}
                  </div>
                  <h3 className="mb-2 text-sm font-bold text-[#E6E6E6]">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-[#E6E6E6]/45">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Payment process */}
          <div className="mt-12 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-6 md:p-8">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div>
                <h3 className="text-xl font-black text-[#E6E6E6] mb-3">Proceso de pago seguro</h3>
                <p className="text-sm text-[#E6E6E6]/50 leading-relaxed mb-4">
                  Al elegir tu plan, eres redirigido al formulario de pago de <strong className="text-[#D4AF37]">Izipay</strong>, una de las plataformas de pago más confiables del Perú. Tu información bancaria nunca pasa por nuestros servidores.
                </p>
                <div className="space-y-2">
                  {["Selecciona tu plan", "Ingresa tus datos de pago en Izipay", "Recibe confirmación instantánea", "Accede al sistema de inmediato"].map((step, i) => (
                    <div key={step} className="flex items-center gap-3 text-sm text-[#E6E6E6]/60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[10px] font-black text-[#D4AF37]">{i+1}</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 items-center md:items-end">
                <PaymentMarks />
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                  {["Plin", "BCP", "BBVA", "Interbank"].map(m => (
                    <span key={m} className="rounded-lg border border-[#2B2B30] bg-[#141418] px-3 py-1.5 text-xs font-medium text-[#E6E6E6]/45">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="planes" className="py-20 md:py-28 border-t border-[#2B2B30]/50">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mb-14 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.35em] text-[#D4AF37]/70">Planes</span>
            <h2 className="mt-3 text-3xl font-black text-[#E6E6E6] md:text-4xl">Elige el plan ideal para tu negocio</h2>
            <p className="mt-4 text-[#E6E6E6]/45">Todos los planes incluyen 3 días de prueba gratuita. Sin tarjeta de crédito.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative rounded-2xl border p-7 transition hover:-translate-y-1 ${plan.color} ${plan.highlight ? "bg-gradient-to-b from-[#D4AF37]/8 to-transparent ring-1 ring-[#D4AF37]/25" : "bg-[#141418]/60"}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${plan.highlight ? "bg-[#D4AF37] text-[#0B0B0D]" : "bg-[#2B2B30] text-[#E6E6E6]/70"}`}>{plan.badge}</span>
                  </div>
                )}
                <p className="text-xs uppercase tracking-[0.25em] text-[#E6E6E6]/40 mb-1">{plan.name}</p>
                <p className="text-sm text-[#E6E6E6]/50 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`text-4xl font-black ${plan.highlight ? "text-[#D4AF37]" : "text-[#E6E6E6]"}`}>{plan.price}</span>
                  <span className="text-sm text-[#E6E6E6]/40">{plan.period}</span>
                </div>
                <ul className="mb-7 space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#E6E6E6]/60">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37]/12 text-[#D4AF37] text-[10px]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register"
                  className={`block w-full rounded-xl py-3 text-center text-sm font-bold transition hover:-translate-y-0.5 ${plan.highlight ? "bg-gradient-to-r from-[#D4AF37] to-[#B8960C] text-[#0B0B0D] shadow-[0_8px_24px_rgba(212,175,55,0.25)]" : "border border-[#2B2B30] bg-[#2B2B30] text-[#E6E6E6]/80 hover:text-[#E6E6E6]"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contacto" className="py-20 md:py-28 border-t border-[#2B2B30]/50">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.35em] text-[#D4AF37]/70">Contacto</span>
          <h2 className="mt-3 text-3xl font-black text-[#E6E6E6] md:text-4xl">¿Tienes alguna pregunta?</h2>
          <p className="mt-4 mb-10 text-[#E6E6E6]/45">Nuestro equipo está disponible para ayudarte. Respuesta en menos de 24 horas.</p>

          <div className="grid gap-5 md:grid-cols-3 mb-10">
            {[
              { svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2.5" stroke="#D4AF37" strokeWidth="1.6"/><path d="M3 6l9 6 9-6" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Correo electrónico", value: "mahuplexus@gmail.com", href: "mailto:mahuplexus@gmail.com" },
              { svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.5-8.5 8.5 8.5 0 0 1 8.5 8.5z" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "WhatsApp", value: "+51 964 271 242", href: "https://wa.me/51964271242" },
              { svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#D4AF37" strokeWidth="1.6"/><path d="M12 7v5l3 2" stroke="#D4AF37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Atención", value: "Lunes a sábado, 9am – 6pm", href: null },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#D4AF37]/18 bg-[#D4AF37]/8">{c.svg}</span>
                <p className="text-xs text-[#E6E6E6]/38 mb-1">{c.label}</p>
                {c.href ? (
                  <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#D4AF37] hover:underline">{c.value}</a>
                ) : (
                  <p className="text-sm font-semibold text-[#E6E6E6]">{c.value}</p>
                )}
              </div>
            ))}
          </div>

          <a href="https://wa.me/51964271242?text=Hola%2C%20necesito%20información%20sobre%20Mahu%20Plexus"
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(37,211,102,0.4)]"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chatear por WhatsApp
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#2B2B30]/70 bg-[#0B0B0D] py-12">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 md:grid-cols-4 mb-10">
            <div className="md:col-span-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Mahu Plexus" style={{ height: 44, width: "auto" }} className="mb-4" />
              <p className="text-sm text-[#E6E6E6]/45 leading-relaxed max-w-xs">
                Plataforma  empresarial para gestión de ventas, inventario y operaciones. Conectamos ideas, creamos soluciones.
              </p>
              <div className="mt-4 flex flex-col gap-1">
                <a href="mailto:mahuplexus@gmail.com" className="text-xs text-[#D4AF37]/65 hover:text-[#D4AF37] transition">mahuplexus@gmail.com</a>
                <a href="https://wa.me/51964271242" target="_blank" rel="noopener noreferrer" className="text-xs text-[#D4AF37]/65 hover:text-[#D4AF37] transition">+51 964 271 242</a>
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/35">Plataforma</p>
              <div className="space-y-2.5">
                {[["#servicios","Servicios"], ["#planes","Planes"], ["#como-funciona","Cómo funciona"], ["/login","Iniciar sesión"], ["/register","Crear cuenta"]].map(([href, label]) => (
                  <a key={label} href={href} className="block text-sm text-[#E6E6E6]/45 hover:text-[#D4AF37] transition">{label}</a>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-[#E6E6E6]/35">Legal</p>
              <div className="space-y-2.5">
                {[["/terms","Términos y Condiciones"], ["/privacy","Política de Privacidad"], ["/returns","Política de Devoluciones"], ["/complaints","Libro de Reclamaciones"], ["/contact","Contacto"]].map(([href, label]) => (
                  <Link key={label} href={href} className="block text-sm text-[#E6E6E6]/45 hover:text-[#D4AF37] transition">{label}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#2B2B30]/60 pt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-xs text-[#E6E6E6]/28">© {new Date().getFullYear()} Mahu Plexus. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4 text-xs text-[#E6E6E6]/28">
              <span>🔒 Pagos seguros vía Izipay</span>
              <span>🛡 SSL certificado</span>
              <span>🇵🇪 Hecho en Perú</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
