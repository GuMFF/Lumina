"use client"

import { useState } from "react"
import { Clock3, UserRound } from "lucide-react"

import { weekdayLabel } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Profile, WorkingHours } from "@/types"

interface TeamViewProps {
  staff: Profile[]
  initialHours: WorkingHours[]
}

export function TeamView({ staff, initialHours }: TeamViewProps) {
  const [hours, setHours] = useState(initialHours)
  const [selectedId, setSelectedId] = useState(staff[0]?.id)

  const selectedHours = hours.filter((item) => item.staff_id === selectedId)

  async function updateHour(id: string, patch: Partial<WorkingHours>) {
    setHours((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    )
    const supabase = createClient()
    await supabase.from("working_hours").update(patch).eq("id", id)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Equipe</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Prestadores e horários
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Ajuste rapidamente a jornada de cada profissional.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {staff.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedId(member.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                selectedId === member.id
                  ? "border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/40"
                  : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
              )}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-amber-100/80 text-rose-700 dark:bg-stone-800 dark:text-amber-300">
                <UserRound className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{member.name}</span>
                <span className="block text-xs text-stone-500">{member.email}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Clock3 className="size-4 text-amber-600" />
            Grade semanal
          </div>
          <div className="space-y-3">
            {selectedHours.length === 0 ? (
              <p className="text-sm text-stone-500">
                Este profissional ainda não possui horários cadastrados.
              </p>
            ) : (
              selectedHours.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-2 rounded-xl bg-stone-50 p-3 text-sm dark:bg-stone-950 md:grid-cols-[70px_1fr_1fr]"
                >
                  <p className="pt-2 font-medium">{weekdayLabel(item.day_of_week)}</p>
                  <label className="grid gap-1 text-xs text-stone-500">
                    Expediente
                    <span className="flex gap-2">
                      <input
                        type="time"
                        value={item.start_time}
                        onChange={(event) =>
                          updateHour(item.id, { start_time: event.target.value })
                        }
                        className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                      />
                      <input
                        type="time"
                        value={item.end_time}
                        onChange={(event) =>
                          updateHour(item.id, { end_time: event.target.value })
                        }
                        className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                      />
                    </span>
                  </label>
                  <label className="grid gap-1 text-xs text-stone-500">
                    Pausa
                    <span className="flex gap-2">
                      <input
                        type="time"
                        value={item.pause_start ?? ""}
                        onChange={(event) =>
                          updateHour(item.id, {
                            pause_start: event.target.value || null,
                          })
                        }
                        className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                      />
                      <input
                        type="time"
                        value={item.pause_end ?? ""}
                        onChange={(event) =>
                          updateHour(item.id, {
                            pause_end: event.target.value || null,
                          })
                        }
                        className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                      />
                    </span>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
