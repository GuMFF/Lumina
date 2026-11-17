export type UserRole = "ADMIN" | "STAFF"

export type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED"

export type CompensationType = "COMMISSION" | "SALARY" | "HYBRID"

export type BusinessType =
  | "SALON"
  | "BARBERSHOP"
  | "AESTHETICS"
  | "NAILS"
  | "LASH_BROW"

export type AccentTheme = "rose" | "amber" | "emerald" | "violet" | "stone"

export interface Profile {
  id: string
  salon_id: string
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
  phone?: string | null
  specialty?: string | null
  document?: string | null
  compensation_type?: CompensationType
  commission_rate?: number
  fixed_salary?: number
}

export interface Salon {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string
  business_type?: BusinessType
  tagline?: string | null
  bio?: string | null
  cover_url?: string | null
  accent_color?: AccentTheme
  address?: string | null
  city?: string | null
  instagram?: string | null
  email?: string | null
  opening_hours_text?: string | null
  welcome_message?: string | null
  cancellation_policy?: string | null
  payment_methods?: string[]
  allow_any_staff?: boolean
  booking_horizon_days?: number
}

export interface Service {
  id: string
  salon_id: string
  title: string
  description: string
  price: number
  duration_minutes: number
  category?: string
  image_url?: string | null
  promo_price?: number | null
  featured?: boolean
  active?: boolean
}

export interface WorkingHours {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  pause_start: string | null
  pause_end: string | null
}

export interface Appointment {
  id: string
  salon_id: string
  staff_id: string
  service_id: string
  client_name: string
  client_phone: string
  date_time: string
  status: AppointmentStatus
}

export interface AppointmentWithRelations extends Appointment {
  service?: Service
  staff?: Profile
}
