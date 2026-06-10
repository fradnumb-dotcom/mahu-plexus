import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { id, full_name } = await req.json()

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: full_name || null,
      })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}