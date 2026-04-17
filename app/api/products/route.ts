import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COST_PERCENTAGE = 0.6

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const business_id = searchParams.get("business_id")

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "Falta business_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, price, stock, description, business_id, serial_code } = body

    if (!name || price === undefined || stock === undefined || !business_id) {
      return new Response(
        JSON.stringify({ error: "Faltan campos obligatorios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const numericPrice = Number(price)
    const numericStock = Number(stock)
    const autoCost = Number((numericPrice * COST_PERCENTAGE).toFixed(2))
    const cleanSerial = String(serial_code || "").trim() || null

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name,
          price: numericPrice,
          stock: numericStock,
          description,
          business_id,
          serial_code: cleanSerial,
          cost: autoCost,
        },
      ])
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, name, price, stock, description, serial_code } = body

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Falta id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const numericPrice = Number(price)
    const numericStock = Number(stock)
    const autoCost = Number((numericPrice * COST_PERCENTAGE).toFixed(2))
    const cleanSerial = String(serial_code || "").trim() || null

    const { data, error } = await supabase
      .from("products")
      .update({
        name,
        price: numericPrice,
        stock: numericStock,
        description,
        serial_code: cleanSerial,
        cost: autoCost,
      })
      .eq("id", id)
      .select()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Falta id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}