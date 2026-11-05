"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock, Phone, UserRound } from "lucide-react"

import {
  formatLongDate,
  formatTime,
  STATUS_LABEL,
} from "@/lib/format"
import { MOCK_PROFILES, MOCK_SERVICES } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import type { Appointment, AppointmentStatus } from "@/types"

const FILTERS: Array<{ value: "ALL" | AppointmentStatus; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "CONFIRMED", label: "Confirmado" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
]

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  CONFIRMED:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
}

export function AgendaView({
  appointments,
  profiles = MOCK_PROFILES,
  services = MOCK_SERVICES,
}: {
  appointments: Appointment[]
  profiles?: typeof MOCK_PROFILES
  services?: typeof MOCK_SERVICES
}) {
  const [status, setStatus] = useState<"ALL" | AppointmentStatus>("ALL")
  const [staffOnly, setStaffOnly] = useState(false)

  useEffect(() => {
    setStaffOnly(window.localStorage.getItem("demo-role") === "STAFF")
  }, [])

  const defaultStaffId = useMemo(
    () => profiles.find((p) => p.role === "STAFF")?.id ?? profiles[0]?.id,
    [profiles]
  )

  const grouped = useMemo(() => {
    const scoped = staffOnly && defaultStaffId
      ? appointments.filter((item) => item.staff_id === defaultStaffId)
      : appointments
    const filtered =
      status === "ALL"
        ? scoped
        : scoped.filter((item) => item.status === status)

    const byDay = new Map<string, Appointment[]>()
    for (const appointment of filtered.sort(
      (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime()
    )) {
      const key = new Date(appointment.date_time).toDateString()
      byDay.set(key, [...(byDay.get(key) ?? []), appointment])
    }
    return Array.from(byDay.entries())
  }, [appointments, defaultStaffId, staffOnly, status])

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Agenda</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Agendamentos da equipe
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {staffOnly
              ? "Visualize os horários da sua agenda."
              : "Visualize os horários por data e profissional."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                status === filter.value
                  ? "bg-rose-700 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-amber-50/70 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-800"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
          Nenhum agendamento encontrado para este filtro.
        </div>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300">
              <CalendarDays className="size-4 text-amber-600" />
              {formatLongDate(items[0].date_time)}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((appointment) => {
                const staff = profiles.find(
                  (profile) => profile.id === appointment.staff_id
                )
                const service = services.find(
                  (item) => item.id === appointment.service_id
                )
                return (
                  <article
                    key={appointment.id}
                    className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{appointment.client_name}</p>
                        <p className="text-sm text-stone-500">
                          {service?.title ?? "Serviço"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_STYLES[appointment.status]
                        )}
                      >
                        {STATUS_LABEL[appointment.status]}
                      </span>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-amber-600" />
                        {formatTime(appointment.date_time)} ·{" "}
                        {service?.duration_minutes ?? 0} min
                      </div>
                      <div className="flex items-center gap-2">
                        <UserRound className="size-4 text-rose-600" />
                        {staff?.name ?? "Profissional"}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-stone-400" />
                        {appointment.client_phone}
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
