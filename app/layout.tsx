import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ToastContainer } from "./components/Toast"
import { WhatsAppButton } from "./components/WhatsAppButton"

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Mahu Plexus — Sistema Empresarial",
  description: "Conectamos ideas, creamos soluciones",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            document.documentElement.style.backgroundColor='#0B0B0D';
            try {
              var t=localStorage.getItem('mp-theme');
              if(t==='light'){document.documentElement.classList.add('mp-light');document.documentElement.style.backgroundColor='#F5F5F7';}
            } catch(e){}
          })();
        ` }} />
      </head>
      <body className="bg-[#0B0B0D] text-[#E6E6E6] antialiased">
        {children}
        <ToastContainer />
        <WhatsAppButton />
      </body>
    </html>
  )
}
