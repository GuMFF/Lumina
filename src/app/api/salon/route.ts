import { NextResponse } from "next/server"
import { z } from "zod"

import {
  sanitizeSlug,
  updateSalonCustomizations,
} from "@/lib/salon-store"
import { createClient } from "@/lib/supabase/server"
import { getSalonData } from "@/lib/supabase/queries"

const updateSalonSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(2, "Informe o nome do estabelecimento.").optional(),
  slug: z
    .string()
    .trim()
    .min(2, "O link personalizado deve ter pelo menos 2 caracteres.")
    .optional(),
  phone: z.string().trim().min(8, "Informe um telefone/WhatsApp válido.").optional(),
  logo_url: z.string().nullable().optional(),
  business_type: z
    .enum(["SALON", "BARBERSHOP", "AESTHETICS", "NAILS", "LASH_BROW"])
    .optional(),
  tagline: z.string().trim().nullable().optional(),
  bio: z.string().trim().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  accent_color: z
    .enum(["rose", "amber", "emerald", "violet", "stone"])
    .optional(),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  instagram: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  opening_hours_text: z.string().trim().nullable().optional(),
  welcome_message: z.string().trim().nullable().optional(),
  cancellation_policy: z.string().trim().nullable().optional(),
  payment_methods: z.array(z.string()).optional(),
  allow_any_staff: z.boolean().optional(),
  booking_horizon_days: z.number().min(1).max(90).optional(),
})

export async function GET() {
  const { salon } = await getSalonData()
  return NextResponse.json({ salon })
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = updateSalonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Campos inválidos." },
      { status: 422 }
    )
  }

  const patch = { ...parsed.data }

  if (patch.slug !== undefined) {
    const cleanSlug = sanitizeSlug(patch.slug)
    if (cleanSlug.length < 2) {
      return NextResponse.json(
        {
          error:
            "O link personalizado deve conter letras ou números válidos (ex: studio-marina).",
        },
        { status: 422 }
      )
    }
    patch.slug = cleanSlug
  }

  // Atualiza store em memória do servidor
  const updatedLocal = updateSalonCustomizations(patch)

  // Tenta persistir no Supabase (colunas estendidas e fallback para colunas base)
  try {
    const supabase = await createClient()
    const targetId = patch.id

    const dbPatch: Record<string, unknown> = {}
    if (patch.name !== undefined) dbPatch.name = patch.name
    if (patch.slug !== undefined) dbPatch.slug = patch.slug
    if (patch.phone !== undefined) dbPatch.phone = patch.phone
    if (patch.logo_url !== undefined) dbPatch.logo_url = patch.logo_url
    if (patch.business_type !== undefined)
      dbPatch.business_type = patch.business_type
    if (patch.tagline !== undefined) dbPatch.tagline = patch.tagline
    if (patch.bio !== undefined) dbPatch.bio = patch.bio
    if (patch.cover_url !== undefined) dbPatch.cover_url = patch.cover_url
    if (patch.accent_color !== undefined)
      dbPatch.accent_color = patch.accent_color
    if (patch.address !== undefined) dbPatch.address = patch.address
    if (patch.city !== undefined) dbPatch.city = patch.city
    if (patch.instagram !== undefined) dbPatch.instagram = patch.instagram
    if (patch.email !== undefined) dbPatch.email = patch.email
    if (patch.opening_hours_text !== undefined)
      dbPatch.opening_hours_text = patch.opening_hours_text
    if (patch.welcome_message !== undefined)
      dbPatch.welcome_message = patch.welcome_message
    if (patch.cancellation_policy !== undefined)
      dbPatch.cancellation_policy = patch.cancellation_policy
    if (patch.payment_methods !== undefined)
      dbPatch.payment_methods = patch.payment_methods
    if (patch.allow_any_staff !== undefined)
      dbPatch.allow_any_staff = patch.allow_any_staff
    if (patch.booking_horizon_days !== undefined)
      dbPatch.booking_horizon_days = patch.booking_horizon_days

    if (Object.keys(dbPatch).length > 0) {
      const query = targetId
        ? supabase.from("salons").update(dbPatch).eq("id", targetId)
        : supabase.from("salons").update(dbPatch).neq("id", "")

      const { error } = await query
      if (error) {
        // Fallback para colunas originais da tabela salons
        const basePatch: Record<string, unknown> = {}
        if (patch.name !== undefined) basePatch.name = patch.name
        if (patch.slug !== undefined) basePatch.slug = patch.slug
        if (patch.phone !== undefined) basePatch.phone = patch.phone
        if (patch.logo_url !== undefined) basePatch.logo_url = patch.logo_url

        if (Object.keys(basePatch).length > 0) {
          if (targetId) {
            await supabase.from("salons").update(basePatch).eq("id", targetId)
          }
        }
      }
    }
  } catch {
    // Persistido em memória no salon-store
  }

  const { salon } = await getSalonData()
  return NextResponse.json({ salon: salon ?? updatedLocal })
}

