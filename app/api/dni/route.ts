import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const numero = req.nextUrl.searchParams.get("numero")?.trim() || ""
    const tipo = (req.nextUrl.searchParams.get("tipo")?.trim().toLowerCase() || "dni") as
      | "dni"
      | "cee"

    if (!numero) {
      return new Response(JSON.stringify({ error: "Falta número de documento" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (tipo === "dni" && !/^\d{8}$/.test(numero)) {
      return new Response(JSON.stringify({ error: "DNI inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (tipo === "cee" && !/^[A-Za-z0-9]{6,15}$/.test(numero)) {
      return new Response(
        JSON.stringify({ error: "Carnet de extranjería inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const token = process.env.DNI_API_TOKEN

    if (!token) {
      return new Response(JSON.stringify({ error: "Falta DNI_API_TOKEN" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const endpoint =
      tipo === "cee"
        ? `https://api.factiliza.com/v1/cee/info/${numero}`
        : `https://api.factiliza.com/v1/dni/info/${numero}`

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const result = await response.json()

    if (!response.ok || (!result?.success && !result?.data)) {
      return new Response(
        JSON.stringify({
          error: result?.message || "No se pudo consultar el documento",
        }),
        {
          status: response.status || 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tipo_documento: tipo,
          numero: result.data?.numero || numero,
          nombres: result.data?.nombres || "",
          apellido_paterno: result.data?.apellido_paterno || "",
          apellido_materno: result.data?.apellido_materno || "",
          nombre_completo:
            result.data?.nombre_completo ||
            [result.data?.nombres, result.data?.apellido_paterno, result.data?.apellido_materno]
              .filter(Boolean)
              .join(" ")
              .replace(/\s+/g, " ")
              .trim(),
          departamento: result.data?.departamento || "",
          provincia: result.data?.provincia || "",
          distrito: result.data?.distrito || "",
          direccion: result.data?.direccion || "",
          direccion_completa: result.data?.direccion_completa || "",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}