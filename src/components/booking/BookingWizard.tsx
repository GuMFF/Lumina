"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  UserRound,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { getAvailableSlots } from "@/lib/booking-logic"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type {
  Appointment,
  Profile,
  Salon,
  Service,
  WorkingHours,
} from "@/types"

const STEPS = ["Serviço", "Profissional", "Horário", "Confirmação"]
const ANY_STAFF = "ANY"

interface BookingWizardProps {
  salon: Salon
  services: Service[]
  staff: Profile[]
  workingHours: WorkingHours[]
  appointments: Appointment[]
}

function nextDays(count = 14): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index)
    return date
  })
}

export function BookingWizard({
  salon,
  services,
  staff,
  workingHours,
  appointments,
}: BookingWizardProps) {
  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState<string>()
  const [staffId, setStaffId] = useState<string>(ANY_STAFF)
  const [date, setDate] = useState<Date>(nextDays(1)[0])
  const [slot, setSlot] = useState<string>()
  const [resolvedStaffId, setResolvedStaffId] = useState<string>()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const selectedService = services.find((service) => service.id === serviceId)
  const days = useMemo(() => nextDays(10), [])

  const slotOptions = useMemo(() => {
    if (!selectedService) {
      return [] as Array<{ time: string; staffId: string; staffName: string }>
    }

    const candidates =
      staffId === ANY_STAFF ? staff : staff.filter((member) => member.id === staffId)

    return candidates.flatMap((member) => {
      const times = getAvailableSlots({
        date,
        serviceDurationMinutes: selectedService.duration_minutes,
        staffId: member.id,
        workingHours,
        appointments,
        services,
      })
      return times.map((time) => ({
        time,
        staffId: member.id,
        staffName: member.name,
      }))
    })
  }, [appointments, date, selectedService, services, staff, staffId, workingHours])

  function canAdvance() {
    if (step === 0) return Boolean(serviceId)
    if (step === 1) return Boolean(staffId)
    if (step === 2) return Boolean(slot)
    return name.trim().length > 1 && phone.replace(/\D/g, "").length >= 10
  }

  async function confirm(event: FormEvent) {
    event.preventDefault()
    if (!selectedService || !slot) return
    setSubmitting(true)
    const [hours, minutes] = slot.split(":").map(Number)
    const appointmentDate = new Date(date)
    appointmentDate.setHours(hours, minutes, 0, 0)
    const targetStaffId = resolvedStaffId ?? staffId

    const supabase = createClient()
    await supabase.from("appointments").insert({
      salon_id: salon.id,
      staff_id: targetStaffId,
      service_id: selectedService.id,
      client_name: name.trim(),
      client_phone: phone.trim(),
      date_time: appointmentDate.toISOString(),
      status: "CONFIRMED",
    })

    setSubmitting(false)
    setSuccess(true)
  }

  const selectedStaffName =
    staff.find((member) => member.id === (resolvedStaffId ?? staffId))?.name ??
    "Qualquer profissional"

  return (
    <div className="mx-auto w-full max-w-lg pb-10 text-stone-900 dark:text-stone-50">
      <div className="mb-2 flex justify-end">
        <ThemeToggle />
      </div>
      <header className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-700 to-amber-600 text-white shadow-lg shadow-rose-700/25">
          <Sparkles className="size-5" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{salon.name}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">Agende em poucos passos</p>
      </header>

      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="text-center">
            <div
              className={cn(
                "mx-auto mb-1 h-1.5 rounded-full",
                index <= step ? "bg-rose-700" : "bg-stone-200 dark:bg-stone-800"
              )}
            />
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="space-y-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setServiceId(service.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                serviceId === service.id
                  ? "border-rose-400 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/40"
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{service.title}</p>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{service.description}</p>
                </div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  {formatCurrency(service.price)}
                </p>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                <Clock className="size-3.5 text-amber-600" />
                {service.duration_minutes} minutos
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStaffId(ANY_STAFF)}
            className={cn(
              "w-full rounded-2xl border p-4 text-left",
              staffId === ANY_STAFF
                ? "border-rose-400 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/40"
                : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
            )}
          >
            <p className="font-medium">Qualquer profissional disponível</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Vamos escolher o primeiro horário livre.
            </p>
          </button>
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setStaffId(member.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left",
                staffId === member.id
                  ? "border-rose-400 bg-rose-50/70 dark:border-rose-700 dark:bg-rose-950/40"
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              )}
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100/80 text-rose-700 dark:bg-stone-800 dark:text-amber-300">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-4" />
                )}
              </span>
              <span>
                <span className="block font-medium">{member.name}</span>
                <span className="block text-sm text-stone-500 dark:text-stone-400">
                  {member.specialty ?? "Prestador"}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day) => {
              const selected = day.toDateString() === date.toDateString()
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    setDate(day)
                    setSlot(undefined)
                  }}
                  className={cn(
                    "min-w-16 rounded-2xl border px-3 py-2 text-center",
                    selected
                      ? "border-rose-600 bg-rose-700 text-white"
                      : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                  )}
                >
                  <span className="block text-[11px] uppercase">
                    {day.toLocaleDateString("pt-BR", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-semibold">{day.getDate()}</span>
                </button>
              )
            })}
          </div>

          {slotOptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-800 dark:text-stone-400">
              Sem horários livres neste dia. Escolha outra data.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {slotOptions.map((option) => {
                const selected =
                  slot === option.time &&
                  (staffId !== ANY_STAFF || resolvedStaffId === option.staffId)
                return (
                  <button
                    key={`${option.staffId}-${option.time}`}
                    type="button"
                    onClick={() => {
                      setSlot(option.time)
                      setResolvedStaffId(option.staffId)
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-sm font-medium",
                      selected
                        ? "border-rose-600 bg-rose-700 text-white"
                        : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                    )}
                  >
                    {option.time}
                    {staffId === ANY_STAFF ? (
                      <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                        {option.staffName.split(" ")[0]}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {step === 3 && selectedService && slot ? (
        <form onSubmit={confirm} className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm dark:border-stone-800 dark:bg-stone-900">
            <p className="font-medium">{selectedService.title}</p>
            <p className="mt-1 text-stone-500 dark:text-stone-400">{selectedStaffName}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-stone-600 dark:text-stone-300">
              <CalendarDays className="size-4 text-amber-600" />
              {date.toLocaleDateString("pt-BR")} às {slot}
            </p>
          </div>
          <label className="grid gap-1 text-sm">
            Nome
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-900"
              placeholder="Seu nome completo"
            />
          </label>
          <label className="grid gap-1 text-sm">
            WhatsApp
            <input
              required
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-900"
              placeholder="(11) 99999-9999"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !canAdvance()}
            className="flex w-full items-center justify-center rounded-xl bg-rose-700 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {submitting ? "Confirmando..." : "Confirmar agendamento"}
          </button>
        </form>
      ) : null}

      {step < 3 ? (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Voltar
          </button>
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep((current) => current + 1)}
            className="inline-flex items-center gap-1 rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            Continuar
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl dark:bg-stone-900">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold">
              Agendamento Realizado com Sucesso!
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {selectedService?.title} com {selectedStaffName} em{" "}
              {date.toLocaleDateString("pt-BR")} às {slot}.
            </p>
            <button
              type="button"
              onClick={() => {
                setSuccess(false)
                setStep(0)
                setServiceId(undefined)
                setSlot(undefined)
                setName("")
                setPhone("")
              }}
              className="mt-5 w-full rounded-xl bg-rose-700 py-2.5 text-sm font-medium text-white hover:bg-rose-600"
            >
              Fazer outro agendamento
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
