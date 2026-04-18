import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const numero = req.nextUrl.searchParams.get("numero")?.trim()

    if (!numero) {
      return new Response(JSON.stringify({ error: "Falta DNI" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!/^\d{8}$/.test(numero)) {
      return new Response(JSON.stringify({ error: "DNI inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const token = process.env.DNI_API_TOKEN

    if (!token) {
      return new Response(JSON.stringify({ error: "Falta DNI_API_TOKEN" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const response = await fetch(
      `https://api.factiliza.com/v1/dni/info/${numero}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    )

    const result = await response.json()

    if (!response.ok || !result?.success) {
      return new Response(
        JSON.stringify({
          error: result?.message || "No se pudo consultar el DNI",
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
          dni: numero,
          nombres: result.data?.nombres || "",
          apellido_paterno: result.data?.apellido_paterno || "",
          apellido_materno: result.data?.apellido_materno || "",
          nombre_completo: result.data?.nombre_completo || "",
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