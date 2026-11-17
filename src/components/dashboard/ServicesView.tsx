"use client"

import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import {
  Check,
  Clock,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Wand2,
  X,
} from "lucide-react"

import { formatCurrency } from "@/lib/format"
import { BUSINESS_PRESETS } from "@/lib/salon-store"
import { cn } from "@/lib/utils"
import type { BusinessType, Salon, Service } from "@/types"

interface ServicesViewProps {
  salonId?: string
  salon?: Salon | null
  initialServices: Service[]
}

const DEFAULT_CATEGORIES = [
  "Cabelo",
  "Barbearia",
  "Colorimetria",
  "Unhas & Spa",
  "Estética Facial",
  "Estética Corporal",
  "Cílios & Sobrancelhas",
  "Combos & Pacotes",
]

export function ServicesView({
  salonId,
  salon,
  initialServices,
}: ServicesViewProps) {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [saving, setSaving] = useState(false)
  const [importingPreset, setImportingPreset] = useState<BusinessType | null>(
    null
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: "",
    category: "Cabelo",
    customCategory: "",
    price: "",
    promo_price: "",
    duration_minutes: "45",
    description: "",
    image_url: "",
    featured: false,
    active: true,
  })

  const targetSalonId =
    salonId ??
    salon?.id ??
    initialServices[0]?.salon_id ??
    "33c1fa76-592c-4850-b267-df7f18e11fd2"

  const categories = useMemo(() => {
    const presetCats =
      salon?.business_type && BUSINESS_PRESETS[salon.business_type]
        ? BUSINESS_PRESETS[salon.business_type].suggestedCategories
        : []
    const existingCats = services
      .map((s) => s.category)
      .filter((c): c is string => Boolean(c))
    return Array.from(
      new Set([...presetCats, ...existingCats, ...DEFAULT_CATEGORIES])
    )
  }, [salon?.business_type, services])

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        (service.category ?? "Geral") === selectedCategory
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        (service.category ?? "").toLowerCase().includes(query)
      return matchesCategory && matchesSearch
    })
  }, [services, selectedCategory, searchQuery])

  const stats = useMemo(() => {
    const activeCount = services.filter((s) => s.active !== false).length
    const featuredCount = services.filter((s) => s.featured).length
    const uniqueCats = new Set(services.map((s) => s.category ?? "Geral")).size
    return {
      total: services.length,
      activeCount,
      featuredCount,
      uniqueCats,
    }
  }, [services])

  function notify(msg: string) {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3200)
  }

  function resetForm() {
    setForm({
      title: "",
      category: categories[0] ?? "Cabelo",
      customCategory: "",
      price: "",
      promo_price: "",
      duration_minutes: "45",
      description: "",
      image_url: "",
      featured: false,
      active: true,
    })
    setEditingId(null)
  }

  function startEdit(service: Service) {
    setEditingId(service.id)
    setForm({
      title: service.title,
      category: service.category ?? "Cabelo",
      customCategory: "",
      price: String(service.price),
      promo_price:
        service.promo_price !== undefined && service.promo_price !== null
          ? String(service.promo_price)
          : "",
      duration_minutes: String(service.duration_minutes),
      description: service.description ?? "",
      image_url: service.image_url ?? "",
      featured: Boolean(service.featured),
      active: service.active !== false,
    })
    setShowForm(true)
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, image_url: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    const resolvedCategory =
      form.category === "__CUSTOM__"
        ? form.customCategory.trim() || "Geral"
        : form.category

    const payload = {
      salon_id: targetSalonId,
      title: form.title.trim(),
      category: resolvedCategory,
      price: Number(form.price),
      promo_price:
        form.promo_price.trim() !== "" && Number(form.promo_price) > 0
          ? Number(form.promo_price)
          : null,
      duration_minutes: Number(form.duration_minutes),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      featured: form.featured,
      active: form.active,
    }

    try {
      if (editingId) {
        await fetch("/api/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        setServices((current) =>
          current.map((item) =>
            item.id === editingId ? { ...item, ...payload } : item
          )
        )
        notify(`Serviço "${payload.title}" atualizado no catálogo!`)
      } else {
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        const created: Service = json.service ?? {
          id: `svc-${crypto.randomUUID()}`,
          ...payload,
        }
        setServices((current) => [created, ...current])
        notify(`Serviço "${payload.title}" adicionado ao catálogo!`)
      }
      resetForm()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleServiceField(
    service: Service,
    field: "featured" | "active"
  ) {
    const nextValue =
      field === "active"
        ? service.active === false
        : !Boolean(service.featured)

    setServices((current) =>
      current.map((s) =>
        s.id === service.id ? { ...s, [field]: nextValue } : s
      )
    )

    await fetch("/api/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, [field]: nextValue }),
    })

    notify(
      field === "active"
        ? nextValue
          ? `"${service.title}" agora está visível na página pública.`
          : `"${service.title}" foi ocultado da página pública.`
        : nextValue
          ? `"${service.title}" marcado como Destaque!`
          : `"${service.title}" removido dos destaques.`
    )
  }

  async function removeService(id: string) {
    const target = services.find((s) => s.id === id)
    setServices((current) => current.filter((service) => service.id !== id))
    await fetch(`/api/services?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    })
    if (target) {
      notify(`Serviço "${target.title}" removido do catálogo.`)
    }
  }

  async function importPresetCatalog(type: BusinessType) {
    const preset = BUSINESS_PRESETS[type]
    if (!preset) return
    setImportingPreset(type)

    try {
      const existingTitles = new Set(
        services.map((s) => s.title.toLowerCase().trim())
      )
      const createdList: Service[] = []

      for (const item of preset.templateServices) {
        if (existingTitles.has(item.title.toLowerCase().trim())) continue
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            salon_id: targetSalonId,
            title: item.title,
            category: item.category,
            price: item.price,
            promo_price: item.promo_price ?? null,
            duration_minutes: item.duration_minutes,
            description: item.description,
            featured: Boolean(item.featured),
            active: true,
          }),
        })
        const json = await res.json()
        if (json.service) {
          createdList.push(json.service)
        }
      }

      if (createdList.length > 0) {
        setServices((current) => [...createdList, ...current])
        notify(
          `${createdList.length} serviço(s) de "${preset.label}" adicionados ao seu catálogo!`
        )
      } else {
        notify(`Os serviços do modelo "${preset.label}" já estão no catálogo.`)
      }
    } finally {
      setImportingPreset(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Catálogo Personalizado
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Serviços, Categorias & Preços
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Personalize os serviços exibidos na sua página pública com fotos,
            categorias, promoções e destaques.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm && editingId) {
              resetForm()
            } else {
              setShowForm((prev) => !prev)
            }
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-700/20 hover:bg-rose-600"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Fechar formulário" : "Novo serviço no catálogo"}
        </button>
      </header>

      {feedback ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Check className="size-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      ) : null}

      {/* Resumo rápido do Catálogo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Total no Catálogo
          </p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Visíveis no Link
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {stats.activeCount}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Em Destaque (⭐)
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
            {stats.featuredCount}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Categorias Ativas
          </p>
          <p className="mt-1 text-2xl font-semibold text-rose-700 dark:text-rose-400">
            {stats.uniqueCats}
          </p>
        </div>
      </div>

      {/* Modelos rápidos de Catálogo por Perfil de Estabelecimento */}
      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="size-4 text-amber-600" />
            <h2 className="text-sm font-semibold">
              Importar Serviços Prontos por Segmento
            </h2>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Adicione pacotes de serviços com 1 clique conforme o perfil do seu
            estabelecimento:
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(BUSINESS_PRESETS) as BusinessType[]).map((type) => {
            const preset = BUSINESS_PRESETS[type]
            const isImporting = importingPreset === type
            return (
              <button
                key={type}
                type="button"
                disabled={Boolean(importingPreset)}
                onClick={() => importPresetCatalog(type)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300 dark:hover:border-rose-800 dark:hover:bg-rose-950/40"
              >
                <Sparkles className="size-3.5 text-amber-600" />
                {isImporting
                  ? "Adicionando..."
                  : `+ Kit ${preset.label}`}
              </button>
            )
          })}
        </div>
      </section>

      {/* Formulário de Criação / Edição de Serviço */}
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-rose-200/80 bg-white p-4 shadow-sm sm:p-6 dark:border-rose-900/50 dark:bg-stone-900"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
            <h2 className="text-base font-semibold">
              {editingId
                ? "Editar Serviço do Catálogo"
                : "Adicionar Serviço ao Catálogo"}
            </h2>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
              Nome do serviço *
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="Ex: Corte Degradê + Barba, Mechas Criativas..."
                className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              />
            </label>

            <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
              Categoria no catálogo *
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
                className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Criar nova categoria...</option>
              </select>
            </label>

            {form.category === "__CUSTOM__" ? (
              <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                Nome da nova categoria *
                <input
                  required
                  value={form.customCategory}
                  onChange={(event) =>
                    setForm({ ...form, customCategory: event.target.value })
                  }
                  placeholder="Ex: Terapia Capilar"
                  className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
              </label>
            ) : (
              <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                Duração estimada (minutos) *
                <select
                  value={form.duration_minutes}
                  onChange={(event) =>
                    setForm({ ...form, duration_minutes: event.target.value })
                  }
                  className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                >
                  {[15, 20, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240].map(
                    (mins) => (
                      <option key={mins} value={String(mins)}>
                        {mins} minutos
                      </option>
                    )
                  )}
                </select>
              </label>
            )}

            <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
              Preço normal (R$) *
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
                placeholder="Ex: 120.00"
                className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              />
            </label>

            <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
              Preço promocional (R$ - opcional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.promo_price}
                onChange={(event) =>
                  setForm({ ...form, promo_price: event.target.value })
                }
                placeholder="Ex: 99.90 (De/Por)"
                className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              />
            </label>

            <div className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
              <span>Foto / Imagem do serviço (opcional)</span>
              <div className="flex items-center gap-2">
                <input
                  value={form.image_url}
                  onChange={(event) =>
                    setForm({ ...form, image_url: event.target.value })
                  }
                  placeholder="Cole uma URL de imagem ou envie um arquivo ao lado"
                  className="min-h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                />
                <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                  <ImagePlus className="size-4 text-rose-700 dark:text-rose-400" />
                  <span>Enviar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 lg:col-span-4 dark:text-stone-300">
              Descrição detalhada para o cliente
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="Descreva o que está incluso no procedimento, produtos utilizados ou diferenciais..."
                className="min-h-20 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="size-4 rounded border-stone-300 text-rose-700 focus:ring-rose-600"
                />
                <span className="font-medium">
                  Destacar como &ldquo;Mais Pedido ⭐&rdquo;
                </span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="size-4 rounded border-stone-300 text-rose-700 focus:ring-rose-600"
                />
                <span className="font-medium">
                  Visível na página pública de agendamento
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60 sm:w-auto"
            >
              <Check className="size-4" />
              {saving
                ? "Salvando..."
                : editingId
                  ? "Salvar alterações"
                  : "Adicionar ao catálogo"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Barra de Filtro por Categoria e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
              selectedCategory === "ALL"
                ? "bg-rose-700 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
            )}
          >
            Todos ({services.length})
          </button>
          {Array.from(new Set(services.map((s) => s.category ?? "Geral"))).map(
            (cat) => {
              const count = services.filter(
                (s) => (s.category ?? "Geral") === cat
              ).length
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedCategory === cat
                      ? "bg-rose-700 text-white"
                      : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
                  )}
                >
                  {cat} ({count})
                </button>
              )
            }
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar serviço no catálogo..."
            className="min-h-10 w-full rounded-xl border border-stone-200 bg-white pr-3 pl-9 text-xs outline-none ring-rose-600 focus:ring-2 dark:border-stone-800 dark:bg-stone-900"
          />
        </div>
      </div>

      {/* Lista de Serviços em Cards Responsivos */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => {
          const isInactive = service.active === false
          const hasPromo =
            service.promo_price !== undefined &&
            service.promo_price !== null &&
            service.promo_price > 0 &&
            service.promo_price < service.price

          return (
            <article
              key={service.id}
              className={cn(
                "flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-2xs transition-all dark:bg-stone-900",
                isInactive
                  ? "border-stone-200/70 opacity-60 dark:border-stone-800/70"
                  : service.featured
                    ? "border-amber-300 ring-1 ring-amber-200/60 dark:border-amber-800/70 dark:ring-amber-900/30"
                    : "border-stone-200 dark:border-stone-800"
              )}
            >
              <div className="space-y-3">
                {service.image_url ? (
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image_url}
                      alt={service.title}
                      className="size-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                    <Tag className="size-3 text-rose-700 dark:text-rose-400" />
                    {service.category ?? "Geral"}
                  </span>

                  <div className="flex items-center gap-1">
                    {service.featured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
                        <Star className="size-3 fill-amber-500 text-amber-500" />
                        Destaque
                      </span>
                    ) : null}
                    {isInactive ? (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                        Oculto
                      </span>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-50">
                    {service.title}
                  </h3>
                  {service.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                      {service.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <div>
                    {hasPromo ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(service.promo_price!)}
                        </span>
                        <span className="text-xs text-stone-400 line-through">
                          {formatCurrency(service.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        {formatCurrency(service.price)}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                    <Clock className="size-3.5 text-amber-600" />
                    {service.duration_minutes} min
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleServiceField(service, "featured")}
                      title={
                        service.featured
                          ? "Remover destaque"
                          : "Destacar no topo do catálogo"
                      }
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg border text-xs transition-colors",
                        service.featured
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "border-stone-200 text-stone-400 hover:text-amber-600 dark:border-stone-800"
                      )}
                    >
                      <Star
                        className={cn(
                          "size-3.5",
                          service.featured && "fill-amber-500"
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleServiceField(service, "active")}
                      title={
                        isInactive
                          ? "Mostrar no catálogo público"
                          : "Ocultar do catálogo público"
                      }
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-stone-800 dark:hover:bg-stone-800"
                    >
                      {isInactive ? (
                        <EyeOff className="size-3.5 text-stone-400" />
                      ) : (
                        <Eye className="size-3.5 text-emerald-600" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(service)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <Pencil className="size-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeService(service.id)}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      aria-label={`Excluir ${service.title}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
