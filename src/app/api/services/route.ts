import { NextResponse } from "next/server"
import { z } from "zod"

import {
  registerCustomService,
  removeCustomService,
  updateCustomService,
} from "@/lib/salon-store"
import { createClient } from "@/lib/supabase/server"
import type { Service } from "@/types"

const serviceItemSchema = z.object({
  salon_id: z.string().min(1),
  title: z.string().trim().min(2, "Informe o nome do serviço."),
  description: z.string().trim().default(""),
  price: z.number().min(0, "Informe um preço válido."),
  duration_minutes: z.number().min(5, "Duração mínima de 5 minutos."),
  category: z.string().trim().default("Geral"),
  image_url: z.string().nullable().optional(),
  promo_price: z.number().min(0).nullable().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
})

const updateServiceSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional(),
  price: z.number().min(0).optional(),
  duration_minutes: z.number().min(5).optional(),
  category: z.string().trim().optional(),
  image_url: z.string().nullable().optional(),
  promo_price: z.number().min(0).nullable().optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = serviceItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Campos inválidos." },
      { status: 422 }
    )
  }

  const data = parsed.data
  let createdService: Service = {
    id: crypto.randomUUID(),
    salon_id: data.salon_id,
    title: data.title,
    description: data.description,
    price: data.price,
    duration_minutes: data.duration_minutes,
    category: data.category || "Geral",
    image_url: data.image_url ?? null,
    promo_price: data.promo_price ?? null,
    featured: data.featured,
    active: data.active,
  }

  try {
    const supabase = await createClient()
    const { data: inserted, error: fullError } = await supabase
      .from("services")
      .insert({
        id: createdService.id,
        salon_id: createdService.salon_id,
        title: createdService.title,
        description: createdService.description,
        price: createdService.price,
        duration_minutes: createdService.duration_minutes,
        category: createdService.category,
        image_url: createdService.image_url,
        promo_price: createdService.promo_price,
        featured: createdService.featured,
        active: createdService.active,
      })
      .select("*")
      .single()

    if (fullError) {
      const { data: baseInserted } = await supabase
        .from("services")
        .insert({
          id: createdService.id,
          salon_id: createdService.salon_id,
          title: createdService.title,
          description: createdService.description,
          price: createdService.price,
          duration_minutes: createdService.duration_minutes,
        })
        .select("*")
        .single()

      if (baseInserted) {
        createdService = {
          ...createdService,
          id: baseInserted.id,
        }
      }
    } else if (inserted) {
      createdService = {
        ...createdService,
        id: inserted.id,
      }
    }
  } catch {
    // Fallback em memória garantido abaixo
  }

  const enriched = registerCustomService(createdService)
  return NextResponse.json({ service: enriched }, { status: 201 })
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = updateServiceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Campos inválidos." },
      { status: 422 }
    )
  }

  const { id, ...patch } = parsed.data
  updateCustomService(id, patch)

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("services").update(patch).eq("id", id)
    if (error) {
      const basePatch: Record<string, unknown> = {}
      if (patch.title !== undefined) basePatch.title = patch.title
      if (patch.description !== undefined)
        basePatch.description = patch.description
      if (patch.price !== undefined) basePatch.price = patch.price
      if (patch.duration_minutes !== undefined)
        basePatch.duration_minutes = patch.duration_minutes

      if (Object.keys(basePatch).length > 0) {
        await supabase.from("services").update(basePatch).eq("id", id)
      }
    }
  } catch {
    // Persistido no salon-store
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório." }, { status: 400 })
  }

  removeCustomService(id)

  try {
    const supabase = await createClient()
    await supabase.from("services").delete().eq("id", id)
  } catch {
    // Removido do salon-store
  }

  return NextResponse.json({ ok: true })
}

