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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var savedTheme = localStorage.getItem("theme");
                  var isDark = savedTheme === "light" ? false : true;

                  document.documentElement.classList.toggle("dark", isDark);
                  document.documentElement.classList.toggle("light", !isDark);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className="transition-colors duration-300 bg-white text-black dark:bg-[#050816] dark:text-white">
        {children}
      </body>
    </html>
  );
}