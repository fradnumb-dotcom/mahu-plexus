import { NextRequest } from "next/server"

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  })
}

export async function GET(req: NextRequest) {
  try {
    const ruc = req.nextUrl.searchParams.get("numero")?.trim() || ""
    if (!ruc) return json({ error: "Falta número de RUC" }, 400)
    if (!/^\d{11}$/.test(ruc)) return json({ error: "RUC debe tener 11 dígitos" }, 400)

    const token = process.env.DNI_API_TOKEN
    if (!token) return json({ error: "Falta DNI_API_TOKEN" }, 500)

    const res = await fetch(`https://api.factiliza.com/v1/ruc/info/${ruc}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    })
    const result = await res.json()

    if (!res.ok || (!result?.success && !result?.data)) {
      return json({ error: result?.message || "RUC no encontrado" }, 400)
    }

    const d = result.data || {}
    return json({
      success: true,
      data: {
        ruc:                 d.ruc || ruc,
        razon_social:        d.razon_social || d.nombre_o_razon_social || "",
        nombre_comercial:    d.nombre_comercial || "",
        estado:              d.estado || d.estado_contribuyente || "",
        condicion:           d.condicion || d.condicion_contribuyente || "",
        tipo_contribuyente:  d.tipo_contribuyente || "",
        direccion:           d.direccion || d.domicilio_fiscal || "",
        departamento:        d.departamento || "",
        provincia:           d.provincia || "",
        distrito:            d.distrito || "",
        ubigeo:              d.ubigeo || "",
        telefono:            d.telefono || "",
        actividad_economica: d.actividad_economica || d.actividad_principal || "",
        fecha_inscripcion:   d.fecha_inscripcion || "",
      },
    })
  } catch {
    return json({ error: "Error interno al consultar RUC" }, 500)
  }
}
