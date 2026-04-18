import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CartItemInput = {
  product_id: string
  quantity: number
}

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
      .from("sales")
      .select(`
        id,
        total,
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
  } catch (error) {
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

    const {
      business_id,
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
      return new Response(
        JSON.stringify({ error: "Falta business_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
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
      return new Response(
        JSON.stringify({ error: "Faltan productos para la venta" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const productIds = cartItems.map((item) => item.product_id)

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, stock")
      .in("id", productIds)

    if (productsError) {
      return new Response(
        JSON.stringify({ error: productsError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (!products || products.length !== productIds.length) {
      return new Response(
        JSON.stringify({ error: "Uno o más productos no existen" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const productMap = new Map(products.map((p) => [p.id, p]))

    let total = 0
    const saleItemsToInsert: {
      product_id: string
      quantity: number
      price: number
      subtotal: number
    }[] = []

    for (const item of cartItems) {
      const product = productMap.get(item.product_id)

      if (!product) {
        return new Response(
          JSON.stringify({ error: "Producto no encontrado" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      if (Number(product.stock) < Number(item.quantity)) {
        return new Response(
          JSON.stringify({ error: `Stock insuficiente para ${product.name}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        )
      }

      const subtotal = Number(product.price) * Number(item.quantity)
      total += subtotal

      saleItemsToInsert.push({
        product_id: product.id,
        quantity: Number(item.quantity),
        price: Number(product.price),
        subtotal,
      })
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          business_id,
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
      return new Response(
        JSON.stringify({ error: "No se pudo crear la venta" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
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
      return new Response(
        JSON.stringify({ error: "No se pudo guardar el detalle de venta" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    for (const item of saleItemsToInsert) {
      const product = productMap.get(item.product_id)

      if (!product) continue

      const { error: stockError } = await supabase
        .from("products")
        .update({
          stock: Number(product.stock) - Number(item.quantity),
        })
        .eq("id", item.product_id)

      if (stockError) {
        return new Response(
          JSON.stringify({ error: `No se pudo actualizar stock de ${product.name}` }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sale,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
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

    const business_id = searchParams.get("business_id")
    const year = searchParams.get("year")
    const month = searchParams.get("month")

    if (!business_id || !year || !month) {
      return new Response(
        JSON.stringify({ error: "Faltan business_id, year o month" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const monthNumber = Number(month)
    const yearNumber = Number(year)

    if (monthNumber < 1 || monthNumber > 12) {
      return new Response(
        JSON.stringify({ error: "Mes inválido" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
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
      return new Response(
        JSON.stringify({ error: salesError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (!salesToDelete || salesToDelete.length === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const saleIds = salesToDelete.map((sale) => sale.id)

    const { error: deleteItemsError } = await supabase
      .from("sale_items")
      .delete()
      .in("sale_id", saleIds)

    if (deleteItemsError) {
      return new Response(
        JSON.stringify({ error: deleteItemsError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { error: deleteSalesError } = await supabase
      .from("sales")
      .delete()
      .in("id", saleIds)

    if (deleteSalesError) {
      return new Response(
        JSON.stringify({ error: deleteSalesError.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({ success: true, deleted: saleIds.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}