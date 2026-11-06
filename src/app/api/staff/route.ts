import { NextResponse } from "next/server"
import { z } from "zod"

import {
  registerCustomStaff,
  removeCustomStaff,
  updateCustomStaff,
} from "@/lib/staff-store"
import { createClient } from "@/lib/supabase/server"
import type { Profile, WorkingHours } from "@/types"

const createStaffSchema = z.object({
  salon_id: z.string().min(1),
  name: z.string().trim().min(2, "Informe o nome completo do funcionário."),
  email: z.string().trim().email("Informe um e-mail válido."),
  phone: z.string().trim().min(8, "Informe o telefone/WhatsApp."),
  specialty: z.string().trim().min(2, "Informe a função ou especialidade."),
  document: z.string().trim().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  compensation_type: z.enum(["COMMISSION", "SALARY", "HYBRID"]),
  commission_rate: z.number().min(0).max(100),
  fixed_salary: z.number().min(0),
  work_days: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5, 6]),
  start_time: z.string().default("09:00"),
  end_time: z.string().default("18:00"),
  pause_start: z.string().nullable().default("12:00"),
  pause_end: z.string().nullable().default("13:00"),
})

const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional().nullable(),
  specialty: z.string().trim().optional().nullable(),
  document: z.string().trim().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  compensation_type: z.enum(["COMMISSION", "SALARY", "HYBRID"]).optional(),
  commission_rate: z.number().min(0).max(100).optional(),
  fixed_salary: z.number().min(0).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = createStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Campos inválidos." },
      { status: 422 }
    )
  }

  const data = parsed.data
  const staffId = crypto.randomUUID()

  const newProfile: Profile = {
    id: staffId,
    salon_id: data.salon_id,
    name: data.name,
    email: data.email.toLowerCase(),
    role: "STAFF",
    avatar_url: data.avatar_url ?? null,
    phone: data.phone,
    specialty: data.specialty,
    document: data.document ?? null,
    compensation_type: data.compensation_type,
    commission_rate: data.commission_rate,
    fixed_salary: data.fixed_salary,
  }

  const newWorkingHours: WorkingHours[] = data.work_days.map((day) => ({
    id: crypto.randomUUID(),
    staff_id: staffId,
    day_of_week: day,
    start_time: data.start_time,
    end_time: data.end_time,
    pause_start: data.pause_start,
    pause_end: data.pause_end,
  }))

  // Tenta persistir no Supabase (com colunas estendidas ou colunas base)
  try {
    const supabase = await createClient()
    const { error: fullInsertError } = await supabase.from("profiles").insert({
      id: newProfile.id,
      salon_id: newProfile.salon_id,
      name: newProfile.name,
      email: newProfile.email,
      role: "STAFF",
      avatar_url: newProfile.avatar_url,
      phone: newProfile.phone,
      specialty: newProfile.specialty,
      document: newProfile.document,
      compensation_type: newProfile.compensation_type,
      commission_rate: newProfile.commission_rate,
      fixed_salary: newProfile.fixed_salary,
    })

    if (fullInsertError) {
      await supabase.from("profiles").insert({
        id: newProfile.id,
        salon_id: newProfile.salon_id,
        name: newProfile.name,
        email: newProfile.email,
        role: "STAFF",
        avatar_url: newProfile.avatar_url,
      })
    }

    await supabase.from("working_hours").insert(
      newWorkingHours.map((wh) => ({
        id: wh.id,
        staff_id: wh.staff_id,
        day_of_week: wh.day_of_week,
        start_time: wh.start_time,
        end_time: wh.end_time,
        pause_start: wh.pause_start,
        pause_end: wh.pause_end,
      }))
    )
  } catch {
    // Fallback em memória garantido abaixo
  }

  registerCustomStaff(newProfile, newWorkingHours)

  return NextResponse.json(
    {
      profile: newProfile,
      workingHours: newWorkingHours,
    },
    { status: 201 }
  )
}

export async function PATCH(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }

  const parsed = updateStaffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Campos inválidos." },
      { status: 422 }
    )
  }

  const { id, ...patch } = parsed.data
  updateCustomStaff(id, patch)

  try {
    const supabase = await createClient()
    const { error } = await supabase.from("profiles").update(patch).eq("id", id)
    if (error) {
      await supabase
        .from("profiles")
        .update({
          ...(patch.name ? { name: patch.name } : {}),
          ...(patch.email ? { email: patch.email } : {}),
          ...(patch.avatar_url !== undefined
            ? { avatar_url: patch.avatar_url }
            : {}),
        })
        .eq("id", id)
    }
  } catch {
    // Atualizado no store
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório." }, { status: 400 })
  }

  removeCustomStaff(id)

  try {
    const supabase = await createClient()
    await supabase.from("working_hours").delete().eq("staff_id", id)
    await supabase.from("profiles").delete().eq("id", id)
  } catch {
    // Removido do store
  }

  return NextResponse.json({ ok: true })
}

