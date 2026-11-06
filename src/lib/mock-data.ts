import type {
  Appointment,
  Profile,
  Salon,
  Service,
  WorkingHours,
} from "@/types"

export const MOCK_SALON: Salon = {
  id: "salon-1",
  name: "Lumina Studio",
  slug: "lumina",
  logo_url: null,
  phone: "(11) 98888-0101",
}

export const MOCK_PROFILES: Profile[] = [
  {
    id: "user-admin",
    salon_id: "salon-1",
    name: "Marina Alves",
    email: "marina@lumina.studio",
    role: "ADMIN",
    avatar_url: null,
    phone: "(11) 98888-0101",
    specialty: "Gestora & Hair Stylist",
    compensation_type: "SALARY",
    commission_rate: 0,
    fixed_salary: 4500,
  },
  {
    id: "user-staff-1",
    salon_id: "salon-1",
    name: "Camila Rocha",
    email: "camila@lumina.studio",
    role: "STAFF",
    avatar_url: null,
    phone: "(11) 97777-1020",
    specialty: "Especialista em Cortes & Coloração",
    compensation_type: "COMMISSION",
    commission_rate: 50,
    fixed_salary: 0,
  },
  {
    id: "user-staff-2",
    salon_id: "salon-1",
    name: "Diego Martins",
    email: "diego@lumina.studio",
    role: "STAFF",
    avatar_url: null,
    phone: "(11) 96666-3040",
    specialty: "Master Barber",
    compensation_type: "HYBRID",
    commission_rate: 30,
    fixed_salary: 2000,
  },
  {
    id: "user-staff-3",
    salon_id: "salon-1",
    name: "Helena Costa",
    email: "helena@lumina.studio",
    role: "STAFF",
    avatar_url: null,
    phone: "(11) 95555-5060",
    specialty: "Nail Designer & Spa",
    compensation_type: "SALARY",
    commission_rate: 0,
    fixed_salary: 2600,
  },
]

export const MOCK_SERVICES: Service[] = [
  {
    id: "svc-1",
    salon_id: "salon-1",
    title: "Corte feminino",
    description: "Corte, lavagem e finalização com consultoria de estilo.",
    price: 120,
    duration_minutes: 60,
  },
  {
    id: "svc-2",
    salon_id: "salon-1",
    title: "Barba completa",
    description: "Toalha quente, navalha e hidratação da barba.",
    price: 70,
    duration_minutes: 45,
  },
  {
    id: "svc-3",
    salon_id: "salon-1",
    title: "Manicure",
    description: "Cutilagem, esmaltação e hidratação das mãos.",
    price: 55,
    duration_minutes: 45,
  },
  {
    id: "svc-4",
    salon_id: "salon-1",
    title: "Pedicure spa",
    description: "Esfoliação, hidratação e esmaltação dos pés.",
    price: 80,
    duration_minutes: 60,
  },
  {
    id: "svc-5",
    salon_id: "salon-1",
    title: "Coloração",
    description: "Coloração profissional com tratamento de brilho.",
    price: 220,
    duration_minutes: 120,
  },
]

const weekdayHours = (
  staffId: string,
  days: number[],
  start = "09:00",
  end = "18:00"
): WorkingHours[] =>
  days.map((day, index) => ({
    id: `wh-${staffId}-${day}-${index}`,
    staff_id: staffId,
    day_of_week: day,
    start_time: start,
    end_time: end,
    pause_start: "12:00",
    pause_end: "13:00",
  }))

export const MOCK_WORKING_HOURS: WorkingHours[] = [
  ...weekdayHours("user-staff-1", [1, 2, 3, 4, 5, 6]),
  ...weekdayHours("user-staff-2", [1, 2, 3, 4, 5], "10:00", "19:00"),
  ...weekdayHours("user-staff-3", [2, 3, 4, 5, 6], "08:30", "17:30"),
]

function isoAt(daysFromToday: number, time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-1",
    salon_id: "salon-1",
    staff_id: "user-staff-1",
    service_id: "svc-1",
    client_name: "Ana Paula",
    client_phone: "11987654321",
    date_time: isoAt(0, "10:00"),
    status: "CONFIRMED",
  },
  {
    id: "apt-2",
    salon_id: "salon-1",
    staff_id: "user-staff-2",
    service_id: "svc-2",
    client_name: "Rafael Nunes",
    client_phone: "11991234567",
    date_time: isoAt(0, "11:00"),
    status: "CONFIRMED",
  },
  {
    id: "apt-3",
    salon_id: "salon-1",
    staff_id: "user-staff-3",
    service_id: "svc-3",
    client_name: "Beatriz Lima",
    client_phone: "11995551234",
    date_time: isoAt(0, "14:30"),
    status: "COMPLETED",
  },
  {
    id: "apt-4",
    salon_id: "salon-1",
    staff_id: "user-staff-1",
    service_id: "svc-5",
    client_name: "Juliana Pires",
    client_phone: "11993334444",
    date_time: isoAt(1, "09:30"),
    status: "CONFIRMED",
  },
  {
    id: "apt-5",
    salon_id: "salon-1",
    staff_id: "user-staff-2",
    service_id: "svc-4",
    client_name: "Carla Mendes",
    client_phone: "11990001111",
    date_time: isoAt(-1, "16:00"),
    status: "CANCELLED",
  },
]

export const MOCK_STAFF = MOCK_PROFILES.filter((profile) => profile.role === "STAFF")
