import type { CompensationType, Profile, WorkingHours } from "@/types"

interface StaffMetadata {
  phone?: string | null
  specialty?: string | null
  document?: string | null
  compensation_type: CompensationType
  commission_rate: number
  fixed_salary: number
  avatar_url?: string | null
}

// Armazena funcionários criados/atualizados em memória do servidor como complemento/fallback ao Supabase
const customProfilesMap = new Map<string, Profile>()
const customMetadataMap = new Map<string, StaffMetadata>()
const customWorkingHoursMap = new Map<string, WorkingHours[]>()
const deletedStaffIds = new Set<string>()

// Defaults de remuneração e especialidade para os funcionários iniciais do seed do banco
const DEFAULT_METADATA_BY_EMAIL: Record<string, StaffMetadata> = {
  "camila@lumina.studio": {
    phone: "(11) 97777-1020",
    specialty: "Especialista em Cortes & Coloração",
    compensation_type: "COMMISSION",
    commission_rate: 50,
    fixed_salary: 0,
  },
  "diego@lumina.studio": {
    phone: "(11) 96666-3040",
    specialty: "Master Barber",
    compensation_type: "HYBRID",
    commission_rate: 30,
    fixed_salary: 2000,
  },
  "helena@lumina.studio": {
    phone: "(11) 95555-5060",
    specialty: "Nail Designer & Spa",
    compensation_type: "SALARY",
    commission_rate: 0,
    fixed_salary: 2600,
  },
}

export function enrichProfileWithMetadata(profile: Profile): Profile {
  const custom = customProfilesMap.get(profile.id)
  if (custom) {
    return { ...profile, ...custom }
  }
  const meta =
    customMetadataMap.get(profile.id) ??
    DEFAULT_METADATA_BY_EMAIL[profile.email.toLowerCase()]

  return {
    ...profile,
    phone: profile.phone ?? meta?.phone ?? "(11) 99999-0000",
    specialty: profile.specialty ?? meta?.specialty ?? "Profissional de Beleza",
    document: profile.document ?? meta?.document ?? null,
    compensation_type:
      profile.compensation_type ?? meta?.compensation_type ?? "COMMISSION",
    commission_rate:
      profile.commission_rate !== undefined
        ? Number(profile.commission_rate)
        : (meta?.commission_rate ?? 40),
    fixed_salary:
      profile.fixed_salary !== undefined
        ? Number(profile.fixed_salary)
        : (meta?.fixed_salary ?? 0),
    avatar_url: profile.avatar_url ?? meta?.avatar_url ?? null,
  }
}

export function registerCustomStaff(
  profile: Profile,
  hours: WorkingHours[]
): void {
  deletedStaffIds.delete(profile.id)
  customProfilesMap.set(profile.id, profile)
  customMetadataMap.set(profile.id, {
    phone: profile.phone,
    specialty: profile.specialty,
    document: profile.document,
    compensation_type: profile.compensation_type ?? "COMMISSION",
    commission_rate: profile.commission_rate ?? 40,
    fixed_salary: profile.fixed_salary ?? 0,
    avatar_url: profile.avatar_url,
  })
  customWorkingHoursMap.set(profile.id, hours)
}

export function updateCustomStaff(
  id: string,
  patch: Partial<Profile>
): Profile | null {
  const existing = customProfilesMap.get(id)
  if (existing) {
    const updated = { ...existing, ...patch }
    customProfilesMap.set(id, updated)
  }
  const prevMeta = customMetadataMap.get(id) ?? {
    compensation_type: "COMMISSION" as CompensationType,
    commission_rate: 40,
    fixed_salary: 0,
  }
  customMetadataMap.set(id, {
    ...prevMeta,
    phone: patch.phone !== undefined ? patch.phone : prevMeta.phone,
    specialty:
      patch.specialty !== undefined ? patch.specialty : prevMeta.specialty,
    document: patch.document !== undefined ? patch.document : prevMeta.document,
    compensation_type:
      patch.compensation_type ?? prevMeta.compensation_type,
    commission_rate:
      patch.commission_rate !== undefined
        ? patch.commission_rate
        : prevMeta.commission_rate,
    fixed_salary:
      patch.fixed_salary !== undefined
        ? patch.fixed_salary
        : prevMeta.fixed_salary,
    avatar_url:
      patch.avatar_url !== undefined ? patch.avatar_url : prevMeta.avatar_url,
  })
  return customProfilesMap.get(id) ?? null
}

export function removeCustomStaff(id: string): void {
  deletedStaffIds.add(id)
  customProfilesMap.delete(id)
  customWorkingHoursMap.delete(id)
}

export function mergeCustomStaffIntoList(
  dbProfiles: Profile[],
  dbHours: WorkingHours[]
): { profiles: Profile[]; workingHours: WorkingHours[] } {
  const enrichedDb = dbProfiles
    .filter((p) => !deletedStaffIds.has(p.id))
    .map(enrichProfileWithMetadata)

  const existingIds = new Set(enrichedDb.map((p) => p.id))
  const extraProfiles: Profile[] = []
  for (const custom of customProfilesMap.values()) {
    if (!existingIds.has(custom.id) && !deletedStaffIds.has(custom.id)) {
      extraProfiles.push(custom)
    }
  }

  const allProfiles = [...enrichedDb, ...extraProfiles]
  const existingHourStaffIds = new Set(dbHours.map((h) => h.staff_id))
  const extraHours: WorkingHours[] = []
  for (const [staffId, hours] of customWorkingHoursMap.entries()) {
    if (!existingHourStaffIds.has(staffId) && !deletedStaffIds.has(staffId)) {
      extraHours.push(...hours)
    }
  }

  return {
    profiles: allProfiles,
    workingHours: [
      ...dbHours.filter((h) => !deletedStaffIds.has(h.staff_id)),
      ...extraHours,
    ],
  }
}

