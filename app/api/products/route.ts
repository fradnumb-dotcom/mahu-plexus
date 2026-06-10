import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COST_PERCENTAGE = 0.6

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function registerMovement({
  business_id,
  product_id,
  user_id,
  type,
  quantity = 0,
  note,
}: {
  business_id: string
  product_id?: string | null
  user_id?: string | null
  type: "created" | "updated" | "sold" | "deleted"
  quantity?: number
  note?: string
}) {
  const { error } = await supabase.from("inventory_movements").insert({
    business_id,
    product_id: product_id || null,
    user_id: user_id || null,
    type,
    quantity,
    note,
  })

  if (error) {
    console.error("MOVEMENT ERROR:", error.message)
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const business_id = searchParams.get("business_id")

    if (!business_id) {
      return jsonResponse({ error: "Falta business_id" }, 400)
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ data })
  } catch (error) {
    console.error("PRODUCTS GET ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      name,
      price,
      stock,
      description,
      business_id,
      serial_code,
      user_id,
      sku,
      category,
      brand,
      min_stock,
    } = body

    if (!name || price === undefined || stock === undefined || !business_id) {
      return jsonResponse({ error: "Faltan campos obligatorios" }, 400)
    }

    const numericPrice = Number(price)
    const numericStock = Number(stock)

    if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
      return jsonResponse({ error: "Precio o stock inválido" }, 400)
    }

    // ── Real plan limit enforcement (POST only) ──────────────────────
    const PLAN_PRODUCT_LIMITS: Record<string, number> = {
      trial: 500, daily: 1000, weekly: 5000, monthly: 99999, active: 99999,
    }
    const { data: bizPlan } = await supabase
      .from("businesses")
      .select("subscription_status, subscription_plan")
      .eq("id", business_id)
      .single()
    if (bizPlan) {
      const bStatus = bizPlan.subscription_status || "active"
      const bPlan   = bizPlan.subscription_plan   || "trial"
      if (bStatus === "expired" || bStatus === "suspended") {
        return jsonResponse({ error: "Tu suscripción ha expirado. Actualiza tu plan para crear productos.", limit_reached: true }, 403)
      }
      const limit = PLAN_PRODUCT_LIMITS[bPlan] ?? 500
      if (limit < 99999) {
        const { count: currentCount } = await supabase
          .from("products").select("id", { count: "exact", head: true }).eq("business_id", business_id)
        if ((currentCount ?? 0) >= limit) {
          return jsonResponse({
            error: `Límite alcanzado: tu plan "${bPlan}" permite ${limit} productos. Actualiza tu plan para continuar.`,
            limit_reached: true, current: currentCount, limit, plan: bPlan,
          }, 403)
        }
      }
    }
    // ── End plan limit check ─────────────────────────────────────────

    const autoCost = Number((numericPrice * COST_PERCENTAGE).toFixed(2))
    const cleanSerial = String(serial_code || "").trim() || null

    // Duplicate serial_code check within the same business (friendly message)
    if (cleanSerial) {
      const { data: serialDup } = await supabase
        .from("products")
        .select("id")
        .eq("business_id", business_id)
        .eq("serial_code", cleanSerial)
        .maybeSingle()
      if (serialDup) {
        return jsonResponse({ error: "Ya existe un producto con ese número de serie." }, 409)
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert([
        {
          name: String(name).trim(),
          price: numericPrice,
          stock: numericStock,
          description: description || "",
          business_id,
          serial_code: cleanSerial,
          cost: autoCost,
          sku: sku ? String(sku).trim() : null,
          category: category ? String(category).trim() : null,
          brand: brand ? String(brand).trim() : null,
          min_stock: min_stock !== undefined && min_stock !== null ? Number(min_stock) : null,
          created_by: user_id || null,
          updated_by: user_id || null,
        },
      ])
      .select()
      .single()

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    await registerMovement({
      business_id,
      product_id: data.id,
      user_id: user_id || null,
      type: "created",
      quantity: numericStock,
      note: `Ingreso de producto: ${data.name}`,
    })

    return jsonResponse({ data })
  } catch (error) {
    console.error("PRODUCTS POST ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()

    const {
      id,
      name,
      price,
      stock,
      description,
      serial_code,
      user_id,
      sku,
      category,
      brand,
      min_stock,
    } = body

    if (!id) {
      return jsonResponse({ error: "Falta id" }, 400)
    }

    const { data: oldProduct, error: oldError } = await supabase
      .from("products")
      .select("id, name, stock, business_id")
      .eq("id", id)
      .single()

    if (oldError || !oldProduct) {
      return jsonResponse(
        { error: oldError?.message || "Producto no encontrado" },
        404
      )
    }

    const numericPrice = Number(price)
    const numericStock = Number(stock)

    if (Number.isNaN(numericPrice) || Number.isNaN(numericStock)) {
      return jsonResponse({ error: "Precio o stock inválido" }, 400)
    }

    const autoCost = Number((numericPrice * COST_PERCENTAGE).toFixed(2))
    const cleanSerial = String(serial_code || "").trim() || null

    const { data, error } = await supabase
      .from("products")
      .update({
        name: String(name || "").trim(),
        price: numericPrice,
        stock: numericStock,
        description: description || "",
        serial_code: cleanSerial,
        cost: autoCost,
        sku: sku ? String(sku).trim() : null,
        category: category ? String(category).trim() : null,
        brand: brand ? String(brand).trim() : null,
        min_stock: min_stock !== undefined && min_stock !== null ? Number(min_stock) : null,
        updated_by: user_id || null,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    await registerMovement({
      business_id: oldProduct.business_id,
      product_id: id,
      user_id: user_id || null,
      type: "updated",
      quantity: numericStock - Number(oldProduct.stock || 0),
      note: `Edición de producto: ${data.name}`,
    })

    return jsonResponse({ data })
  } catch (error) {
    console.error("PRODUCTS PUT ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const id = searchParams.get("id")
    const user_id = searchParams.get("user_id")

    if (!id) {
      return jsonResponse({ error: "Falta id" }, 400)
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, stock, business_id")
      .eq("id", id)
      .single()

    if (productError || !product) {
      return jsonResponse(
        { error: productError?.message || "Producto no encontrado" },
        404
      )
    }

    await registerMovement({
      business_id: product.business_id,
      product_id: product.id,
      user_id: user_id || null,
      type: "deleted",
      quantity: Number(product.stock || 0),
      note: `Producto eliminado: ${product.name}`,
    })

    const { error } = await supabase.from("products").delete().eq("id", id)

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ success: true })
  } catch (error) {
    console.error("PRODUCTS DELETE ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}
