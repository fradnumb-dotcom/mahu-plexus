import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { email, password, full_name, business_name } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (userError) {
      return new Response(
        JSON.stringify({ error: userError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const userId = userData.user.id

    const { data: businessData, error: businessError } =
      await supabase
        .from("businesses")
        .insert({
          name: business_name,
          slug: business_name.toLowerCase().replace(/\s+/g, "-"),
        })
        .select()
        .single()

    if (businessError) {
      return new Response(
        JSON.stringify({ error: businessError.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        business_id: businessData.id,
        full_name,
        role: "admin",
      })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: profileError.message }),
        {
          status: 400,
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