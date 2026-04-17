import "./globals.css";

export const metadata = {
  title: "Mahu Plexus",
  description: "Sistema Premium",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}