import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      email,
      password,
      business_id,
      owner_id,
      full_name,
    } = body

    if (!email || !password || !business_id || !owner_id) {
      return new Response(
        JSON.stringify({ error: "Faltan datos obligatorios" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { data: ownerProfile, error: ownerError } = await supabase
      .from("profiles")
      .select("id, role, business_id")
      .eq("id", owner_id)
      .single()

    if (ownerError || !ownerProfile) {
      return new Response(
        JSON.stringify({ error: "No se pudo validar al dueño" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (ownerProfile.role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Solo el dueño puede crear vendedores" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    if (ownerProfile.business_id !== business_id) {
      return new Response(
        JSON.stringify({ error: "Negocio inválido" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: "Ese correo ya está registrado" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { data: createdUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || "",
          role: "seller",
        },
      })

    if (createError || !createdUser?.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || "No se pudo crear el usuario" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const newUserId = createdUser.user.id

    const { error: profileInsertError } = await supabase
      .from("profiles")
      .upsert([
        {
          id: newUserId,
          email,
          business_id,
          role: "seller",
          full_name: full_name || null,
        },
      ])

    if (profileInsertError) {
      await supabase.auth.admin.deleteUser(newUserId)

      return new Response(
        JSON.stringify({ error: "No se pudo crear el perfil del vendedor" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          email,
          role: "seller",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}