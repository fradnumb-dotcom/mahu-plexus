import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Términos y Condiciones — Mahu Plexus" }

const SECTIONS = [
  { title: "1. Aceptación de los Términos", content: "Al registrarse y utilizar la plataforma Mahu Plexus, el usuario acepta íntegramente los presentes Términos y Condiciones. Si no está de acuerdo con alguna disposición, deberá abstenerse de usar el servicio. Mahu Plexus se reserva el derecho de modificar estos términos en cualquier momento, notificando a los usuarios a través de la plataforma o por correo electrónico." },
  { title: "2. Descripción del Servicio", content: "Mahu Plexus es una plataforma SaaS (Software as a Service) diseñada para la gestión integral de ventas, inventario, operaciones y equipo de trabajo. El servicio se ofrece bajo un modelo de suscripción con diferentes planes (Básico, Profesional y Empresarial), así como un período de prueba gratuita de 3 días sin costo." },
  { title: "3. Registro y Cuenta de Usuario", content: "Para acceder al servicio, el usuario debe crear una cuenta proporcionando información veraz, completa y actualizada. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. Mahu Plexus no se responsabiliza por el uso no autorizado de la cuenta derivado de la falta de cuidado en la protección de sus datos de acceso." },
  { title: "4. Prueba Gratuita", content: "Los nuevos usuarios tienen acceso a una prueba gratuita de 3 días con acceso completo a todas las funcionalidades de la plataforma. Al finalizar el período de prueba, el acceso quedará restringido hasta que el usuario seleccione un plan de pago. Los datos ingresados durante la prueba se conservan íntegramente." },
  { title: "5. Planes y Pagos", content: "Los planes de suscripción (Básico, Profesional y Empresarial) tienen diferentes características y límites de uso. Los pagos se procesan de forma segura a través de Izipay, plataforma certificada PCI-DSS. Los precios están expresados en Soles peruanos (PEN). El cobro se realiza de forma anticipada según el período elegido (diario, semanal o mensual)." },
  { title: "6. Cancelación y Reembolsos", content: "El usuario puede cancelar su suscripción en cualquier momento. No se realizan reembolsos proporcionales por el tiempo no utilizado del período vigente. Para solicitudes especiales, contactar a mahuplexus@gmail.com dentro de los 3 días posteriores al cobro." },
  { title: "7. Propiedad Intelectual", content: "Todo el contenido de Mahu Plexus, incluyendo software, diseño, logotipos e interfaces, es propiedad exclusiva de Mahu Plexus y está protegido por las leyes de propiedad intelectual aplicables. El usuario no puede copiar, distribuir o modificar el contenido sin autorización expresa." },
  { title: "8. Protección de Datos", content: "Mahu Plexus trata los datos personales conforme a su Política de Privacidad. Los datos de los clientes del usuario son de su exclusiva propiedad. Mahu Plexus no accede, comparte ni utiliza estos datos para ningún fin distinto a la prestación del servicio." },
  { title: "9. Limitación de Responsabilidad", content: "Mahu Plexus no será responsable por daños indirectos, incidentales o consecuentes derivados del uso del servicio. La responsabilidad total no excederá el monto pagado por el usuario en los últimos 3 meses de suscripción." },
  { title: "10. Ley Aplicable", content: "Los presentes términos se rigen por las leyes de la República del Perú. Cualquier controversia será sometida a los juzgados y tribunales competentes de Lima, Perú." },
  { title: "11. Contacto", content: "Para consultas sobre estos términos: mahuplexus@gmail.com — WhatsApp: +51 964 271 242" },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#E6E6E6]" style={{ fontFamily: "'Poppins',sans-serif" }}>
      <header className="border-b border-[#2B2B30]/60 px-5 py-4 sticky top-0 bg-[#0B0B0D]/92 backdrop-blur-xl z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/landing">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Mahu Plexus" style={{ height: 36, width: "auto" }} />
          </Link>
          <Link href="/landing" className="text-sm text-[#E6E6E6]/50 hover:text-[#D4AF37] transition">← Inicio</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <div className="mb-10">
          <span className="text-xs uppercase tracking-widest text-[#D4AF37]/70">Legal</span>
          <h1 className="mt-2 text-3xl font-black text-[#E6E6E6]">Términos y Condiciones</h1>
          <p className="mt-2 text-sm text-[#E6E6E6]/40">Última actualización: 9 de junio de 2025</p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map(s => (
            <div key={s.title} className="rounded-2xl border border-[#2B2B30] bg-[#141418]/60 p-5">
              <h2 className="text-base font-bold text-[#E6E6E6] mb-2">{s.title}</h2>
              <p className="text-sm text-[#E6E6E6]/60 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#2B2B30]/50 mt-8 py-8">
        <div className="mx-auto max-w-4xl px-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-xs text-[#E6E6E6]/30">
            {[["/terms","Términos"],["/privacy","Privacidad"],["/returns","Devoluciones"],["/complaints","Reclamaciones"],["/contact","Contacto"]].map(([href,label])=>(
              <Link key={href} href={href} className="hover:text-[#D4AF37] transition">{label}</Link>
            ))}
          </div>
          <p className="text-xs text-[#E6E6E6]/22">© {new Date().getFullYear()} Mahu Plexus</p>
        </div>
      </footer>
    </div>
  )
}
