import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "Arial, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 32, marginBottom: 10 }}>
        Mahu Plexus Oficial 🔥
      </h1>

      <p style={{ fontSize: 18, color: "#555" }}>
        Sistema Premium de Inventario funcionando correctamente 🚀
      </p>

      <div style={{ marginTop: 30 }}>
        <Link href="/dashboard">
          <button
            style={{
              padding: "12px 20px",
              fontSize: 16,
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Ir al Dashboard
          </button>
        </Link>
      </div>
    </main>
  );
}