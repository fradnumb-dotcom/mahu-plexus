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
    const phone = String(body.phone || "").trim()
    const dni = String(body.dni || "").trim()
    const requireVerification = body.require_verification !== false // default true
    const redirectTo = String(body.redirect_to || "").trim()

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

    // ── Duplicate validation (friendly messages) ────────────────────
    // Email: check existing profiles
    const { data: emailDup } = await supabase
      .from("profiles").select("id").eq("email", email).maybeSingle()
    if (emailDup) {
      return Response.json({ error: "Este correo ya se encuentra registrado." }, { status: 409 })
    }

    // Phone & DNI: only check if provided and if columns exist (graceful)
    if (phone) {
      const { data: phoneDup, error: phoneErr } = await supabase
        .from("profiles").select("id").eq("phone", phone).maybeSingle()
      if (!phoneErr && phoneDup) {
        return Response.json({ error: "Este teléfono ya se encuentra registrado." }, { status: 409 })
      }
    }
    if (dni) {
      const { data: dniDup, error: dniErr } = await supabase
        .from("profiles").select("id").eq("dni", dni).maybeSingle()
      if (!dniErr && dniDup) {
        return Response.json({ error: "Este DNI ya se encuentra registrado." }, { status: 409 })
      }
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        // When verification is required, do NOT auto-confirm.
        // The confirmation email is sent separately below.
        email_confirm: !requireVerification,
        user_metadata: {
          full_name,
          business_name,
          phone,
          dni,
        },
      })

    if (userError || !userData.user) {
      const m = (userError?.message || "").toLowerCase()
      if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
        return Response.json({ error: "Este correo ya se encuentra registrado." }, { status: 409 })
      }
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

    // Insert profile. phone/dni are optional columns; if the schema doesn't
    // have them yet, retry without them so registration never breaks.
    let profileError = (await supabase.from("profiles").insert({
      id: createdUserId,
      business_id: createdBusinessId,
      full_name,
      email,
      phone: phone || null,
      dni: dni || null,
      role: "owner",
    })).error

    if (profileError && /column .*(phone|dni)/i.test(profileError.message || "")) {
      // Fallback: insert without the optional columns
      profileError = (await supabase.from("profiles").insert({
        id: createdUserId,
        business_id: createdBusinessId,
        full_name,
        email,
        role: "owner",
      })).error
    }

    if (profileError) {
      await supabase.from("businesses").delete().eq("id", createdBusinessId)
      await supabase.auth.admin.deleteUser(createdUserId)

      return Response.json(
        { error: profileError.message },
        { status: 400 }
      )
    }

    // Send verification email when required (production-ready, Supabase-native)
    let verificationSent = false
    if (requireVerification) {
      try {
        const { error: linkError } = await supabase.auth.admin.generateLink({
          type: "signup",
          email,
          password,
          options: redirectTo ? { redirectTo } : undefined,
        })
        // generateLink also triggers the confirmation email when SMTP is configured.
        if (!linkError) verificationSent = true
      } catch {
        // Non-fatal: account exists, user can request a resend from login.
        verificationSent = false
      }
    }

    return Response.json(
      {
        success: true,
        user_id: createdUserId,
        business_id: createdBusinessId,
        requires_verification: requireVerification,
        verification_sent: verificationSent,
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