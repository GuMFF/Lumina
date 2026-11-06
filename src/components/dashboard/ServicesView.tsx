"use client"

import { FormEvent, useState } from "react"
import { Clock, Plus, Trash2 } from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import type { Service } from "@/types"

interface ServicesViewProps {
  salonId?: string
  initialServices: Service[]
}

export function ServicesView({ salonId, initialServices }: ServicesViewProps) {
  const [services, setServices] = useState(initialServices)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    price: "",
    duration_minutes: "45",
    description: "",
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const targetSalonId =
      salonId ??
      initialServices[0]?.salon_id ??
      "33c1fa76-592c-4850-b267-df7f18e11fd2"

    const supabase = createClient()
    const { data, error } = await supabase
      .from("services")
      .insert({
        salon_id: targetSalonId,
        title: form.title,
        description: form.description,
        price: Number(form.price),
        duration_minutes: Number(form.duration_minutes),
      })
      .select("*")
      .single()

    const next: Service =
      !error && data
        ? {
            id: data.id,
            salon_id: data.salon_id,
            title: data.title,
            description: data.description ?? "",
            price: Number(data.price),
            duration_minutes: Number(data.duration_minutes),
          }
        : {
            id: `svc-${crypto.randomUUID()}`,
            salon_id: targetSalonId,
            title: form.title,
            description: form.description,
            price: Number(form.price),
            duration_minutes: Number(form.duration_minutes),
          }

    setServices((current) => [next, ...current])
    setForm({ title: "", price: "", duration_minutes: "45", description: "" })
    setSaving(false)
  }

  async function removeService(id: string) {
    setServices((current) => current.filter((service) => service.id !== id))
    const supabase = createClient()
    await supabase.from("services").delete().eq("id", id)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
          Serviços
        </p>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Catálogo do salão
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Cadastre nome, preço e duração para os agendamentos públicos.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-stone-800 dark:bg-stone-900"
      >
        <input
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Nome do serviço"
          className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none ring-rose-600 focus:ring-2 sm:col-span-2 lg:col-span-1 dark:border-stone-700 dark:bg-stone-950"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
          placeholder="Preço (R$)"
          className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
        />
        <input
          required
          type="number"
          min="15"
          step="15"
          value={form.duration_minutes}
          onChange={(event) =>
            setForm({ ...form, duration_minutes: event.target.value })
          }
          placeholder="Duração (min)"
          className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60 sm:col-span-2 lg:col-span-1"
        >
          <Plus className="size-4" />
          {saving ? "Salvando..." : "Adicionar serviço"}
        </button>
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          placeholder="Descrição (opcional)"
          className="min-h-20 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm outline-none ring-rose-600 focus:ring-2 sm:col-span-2 lg:col-span-4 dark:border-stone-700 dark:bg-stone-950"
        />
      </form>

      {/* Layout em Cards para Celulares (md:hidden) */}
      <div className="grid gap-3 md:hidden">
        {services.map((service) => (
          <article
            key={service.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xs dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="font-semibold">{service.title}</p>
              {service.description ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {service.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-lg bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  {formatCurrency(service.price)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                  <Clock className="size-3.5 text-amber-600" />
                  {service.duration_minutes} min
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeService(service.id)}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
              aria-label={`Excluir ${service.title}`}
            >
              <Trash2 className="size-4" />
            </button>
          </article>
        ))}
      </div>

      {/* Layout em Tabela para Tablets e Desktops (hidden md:block) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-stone-200 bg-white md:block dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-amber-50/60 text-xs uppercase tracking-wide text-stone-600 dark:bg-stone-950 dark:text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Duração</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr
                key={service.id}
                className="border-t border-stone-100 dark:border-stone-800"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{service.title}</p>
                  <p className="text-xs text-stone-500">{service.description}</p>
                </td>
                <td className="px-4 py-3 font-medium text-amber-800 dark:text-amber-300">
                  {formatCurrency(service.price)}
                </td>
                <td className="px-4 py-3">{service.duration_minutes} min</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Excluir ${service.title}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
