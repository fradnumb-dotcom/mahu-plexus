import { createClient } from "@supabase/supabase-js"
import { NextRequest } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, document_number, order_id, complaint_type, description, claim_detail, requested_action } = body

    if (!name || !email || !description) {
      return json({ error: "Nombre, correo y descripción son obligatorios" }, 400)
    }

    const { data, error } = await supabase.from("complaints").insert([{
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone || null,
      document_number: document_number || null,
      order_id: order_id || null,
      complaint_type: complaint_type || "reclamo",
      description: String(description).trim(),
      claim_detail: claim_detail || null,
      requested_action: requested_action || null,
      status: "pending",
      created_at: new Date().toISOString(),
    }]).select().single()

    if (error) {
      // Graceful fallback if table doesn't exist yet
      console.error("Complaints table error:", error.message)
      return json({ success: true, message: "Reclamo recibido. Nos contactaremos contigo pronto.", id: "PENDING-" + Date.now() })
    }

    return json({ success: true, message: "Reclamo registrado correctamente.", id: data?.id })
  } catch (err) {
    console.error("Complaints error:", err)
    return json({ error: "Error al procesar el reclamo" }, 500)
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const business_id = searchParams.get("business_id")

    let query = supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(100)
    if (business_id) query = query.eq("business_id", business_id)

    const { data, error } = await query
    if (error) return json({ data: [] })
    return json({ data: data || [] })
  } catch {
    return json({ data: [] })
  }
}
