import type { Appointment, Service, WorkingHours } from "@/types"

function parseMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function formatHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA
}

function isSameDay(isoDateTime: string, date: Date): boolean {
  const appointmentDate = new Date(isoDateTime)
  return (
    appointmentDate.getFullYear() === date.getFullYear() &&
    appointmentDate.getMonth() === date.getMonth() &&
    appointmentDate.getDate() === date.getDate()
  )
}

export interface GetAvailableSlotsInput {
  date: Date
  serviceDurationMinutes: number
  staffId: string
  workingHours: WorkingHours[]
  appointments: Appointment[]
  services?: Service[]
  stepMinutes?: number
}

export function getAvailableSlots({
  date,
  serviceDurationMinutes,
  staffId,
  workingHours,
  appointments,
  services = [],
  stepMinutes = 30,
}: GetAvailableSlotsInput): string[] {
  const dayOfWeek = date.getDay()
  const schedule = workingHours.find(
    (hours) => hours.staff_id === staffId && hours.day_of_week === dayOfWeek
  )

  if (!schedule) {
    return []
  }

  const workStart = parseMinutes(schedule.start_time)
  const workEnd = parseMinutes(schedule.end_time)
  const pauseStart = schedule.pause_start
    ? parseMinutes(schedule.pause_start)
    : null
  const pauseEnd = schedule.pause_end ? parseMinutes(schedule.pause_end) : null

  const busyRanges = appointments
    .filter(
      (appointment) =>
        appointment.staff_id === staffId &&
        appointment.status !== "CANCELLED" &&
        isSameDay(appointment.date_time, date)
    )
    .map((appointment) => {
      const appointmentDate = new Date(appointment.date_time)
      const start = appointmentDate.getHours() * 60 + appointmentDate.getMinutes()
      const duration =
        services.find((service) => service.id === appointment.service_id)
          ?.duration_minutes ?? serviceDurationMinutes
      return { start, end: start + duration }
    })

  const slots: string[] = []
  const now = new Date()
  const isToday = isSameDay(now.toISOString(), date)

  for (
    let slotStart = workStart;
    slotStart + serviceDurationMinutes <= workEnd;
    slotStart += stepMinutes
  ) {
    const slotEnd = slotStart + serviceDurationMinutes

    if (
      pauseStart !== null &&
      pauseEnd !== null &&
      rangesOverlap(slotStart, slotEnd, pauseStart, pauseEnd)
    ) {
      continue
    }

    const overlapsBusy = busyRanges.some((range) =>
      rangesOverlap(slotStart, slotEnd, range.start, range.end)
    )

    if (overlapsBusy) {
      continue
    }

    if (isToday && slotStart <= now.getHours() * 60 + now.getMinutes()) {
      continue
    }

    slots.push(formatHHMM(slotStart))
  }

  return slots
}
