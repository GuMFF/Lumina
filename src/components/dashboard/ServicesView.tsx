"use client"

import { FormEvent, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

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
      salonId ?? initialServices[0]?.salon_id ?? "33c1fa76-592c-4850-b267-df7f18e11fd2"

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
        <p className="text-sm font-medium text-violet-600">Serviços</p>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo do salão</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre nome, preço e duração para os agendamentos públicos.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4"
      >
        <input
          required
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="Nome do serviço"
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={(event) => setForm({ ...form, price: event.target.value })}
          placeholder="Preço (R$)"
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
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
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          <Plus className="size-4" />
          {saving ? "Salvando..." : "Adicionar"}
        </button>
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          placeholder="Descrição (opcional)"
          className="min-h-20 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-violet-500 focus:ring-2 md:col-span-4 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </form>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950">
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
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{service.title}</p>
                  <p className="text-xs text-zinc-500">{service.description}</p>
                </td>
                <td className="px-4 py-3">{formatCurrency(service.price)}</td>
                <td className="px-4 py-3">{service.duration_minutes} min</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
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
