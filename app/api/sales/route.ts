import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CartItemInput = {
  product_id: string
  quantity: number
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function buildSaleCode(id: string, createdAt: string) {
  const date = new Date(createdAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `VTA-${year}${month}${day}-${id.slice(0, 4).toUpperCase()}`
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
    const seller_id = searchParams.get("seller_id")
    const role = searchParams.get("role")

    if (!business_id) {
      return jsonResponse({ error: "Falta business_id" }, 400)
    }

    let query = supabase
      .from("sales")
      .select(`
        id,
        sale_code,
        total,
        seller_id,
        customer_name,
        customer_phone,
        customer_dni,
        customer_department,
        customer_province,
        customer_district,
        customer_address,
        payment_method,
        payment_detail,
        created_at,
        sale_items (
          id,
          quantity,
          price,
          subtotal,
          product_id,
          products (
            id,
            name,
            serial_code
          )
        )
      `)
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })

    if (role === "seller" && seller_id) {
      query = query.eq("seller_id", seller_id)
    }

    const { data, error } = await query

    if (error) {
      return jsonResponse({ error: error.message }, 500)
    }

    return jsonResponse({ data })
  } catch (error) {
    console.error("SALES GET ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      business_id,
      seller_id,
      product_id,
      quantity,
      items,
      customer_name,
      customer_phone,
      customer_dni,
      customer_department,
      customer_province,
      customer_district,
      customer_address,
      payment_method,
      payment_detail,
    } = body

    if (!business_id) {
      return jsonResponse({ error: "Falta business_id" }, 400)
    }

    if (!seller_id) {
      return jsonResponse({ error: "Falta seller_id" }, 400)
    }

    let cartItems: CartItemInput[] = []

    if (Array.isArray(items) && items.length > 0) {
      cartItems = items
        .map((item) => ({
          product_id: String(item.product_id || ""),
          quantity: Number(item.quantity || 0),
        }))
        .filter((item) => item.product_id && item.quantity > 0)
    } else if (product_id && quantity) {
      cartItems = [
        {
          product_id: String(product_id),
          quantity: Number(quantity),
        },
      ]
    }

    if (cartItems.length === 0) {
      return jsonResponse({ error: "Faltan productos para la venta" }, 400)
    }

    const productIds = cartItems.map((item) => item.product_id)

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .in("id", productIds)
      .eq("business_id", business_id)

    if (productsError) {
      return jsonResponse({ error: productsError.message }, 500)
    }

    if (!products || products.length !== productIds.length) {
      return jsonResponse({ error: "Uno o más productos no existen" }, 404)
    }

    const productMap = new Map(products.map((p) => [p.id, p]))

    let total = 0

    const saleItemsToInsert: {
      product_id: string
      quantity: number
      price: number
      subtotal: number
      product_name: string
      old_stock: number
      new_stock: number
    }[] = []

    for (const item of cartItems) {
      const product = productMap.get(item.product_id)

      if (!product) {
        return jsonResponse({ error: "Producto no encontrado" }, 404)
      }

      const currentStock = Number(product.stock || 0)
      const soldQuantity = Number(item.quantity || 0)

      if (currentStock < soldQuantity) {
        return jsonResponse(
          { error: `Stock insuficiente para ${product.name}` },
          400
        )
      }

      const subtotal = Number(product.price) * soldQuantity
      total += subtotal

      saleItemsToInsert.push({
        product_id: product.id,
        quantity: soldQuantity,
        price: Number(product.price),
        subtotal,
        product_name: product.name,
        old_stock: currentStock,
        new_stock: currentStock - soldQuantity,
      })
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          business_id,
          seller_id,
          total,
          customer_name: customer_name || null,
          customer_phone: customer_phone || null,
          customer_dni: customer_dni || null,
          customer_department: customer_department || null,
          customer_province: customer_province || null,
          customer_district: customer_district || null,
          customer_address: customer_address || null,
          payment_method: payment_method || "efectivo",
          payment_detail: payment_detail || null,
        },
      ])
      .select()
      .single()

    if (saleError || !sale) {
      return jsonResponse(
        { error: saleError?.message || "No se pudo crear la venta" },
        500
      )
    }

    const saleCode = buildSaleCode(sale.id, sale.created_at)

    const { error: codeError } = await supabase
      .from("sales")
      .update({ sale_code: saleCode })
      .eq("id", sale.id)

    if (codeError) {
      return jsonResponse(
        { error: codeError.message || "No se pudo guardar el código de venta" },
        500
      )
    }

    const itemsPayload = saleItemsToInsert.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
    }))

    const { error: itemError } = await supabase
      .from("sale_items")
      .insert(itemsPayload)

    if (itemError) {
      return jsonResponse(
        { error: "No se pudo guardar el detalle de venta" },
        500
      )
    }

    for (const item of saleItemsToInsert) {
      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: item.new_stock,
          updated_by: seller_id,
        })
        .eq("id", item.product_id)

      if (stockError) {
        return jsonResponse(
          { error: `No se pudo actualizar stock de ${item.product_name}` },
          500
        )
      }

      await registerMovement({
        business_id,
        product_id: item.product_id,
        user_id: seller_id,
        type: "sold",
        quantity: item.quantity,
        note: `Salida por venta ${saleCode}: ${item.product_name}`,
      })
    }

    return jsonResponse({
      success: true,
      sale: {
        ...sale,
        sale_code: saleCode,
      },
    })
  } catch (error) {
    console.error("SALES POST ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    const business_id = searchParams.get("business_id")
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    if (!business_id || !year || !month) {
      return jsonResponse({ error: "Faltan business_id, year o month" }, 400)
    }

    const monthNumber = Number(month)
    const yearNumber = Number(year)

    if (monthNumber < 1 || monthNumber > 12) {
      return jsonResponse({ error: "Mes inválido" }, 400)
    }

    const startDate = new Date(yearNumber, monthNumber - 1, 1, 0, 0, 0, 0)
    const endDate = new Date(yearNumber, monthNumber, 0, 23, 59, 59, 999)

    const { data: salesToDelete, error: salesError } = await supabase
      .from("sales")
      .select("id")
      .eq("business_id", business_id)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    if (salesError) {
      return jsonResponse({ error: salesError.message }, 500)
    }

    if (!salesToDelete || salesToDelete.length === 0) {
      return jsonResponse({ success: true, deleted: 0 })
    }

    const saleIds = salesToDelete.map((sale) => sale.id)

    const { error: deleteItemsError } = await supabase
      .from("sale_items")
      .delete()
      .in("sale_id", saleIds)

    if (deleteItemsError) {
      return jsonResponse({ error: deleteItemsError.message }, 500)
    }

    const { error: deleteSalesError } = await supabase
      .from("sales")
      .delete()
      .in("id", saleIds)

    if (deleteSalesError) {
      return jsonResponse({ error: deleteSalesError.message }, 500)
    }

    return jsonResponse({ success: true, deleted: saleIds.length })
  } catch (error) {
    console.error("SALES DELETE ERROR:", error)
    return jsonResponse({ error: "Error interno del servidor" }, 500)
  }
}
