"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Info,
  AtSign,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  Star,
  Tag,
  UserRound,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { getAvailableSlots } from "@/lib/booking-logic"
import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type {
  AccentTheme,
  Appointment,
  Profile,
  Salon,
  Service,
  WorkingHours,
} from "@/types"

const STEPS = ["Catálogo", "Profissional", "Horário", "Confirmação"]
const ANY_STAFF = "ANY"

const ACCENT_STYLES: Record<
  AccentTheme,
  {
    gradient: string
    button: string
    activeBorder: string
    activePill: string
    badgeText: string
  }
> = {
  rose: {
    gradient: "from-rose-700 via-rose-600 to-amber-600",
    button: "bg-rose-700 hover:bg-rose-600 text-white",
    activeBorder:
      "border-rose-500 bg-rose-50/70 dark:border-rose-600 dark:bg-rose-950/40",
    activePill: "bg-rose-700 text-white border-rose-700",
    badgeText: "text-rose-700 dark:text-rose-400",
  },
  amber: {
    gradient: "from-stone-900 via-amber-800 to-amber-600",
    button: "bg-amber-700 hover:bg-amber-600 text-white",
    activeBorder:
      "border-amber-500 bg-amber-50/70 dark:border-amber-600 dark:bg-amber-950/40",
    activePill: "bg-amber-700 text-white border-amber-700",
    badgeText: "text-amber-700 dark:text-amber-400",
  },
  emerald: {
    gradient: "from-emerald-800 via-emerald-700 to-teal-600",
    button: "bg-emerald-700 hover:bg-emerald-600 text-white",
    activeBorder:
      "border-emerald-500 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-950/40",
    activePill: "bg-emerald-700 text-white border-emerald-700",
    badgeText: "text-emerald-700 dark:text-emerald-400",
  },
  violet: {
    gradient: "from-violet-800 via-purple-700 to-fuchsia-600",
    button: "bg-violet-700 hover:bg-violet-600 text-white",
    activeBorder:
      "border-violet-500 bg-violet-50/70 dark:border-violet-600 dark:bg-violet-950/40",
    activePill: "bg-violet-700 text-white border-violet-700",
    badgeText: "text-violet-700 dark:text-violet-400",
  },
  stone: {
    gradient: "from-stone-950 via-stone-800 to-stone-700",
    button:
      "bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200",
    activeBorder:
      "border-stone-500 bg-stone-100/80 dark:border-stone-500 dark:bg-stone-800/60",
    activePill:
      "bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900",
    badgeText: "text-stone-800 dark:text-stone-300",
  },
}

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
  const allowAnyStaff = salon.allow_any_staff !== false
  const horizonDays = salon.booking_horizon_days ?? 14
  const accent = ACCENT_STYLES[salon.accent_color ?? "rose"] ?? ACCENT_STYLES.rose

  const [step, setStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [serviceId, setServiceId] = useState<string>()
  const [staffId, setStaffId] = useState<string>(
    allowAnyStaff ? ANY_STAFF : (staff[0]?.id ?? ANY_STAFF)
  )
  const [date, setDate] = useState<Date>(() => nextDays(1)[0])
  const [slot, setSlot] = useState<string>()
  const [resolvedStaffId, setResolvedStaffId] = useState<string>()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Filtra apenas serviços visíveis no catálogo público e ordena destaques primeiro
  const visibleServices = useMemo(() => {
    return services
      .filter((s) => s.active !== false)
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
  }, [services])

  const catalogCategories = useMemo(() => {
    return Array.from(
      new Set(visibleServices.map((s) => s.category ?? "Geral"))
    )
  }, [visibleServices])

  const filteredCatalogServices = useMemo(() => {
    return visibleServices.filter((svc) => {
      const matchesCat =
        selectedCategory === "ALL" ||
        (svc.category ?? "Geral") === selectedCategory
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        svc.title.toLowerCase().includes(q) ||
        svc.description.toLowerCase().includes(q) ||
        (svc.category ?? "").toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [selectedCategory, searchQuery, visibleServices])

  const selectedService = visibleServices.find(
    (service) => service.id === serviceId
  )
  const days = useMemo(() => nextDays(horizonDays), [horizonDays])

  const slotOptions = useMemo(() => {
    if (!selectedService) {
      return [] as Array<{ time: string; staffId: string; staffName: string }>
    }

    const candidates =
      staffId === ANY_STAFF
        ? staff
        : staff.filter((member) => member.id === staffId)

    return candidates.flatMap((member) => {
      const times = getAvailableSlots({
        date,
        serviceDurationMinutes: selectedService.duration_minutes,
        staffId: member.id,
        workingHours,
        appointments,
        services: visibleServices,
      })
      return times.map((time) => ({
        time,
        staffId: member.id,
        staffName: member.name,
      }))
    })
  }, [
    appointments,
    date,
    selectedService,
    staff,
    staffId,
    visibleServices,
    workingHours,
  ])

  function getEffectivePrice(service: Service): number {
    if (
      service.promo_price !== undefined &&
      service.promo_price !== null &&
      service.promo_price > 0 &&
      service.promo_price < service.price
    ) {
      return service.promo_price
    }
    return service.price
  }

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

  const salonWhatsappHref = useMemo(() => {
    const digits = (salon.phone ?? "").replace(/\D/g, "")
    if (!digits) return null
    const fullNumber = digits.startsWith("55") ? digits : `55${digits}`
    const text = selectedService
      ? `Olá, ${salon.name}! Acabei de agendar *${selectedService.title}* com *${selectedStaffName}* para *${date.toLocaleDateString("pt-BR")} às ${slot}*. Meu nome é ${name}.`
      : `Olá, ${salon.name}! Gostaria de tirar uma dúvida sobre agendamento.`
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(text)}`
  }, [date, name, salon.name, salon.phone, selectedService, selectedStaffName, slot])

  return (
    <div className="mx-auto w-full max-w-xl pb-12 text-stone-900 dark:text-stone-50">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Agendamento Online · {salon.name}
        </span>
        <ThemeToggle />
      </div>

      {/* Cabeçalho Personalizado do Estabelecimento */}
      <header className="mb-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div
          className={cn(
            "relative h-28 w-full bg-gradient-to-r sm:h-32",
            accent.gradient
          )}
        >
          {salon.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={salon.cover_url}
              alt={salon.name}
              className="size-full object-cover opacity-85"
            />
          ) : null}
        </div>

        <div className="relative px-5 pb-5">
          <div className="-mt-8 mb-3 flex items-end justify-between gap-2">
            <div
              className={cn(
                "flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br text-white shadow-md dark:border-stone-900",
                accent.gradient
              )}
            >
              {salon.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={salon.logo_url}
                  alt={salon.name}
                  className="size-full object-cover"
                />
              ) : (
                <Sparkles className="size-6" />
              )}
            </div>

            {salon.phone ? (
              <a
                href={`https://wa.me/55${salon.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              >
                <Phone className="size-3.5 text-emerald-600" />
                {salon.phone}
              </a>
            ) : null}
          </div>

          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {salon.name}
          </h1>
          {salon.tagline ? (
            <p className={cn("mt-0.5 text-xs font-semibold", accent.badgeText)}>
              {salon.tagline}
            </p>
          ) : null}
          {salon.bio ? (
            <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              {salon.bio}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
            {salon.opening_hours_text ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-amber-600" />
                {salon.opening_hours_text}
              </span>
            ) : null}
            {salon.address ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-rose-600" />
                {salon.address}
                {salon.city ? ` · ${salon.city}` : ""}
              </span>
            ) : null}
            {salon.instagram ? (
              <span className="inline-flex items-center gap-1.5">
                <AtSign className="size-3.5 text-pink-600" />
                {salon.instagram}
              </span>
            ) : null}
          </div>

          {salon.payment_methods && salon.payment_methods.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <CreditCard className="size-3.5 text-stone-400" />
              {salon.payment_methods.map((method) => (
                <span
                  key={method}
                  className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                >
                  {method}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {/* Barra de Progresso */}
      <ol className="mb-5 grid grid-cols-4 gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className="text-center">
            <div
              className={cn(
                "mx-auto mb-1 h-1.5 rounded-full transition-colors",
                index <= step
                  ? accent.button.split(" ")[0]
                  : "bg-stone-200 dark:bg-stone-800"
              )}
            />
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              {label}
            </span>
          </li>
        ))}
      </ol>

      {/* PASSO 0: CATÁLOGO DE SERVIÇOS */}
      {step === 0 ? (
        <div className="space-y-4">
          {salon.welcome_message ? (
            <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 px-4 py-3 text-xs text-stone-700 dark:border-amber-900/40 dark:bg-stone-900 dark:text-stone-300">
              {salon.welcome_message}
            </div>
          ) : null}

          {/* Abas de Categorias e Busca no Catálogo */}
          {catalogCategories.length > 1 || visibleServices.length > 4 ? (
            <div className="space-y-2.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedCategory === "ALL"
                      ? accent.activePill
                      : "border-stone-200 bg-white text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                  )}
                >
                  Todos ({visibleServices.length})
                </button>
                {catalogCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                      selectedCategory === cat
                        ? accent.activePill
                        : "border-stone-200 bg-white text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar serviço no catálogo..."
                  className="min-h-10 w-full rounded-xl border border-stone-200 bg-white pr-3 pl-9 text-xs outline-none focus:ring-2 focus:ring-rose-600 dark:border-stone-800 dark:bg-stone-900"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {filteredCatalogServices.map((service) => {
              const hasPromo =
                service.promo_price !== undefined &&
                service.promo_price !== null &&
                service.promo_price > 0 &&
                service.promo_price < service.price

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setServiceId(service.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    serviceId === service.id
                      ? accent.activeBorder
                      : "border-stone-200 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    {service.image_url ? (
                      <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:size-20 dark:bg-stone-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        {service.category ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                            <Tag className="size-2.5" />
                            {service.category}
                          </span>
                        ) : null}
                        {service.featured ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                            <Star className="size-2.5 fill-amber-500 text-amber-500" />
                            Mais pedido
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{service.title}</p>
                        <div className="shrink-0 text-right">
                          {hasPromo ? (
                            <div>
                              <span className="block text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(service.promo_price!)}
                              </span>
                              <span className="block text-[11px] text-stone-400 line-through">
                                {formatCurrency(service.price)}
                              </span>
                            </div>
                          ) : (
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                              {formatCurrency(service.price)}
                            </p>
                          )}
                        </div>
                      </div>

                      {service.description ? (
                        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                          {service.description}
                        </p>
                      ) : null}

                      <p className="mt-2.5 inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                        <Clock className="size-3.5 text-amber-600" />
                        {service.duration_minutes} minutos
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* PASSO 1: ESCOLHA DO PROFISSIONAL */}
      {step === 1 ? (
        <div className="space-y-3">
          {allowAnyStaff ? (
            <button
              type="button"
              onClick={() => setStaffId(ANY_STAFF)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left",
                staffId === ANY_STAFF
                  ? accent.activeBorder
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              )}
            >
              <p className="font-medium">Qualquer profissional disponível</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Vamos mostrar todos os horários livres da equipe.
              </p>
            </button>
          ) : null}
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setStaffId(member.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left",
                staffId === member.id
                  ? accent.activeBorder
                  : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-100/80 text-rose-700 dark:bg-stone-800 dark:text-amber-300">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="size-full object-cover"
                  />
                ) : (
                  <UserRound className="size-5" />
                )}
              </span>
              <span>
                <span className="block font-medium">{member.name}</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400">
                  {member.specialty ?? "Especialista"}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* PASSO 2: DATA E HORÁRIO */}
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
                    "min-w-16 rounded-2xl border px-3 py-2 text-center transition-colors",
                    selected
                      ? accent.activePill
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
              Sem horários livres neste dia. Escolha outra data acima.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {slotOptions.map((option) => {
                const selected =
                  slot === option.time &&
                  (staffId !== ANY_STAFF ||
                    resolvedStaffId === option.staffId)
                return (
                  <button
                    key={`${option.staffId}-${option.time}`}
                    type="button"
                    onClick={() => {
                      setSlot(option.time)
                      setResolvedStaffId(option.staffId)
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                      selected
                        ? accent.activePill
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

      {/* PASSO 3: CONFIRMAÇÃO E DADOS DO CLIENTE */}
      {step === 3 && selectedService && slot ? (
        <form onSubmit={confirm} className="space-y-4">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{selectedService.title}</p>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  Profissional: {selectedStaffName}
                </p>
              </div>
              <span className="font-bold text-amber-800 dark:text-amber-300">
                {formatCurrency(getEffectivePrice(selectedService))}
              </span>
            </div>
            <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
              <CalendarDays className="size-4 text-amber-600" />
              {date.toLocaleDateString("pt-BR")} às {slot} (
              {selectedService.duration_minutes} min)
            </p>
          </div>

          {salon.cancellation_policy ? (
            <div className="flex items-start gap-2 rounded-2xl border border-stone-200/80 bg-stone-100/70 p-3.5 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>{salon.cancellation_policy}</span>
            </div>
          ) : null}

          <label className="grid gap-1 text-sm">
            Seu nome completo
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-600 dark:border-stone-700 dark:bg-stone-900"
              placeholder="Digite seu nome"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Seu WhatsApp
            <input
              required
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-rose-600 dark:border-stone-700 dark:bg-stone-900"
              placeholder="(11) 99999-9999"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !canAdvance()}
            className={cn(
              "flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold disabled:opacity-60",
              accent.button
            )}
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
            className="inline-flex items-center gap-1 text-sm text-stone-500 disabled:opacity-40 dark:text-stone-400"
          >
            <ChevronLeft className="size-4" />
            Voltar
          </button>
          <button
            type="button"
            disabled={!canAdvance()}
            onClick={() => setStep((current) => current + 1)}
            className={cn(
              "inline-flex items-center gap-1 rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50",
              accent.button
            )}
          >
            Continuar
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl dark:bg-stone-900">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold">
              Agendamento Confirmado!
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              <strong>{selectedService?.title}</strong> com{" "}
              <strong>{selectedStaffName}</strong> em{" "}
              {date.toLocaleDateString("pt-BR")} às {slot} no{" "}
              <strong>{salon.name}</strong>.
            </p>

            <div className="mt-5 space-y-2">
              {salonWhatsappHref ? (
                <a
                  href={salonWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  <MessageCircle className="size-4" />
                  Enviar comprovante no WhatsApp
                </a>
              ) : null}

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
                className={cn(
                  "w-full rounded-xl py-2.5 text-sm font-medium",
                  accent.button
                )}
              >
                Fazer outro agendamento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
