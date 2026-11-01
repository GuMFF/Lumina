import type { AppointmentStatus } from "@/types"

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateLong = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
})

const dateShort = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
})

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
})

export function formatCurrency(value: number): string {
  return currency.format(value)
}

export function formatLongDate(value: string | Date): string {
  return dateLong.format(new Date(value))
}

export function formatShortDate(value: string | Date): string {
  return dateShort.format(new Date(value))
}

export function formatTime(value: string | Date): string {
  return timeFmt.format(new Date(value))
}

export function weekdayLabel(day: number): string {
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][day] ?? ""
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
}
