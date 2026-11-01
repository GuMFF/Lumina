import {
  MOCK_APPOINTMENTS,
  MOCK_PROFILES,
  MOCK_SALON,
  MOCK_SERVICES,
  MOCK_WORKING_HOURS,
} from "@/lib/mock-data"
import { createClient } from "@/lib/supabase/server"
import type {
  Appointment,
  Profile,
  Salon,
  Service,
  WorkingHours,
} from "@/types"

function trimTime(value: string | null): string | null {
  if (!value) return null
  return value.slice(0, 5)
}

export async function getSalonData(slug?: string): Promise<{
  salon: Salon | null
  profiles: Profile[]
  staff: Profile[]
  services: Service[]
  workingHours: WorkingHours[]
  appointments: Appointment[]
}> {
  try {
    const supabase = await createClient()

    const salonQuery = slug
      ? supabase.from("salons").select("*").eq("slug", slug).maybeSingle()
      : supabase.from("salons").select("*").limit(1).maybeSingle()

    const { data: salonRow, error: salonError } = await salonQuery

    if (salonError || !salonRow) {
      if (slug && slug !== MOCK_SALON.slug) {
        return {
          salon: null,
          profiles: [],
          staff: [],
          services: [],
          workingHours: [],
          appointments: [],
        }
      }
      return {
        salon: MOCK_SALON,
        profiles: MOCK_PROFILES,
        staff: MOCK_PROFILES.filter((p) => p.role === "STAFF"),
        services: MOCK_SERVICES,
        workingHours: MOCK_WORKING_HOURS,
        appointments: MOCK_APPOINTMENTS,
      }
    }

    const salon: Salon = {
      id: salonRow.id,
      name: salonRow.name,
      slug: salonRow.slug,
      logo_url: salonRow.logo_url,
      phone: salonRow.phone,
    }

    const [profilesRes, servicesRes, appointmentsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("salon_id", salon.id),
      supabase
        .from("services")
        .select("*")
        .eq("salon_id", salon.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("appointments")
        .select("*")
        .eq("salon_id", salon.id)
        .order("date_time", { ascending: true }),
    ])

    const profiles: Profile[] =
      profilesRes.data?.map((row) => ({
        id: row.id,
        salon_id: row.salon_id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar_url: row.avatar_url,
      })) ?? MOCK_PROFILES

    const staffList = profiles.filter((p) => p.role === "STAFF")
    const effectiveStaff = staffList.length > 0 ? staffList : profiles

    const staffIds = profiles.map((p) => p.id)
    const workingHoursRes =
      staffIds.length > 0
        ? await supabase
            .from("working_hours")
            .select("*")
            .in("staff_id", staffIds)
            .order("day_of_week", { ascending: true })
        : { data: [] }

    const workingHours: WorkingHours[] =
      workingHoursRes.data?.map((row) => ({
        id: row.id,
        staff_id: row.staff_id,
        day_of_week: Number(row.day_of_week),
        start_time: trimTime(row.start_time) ?? "09:00",
        end_time: trimTime(row.end_time) ?? "18:00",
        pause_start: trimTime(row.pause_start),
        pause_end: trimTime(row.pause_end),
      })) ?? MOCK_WORKING_HOURS

    const services: Service[] =
      servicesRes.data?.map((row) => ({
        id: row.id,
        salon_id: row.salon_id,
        title: row.title,
        description: row.description ?? "",
        price: Number(row.price),
        duration_minutes: Number(row.duration_minutes),
      })) ?? MOCK_SERVICES

    const appointments: Appointment[] =
      appointmentsRes.data?.map((row) => ({
        id: row.id,
        salon_id: row.salon_id,
        staff_id: row.staff_id,
        service_id: row.service_id,
        client_name: row.client_name,
        client_phone: row.client_phone,
        date_time: row.date_time,
        status: row.status,
      })) ?? MOCK_APPOINTMENTS

    return {
      salon,
      profiles,
      staff: effectiveStaff,
      services,
      workingHours,
      appointments,
    }
  } catch {
    return {
      salon: slug && slug !== MOCK_SALON.slug ? null : MOCK_SALON,
      profiles: MOCK_PROFILES,
      staff: MOCK_PROFILES.filter((p) => p.role === "STAFF"),
      services: MOCK_SERVICES,
      workingHours: MOCK_WORKING_HOURS,
      appointments: MOCK_APPOINTMENTS,
    }
  }
}

