export type UserRole = "ADMIN" | "STAFF"

export type AppointmentStatus = "CONFIRMED" | "COMPLETED" | "CANCELLED"

export type CompensationType = "COMMISSION" | "SALARY" | "HYBRID"

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
}

export interface Service {
  id: string
  salon_id: string
  title: string
  description: string
  price: number
  duration_minutes: number
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
