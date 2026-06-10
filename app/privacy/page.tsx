import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = { title: "Política de Privacidad — Mahu Plexus" }

const SECTIONS = [
  {
    title: "1. Responsable del Tratamiento",
    content: "Mahu Plexus (mahuplexus@gmail.com | WhatsApp: +51 964 271 242) es responsable del tratamiento de los datos personales que usted nos proporciona al registrarse y utilizar nuestra plataforma.",
  },
  {
    title: "2. Datos que Recopilamos",
    content: "Recopilamos: (a) Datos de identificación: nombre completo, correo electrónico y contraseña cifrada. (b) Datos del negocio: nombre comercial, dirección, logotipo y configuración de la cuenta. (c) Datos operativos: productos, ventas, clientes y movimientos de inventario ingresados por el usuario. (d) Datos técnicos: dirección IP, tipo de dispositivo, navegador y logs de acceso para seguridad.",
  },
  {
    title: "3. Finalidad del Tratamiento",
    content: "Sus datos se utilizan exclusivamente para: prestar el servicio de gestión empresarial contratado; gestionar su suscripción y procesar pagos a través de Culqi; enviar notificaciones relevantes del servicio; mejorar la plataforma mediante análisis agregados y anónimos; y cumplir obligaciones legales aplicables.",
  },
  {
    title: "4. Base Legal",
    content: "El tratamiento se basa en: la ejecución del contrato de suscripción aceptado al registrarse; el consentimiento otorgado durante el registro; y el interés legítimo de Mahu Plexus en garantizar la seguridad y funcionamiento del sistema.",
  },
  {
    title: "5. Compartición de Datos",
    content: "No vendemos ni compartimos sus datos personales con terceros con fines comerciales. Solo compartimos datos con: Supabase (infraestructura de base de datos y autenticación), Culqi (procesamiento de pagos, certificado PCI-DSS), y proveedores de hosting bajo acuerdos de confidencialidad. Sus datos de clientes e inventario son de su exclusiva propiedad.",
  },
  {
    title: "6. Seguridad",
    content: "Implementamos medidas técnicas y organizativas para proteger sus datos: cifrado SSL/TLS en todas las transmisiones, contraseñas almacenadas con hash bcrypt, acceso restringido por roles, copias de seguridad automáticas, y monitoreo continuo de seguridad.",
  },
  {
    title: "7. Conservación de Datos",
    content: "Sus datos se conservan mientras mantenga una cuenta activa. Al cancelar su suscripción, los datos se conservan por 90 días adicionales para permitir la reactivación. Tras este período, los datos personales se eliminan. Los datos de transacciones se conservan por el tiempo que exija la normativa fiscal peruana.",
  },
  {
    title: "8. Sus Derechos",
    content: "Conforme a la Ley N.° 29733 (Ley de Protección de Datos Personales del Perú), usted tiene derecho a: acceder a sus datos, rectificar información incorrecta, solicitar la eliminación de sus datos, oponerse al tratamiento, y portabilidad de datos. Para ejercer estos derechos, contacte a mahuplexus@gmail.com.",
  },
  {
    title: "9. Cookies",
    content: "Utilizamos cookies de sesión estrictamente necesarias para el funcionamiento de la autenticación. No utilizamos cookies de publicidad ni de seguimiento de terceros.",
  },
  {
    title: "10. Cambios en la Política",
    content: "Nos reservamos el derecho de actualizar esta política. Le notificaremos cambios significativos por correo electrónico o mediante aviso en la plataforma con 15 días de anticipación.",
  },
  {
    title: "11. Contacto",
    content: "Para cualquier consulta sobre privacidad: mahuplexus@gmail.com — WhatsApp: +51 964 271 242. Atención de lunes a sábado, 9am a 6pm.",
  },
]

const LegalLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-[#E6E6E6]/35 hover:text-[#D4AF37] transition text-xs">{label}</Link>
)

export default function PrivacyPage() {
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
          <h1 className="mt-2 text-3xl font-black text-[#E6E6E6]">Política de Privacidad</h1>
          <p className="mt-2 text-sm text-[#E6E6E6]/40">Última actualización: 9 de junio de 2025</p>
        </div>

        <div className="mb-6 rounded-2xl border border-[#D4AF37]/15 bg-[#D4AF37]/5 p-4">
          <p className="text-sm text-[#E6E6E6]/65 leading-relaxed">
            En Mahu Plexus nos comprometemos a proteger su privacidad y tratar sus datos personales con transparencia, seguridad y respeto a la normativa peruana vigente (Ley N.° 29733).
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
