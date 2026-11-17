import {
  MOCK_APPOINTMENTS,
  MOCK_PROFILES,
  MOCK_SALON,
  MOCK_SERVICES,
  MOCK_WORKING_HOURS,
} from "@/lib/mock-data"
import {
  enrichSalonWithCustomizations,
  matchesKnownSalonSlug,
  mergeCustomServicesIntoList,
} from "@/lib/salon-store"
import { mergeCustomStaffIntoList } from "@/lib/staff-store"
import { createClient } from "@/lib/supabase/server"
import type {
  AccentTheme,
  Appointment,
  BusinessType,
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

    let { data: salonRow, error: salonError } = slug
      ? await supabase.from("salons").select("*").eq("slug", slug).maybeSingle()
      : await supabase.from("salons").select("*").limit(1).maybeSingle()

    // Se o dono personalizou o slug em memória ou se buscou por um slug alternativo/anterior,
    // busca o estabelecimento principal caso a query por slug exato não retorne linha
    if ((!salonRow || salonError) && slug) {
      const fallbackRes = await supabase
        .from("salons")
        .select("*")
        .limit(1)
        .maybeSingle()

      if (
        fallbackRes.data &&
        matchesKnownSalonSlug(slug, fallbackRes.data.slug)
      ) {
        salonRow = fallbackRes.data
        salonError = null
      }
    }

    if (salonError || !salonRow) {
      if (slug && !matchesKnownSalonSlug(slug, MOCK_SALON.slug)) {
        return {
          salon: null,
          profiles: [],
          staff: [],
          services: [],
          workingHours: [],
          appointments: [],
        }
      }
      const merged = mergeCustomStaffIntoList(MOCK_PROFILES, MOCK_WORKING_HOURS)
      return {
        salon: enrichSalonWithCustomizations(MOCK_SALON),
        profiles: merged.profiles,
        staff: merged.profiles.filter((p) => p.role === "STAFF"),
        services: mergeCustomServicesIntoList(MOCK_SERVICES),
        workingHours: merged.workingHours,
        appointments: MOCK_APPOINTMENTS,
      }
    }

    const rawSalon: Salon = {
      id: salonRow.id,
      name: salonRow.name,
      slug: salonRow.slug,
      logo_url: salonRow.logo_url,
      phone: salonRow.phone,
      business_type: (salonRow.business_type as BusinessType) ?? undefined,
      tagline: salonRow.tagline ?? undefined,
      bio: salonRow.bio ?? undefined,
      cover_url: salonRow.cover_url ?? undefined,
      accent_color: (salonRow.accent_color as AccentTheme) ?? undefined,
      address: salonRow.address ?? undefined,
      city: salonRow.city ?? undefined,
      instagram: salonRow.instagram ?? undefined,
      email: salonRow.email ?? undefined,
      opening_hours_text: salonRow.opening_hours_text ?? undefined,
      welcome_message: salonRow.welcome_message ?? undefined,
      cancellation_policy: salonRow.cancellation_policy ?? undefined,
      payment_methods: Array.isArray(salonRow.payment_methods)
        ? salonRow.payment_methods
        : undefined,
      allow_any_staff:
        typeof salonRow.allow_any_staff === "boolean"
          ? salonRow.allow_any_staff
          : undefined,
      booking_horizon_days:
        salonRow.booking_horizon_days !== undefined &&
        salonRow.booking_horizon_days !== null
          ? Number(salonRow.booking_horizon_days)
          : undefined,
    }

    const salon = enrichSalonWithCustomizations(rawSalon)

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

    const rawProfiles: Profile[] =
      profilesRes.data?.map((row) => ({
        id: row.id,
        salon_id: row.salon_id,
        name: row.name,
        email: row.email,
        role: row.role,
        avatar_url: row.avatar_url,
        phone: row.phone ?? undefined,
        specialty: row.specialty ?? undefined,
        document: row.document ?? undefined,
        compensation_type: row.compensation_type ?? undefined,
        commission_rate:
          row.commission_rate !== undefined && row.commission_rate !== null
            ? Number(row.commission_rate)
            : undefined,
        fixed_salary:
          row.fixed_salary !== undefined && row.fixed_salary !== null
            ? Number(row.fixed_salary)
            : undefined,
      })) ?? MOCK_PROFILES

    const staffIds = rawProfiles.map((p) => p.id)
    const workingHoursRes =
      staffIds.length > 0
        ? await supabase
            .from("working_hours")
            .select("*")
            .in("staff_id", staffIds)
            .order("day_of_week", { ascending: true })
        : { data: [] }

    const rawWorkingHours: WorkingHours[] =
      workingHoursRes.data?.map((row) => ({
        id: row.id,
        staff_id: row.staff_id,
        day_of_week: Number(row.day_of_week),
        start_time: trimTime(row.start_time) ?? "09:00",
        end_time: trimTime(row.end_time) ?? "18:00",
        pause_start: trimTime(row.pause_start),
        pause_end: trimTime(row.pause_end),
      })) ?? MOCK_WORKING_HOURS

    const merged = mergeCustomStaffIntoList(rawProfiles, rawWorkingHours)
    const staffList = merged.profiles.filter((p) => p.role === "STAFF")
    const effectiveStaff = staffList.length > 0 ? staffList : merged.profiles

    const rawServices: Service[] =
      servicesRes.data?.map((row) => ({
        id: row.id,
        salon_id: row.salon_id,
        title: row.title,
        description: row.description ?? "",
        price: Number(row.price),
        duration_minutes: Number(row.duration_minutes),
        category: row.category ?? undefined,
        image_url: row.image_url ?? undefined,
        promo_price:
          row.promo_price !== undefined && row.promo_price !== null
            ? Number(row.promo_price)
            : undefined,
        featured:
          typeof row.featured === "boolean" ? row.featured : undefined,
        active: typeof row.active === "boolean" ? row.active : undefined,
      })) ?? MOCK_SERVICES

    const services = mergeCustomServicesIntoList(rawServices)

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
      profiles: merged.profiles,
      staff: effectiveStaff,
      services,
      workingHours: merged.workingHours,
      appointments,
    }
  } catch {
    const merged = mergeCustomStaffIntoList(MOCK_PROFILES, MOCK_WORKING_HOURS)
    return {
      salon:
        slug && !matchesKnownSalonSlug(slug, MOCK_SALON.slug)
          ? null
          : enrichSalonWithCustomizations(MOCK_SALON),
      profiles: merged.profiles,
      staff: merged.profiles.filter((p) => p.role === "STAFF"),
      services: mergeCustomServicesIntoList(MOCK_SERVICES),
      workingHours: merged.workingHours,
      appointments: MOCK_APPOINTMENTS,
    }
  }
}
