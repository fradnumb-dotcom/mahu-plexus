import { createClient } from "@supabase/supabase-js"

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Faltan variables de entorno de Supabase" },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let createdUserId: string | null = null
  let createdBusinessId: string | null = null

  try {
    const body = await req.json()

    const email = String(body.email || "").trim().toLowerCase()
    const password = String(body.password || "")
    const full_name = String(body.full_name || "").trim()
    const business_name = String(body.business_name || "").trim()

    if (!email || !password || !full_name || !business_name) {
      return Response.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return Response.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      )
    }

    const baseSlug = createSlug(business_name)

    if (!baseSlug) {
      return Response.json(
        { error: "Nombre de negocio inválido" },
        { status: 400 }
      )
    }

    const slug = `${baseSlug}-${Date.now()}`

    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          business_name,
        },
      })

    if (userError || !userData.user) {
      return Response.json(
        { error: userError?.message || "No se pudo crear el usuario" },
        { status: 400 }
      )
    }

    createdUserId = userData.user.id

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .insert({
        name: business_name,
        slug,
      })
      .select("id")
      .single()

    if (businessError || !businessData) {
      await supabase.auth.admin.deleteUser(createdUserId)

      return Response.json(
        { error: businessError?.message || "No se pudo crear el negocio" },
        { status: 400 }
      )
    }

    createdBusinessId = businessData.id

    const { error: profileError } = await supabase.from("profiles").insert({
      id: createdUserId,
      business_id: createdBusinessId,
      full_name,
      email,
      role: "owner",
    })

    if (profileError) {
      await supabase.from("businesses").delete().eq("id", createdBusinessId)
      await supabase.auth.admin.deleteUser(createdUserId)

      return Response.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    return Response.json(
      {
        success: true,
        user_id: createdUserId,
        business_id: createdBusinessId,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("CREATE CLIENT ERROR:", error)

    if (createdBusinessId) {
      await supabase.from("businesses").delete().eq("id", createdBusinessId)
    }

    if (createdUserId) {
      await supabase.auth.admin.deleteUser(createdUserId)
    }

    return Response.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}