import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Política de Cambios y Devoluciones — Mahu Plexus" }

const SECTIONS = [
  {
    title: "1. Naturaleza del Servicio",
    content: "Mahu Plexus es un servicio de software (SaaS) entregado digitalmente. Al tratarse de un producto intangible de acceso inmediato, aplican condiciones particulares respecto a devoluciones según la legislación peruana y las mejores prácticas del sector.",
  },
  {
    title: "2. Período de Prueba Gratuita",
    content: "Ofrecemos 3 días de prueba gratuita con acceso completo a todas las funcionalidades, sin necesidad de tarjeta de crédito. Le recomendamos aprovechar este período para evaluar si el servicio satisface sus necesidades antes de contratar un plan de pago.",
  },
  {
    title: "3. Política de Reembolsos",
    content: "Podrá solicitar un reembolso completo si: (a) Lo solicita dentro de los 3 días naturales posteriores al primer pago de un plan. (b) El servicio ha presentado fallas técnicas graves que impidan su uso normal por más de 24 horas continuas y Mahu Plexus no haya podido resolverlas. Fuera de estos supuestos, al tratarse de un servicio digital ya entregado y en uso, no se realizan reembolsos proporcionales.",
  },
  {
    title: "4. Cancelación de Suscripción",
    content: "Puede cancelar su suscripción en cualquier momento desde el panel de configuración de su cuenta. La cancelación toma efecto al finalizar el período de facturación vigente. Sus datos se conservan durante 90 días adicionales para facilitar la reactivación en caso de que reconsidere.",
  },
  {
    title: "5. Cambio de Plan",
    content: "Puede cambiar de plan en cualquier momento (Básico → Profesional → Empresarial o viceversa). Al mejorar de plan, el nuevo período inicia desde la fecha del pago. Al reducir de plan, el cambio toma efecto al inicio del siguiente período de facturación.",
  },
  {
    title: "6. Proceso de Solicitud de Reembolso",
    content: "Para solicitar un reembolso: (1) Envíe un correo a mahuplexus@gmail.com con el asunto 'Solicitud de Reembolso'. (2) Incluya su nombre, correo registrado, fecha del pago y motivo de la solicitud. (3) Alternativamente, contáctenos por WhatsApp al +51 964 271 242. (4) Procesaremos su solicitud en un plazo máximo de 5 días hábiles. (5) El reembolso se realiza al mismo método de pago original.",
  },
  {
    title: "7. Casos No Contemplados para Reembolso",
    content: "No se realizan reembolsos por: olvido de contraseña (puede recuperarla gratuitamente), cambio de decisión después de los 3 días de la primera compra, uso del servicio durante el período de facturación, incumplimiento de los Términos y Condiciones por parte del usuario.",
  },
  {
    title: "8. Garantía de Servicio",
    content: "Garantizamos una disponibilidad del servicio del 99% mensual. En caso de incumplimiento, aplicamos créditos automáticos en la próxima factura según el tiempo de inactividad registrado.",
  },
  {
    title: "9. Contacto",
    content: "Para cualquier consulta sobre esta política: mahuplexus@gmail.com — WhatsApp: +51 964 271 242. Atención de lunes a sábado, 9am a 6pm.",
  },
]

const LegalLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-[#E6E6E6]/35 hover:text-[#D4AF37] transition text-xs">{label}</Link>
)

export default function ReturnsPage() {
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

      <main className="mx-auto max-w-4xl px-5 py-12">
        <div className="mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]/70">Legal</span>
          <h1 className="mt-2 text-3xl font-black text-[#E6E6E6]">Política de Cambios y Devoluciones</h1>
          <p className="mt-2 text-sm text-[#E6E6E6]/40">Última actualización: 9 de junio de 2025</p>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <p className="text-sm text-[#E6E6E6]/65 leading-relaxed">
            <strong className="text-emerald-400">Resumen rápido:</strong> Ofrecemos reembolso completo dentro de los primeros 3 días del primer pago. Incluimos prueba gratuita de 3 días para que evalúes el servicio antes de pagar. Cancela cuando quieras sin penalizaciones.
          </p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map(s => (
            <div key={s.title} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/65 p-5">
              <h2 className="mb-2 text-sm font-bold text-[#E6E6E6]">{s.title}</h2>
              <p className="text-sm leading-relaxed text-[#E6E6E6]/58">{s.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-5 text-center">
          <p className="text-sm font-semibold text-[#D4AF37] mb-2">¿Necesitas ayuda con una devolución?</p>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
            <a href="mailto:mahuplexus@gmail.com" className="text-sm text-[#E6E6E6]/60 hover:text-[#D4AF37] transition">
              ✉️ mahuplexus@gmail.com
            </a>
            <a href="https://wa.me/51964271242" target="_blank" rel="noopener noreferrer" className="text-sm text-[#E6E6E6]/60 hover:text-[#D4AF37] transition">
              💬 +51 964 271 242
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
          <p className="text-xs text-[#E6E6E6]/22">© {new Date().getFullYear()} Mahu Plexus</p>
        </div>
      </footer>
    </div>
  )
}
