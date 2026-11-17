"use client"

import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  CalendarClock,
  Check,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Globe,
  ImagePlus,
  AtSign,
  Link2,
  MapPin,
  MessageSquareShare,
  Palette,
  Phone,
  QrCode,
  ShieldAlert,
  Sparkles,
  Store,
  Wand2,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"

import { BUSINESS_PRESETS, sanitizeSlug } from "@/lib/salon-store"
import { cn } from "@/lib/utils"
import type { AccentTheme, BusinessType, Salon } from "@/types"

const ACCENT_OPTIONS: Array<{
  id: AccentTheme
  label: string
  swatch: string
  gradient: string
  badge: string
}> = [
  {
    id: "rose",
    label: "Rose Terracota",
    swatch: "bg-rose-700",
    gradient: "from-rose-700 via-rose-600 to-amber-600",
    badge: "Salões & Beleza",
  },
  {
    id: "amber",
    label: "Dourado Âmbar",
    swatch: "bg-amber-600",
    gradient: "from-stone-900 via-amber-800 to-amber-600",
    badge: "Barbearias & VIP",
  },
  {
    id: "emerald",
    label: "Esmeralda Spa",
    swatch: "bg-emerald-700",
    gradient: "from-emerald-800 via-emerald-700 to-teal-600",
    badge: "Estética & Bem-estar",
  },
  {
    id: "violet",
    label: "Lavanda Studio",
    swatch: "bg-violet-700",
    gradient: "from-violet-800 via-purple-700 to-fuchsia-600",
    badge: "Cílios & Nail Design",
  },
  {
    id: "stone",
    label: "Minimalista Noir",
    swatch: "bg-stone-800",
    gradient: "from-stone-950 via-stone-800 to-stone-700",
    badge: "Conceito & Premium",
  },
]

const PAYMENT_OPTIONS = [
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Dinheiro",
  "Link de Pagamento",
]

type ActiveTab = "PROFILE" | "LINK_QR" | "RULES"

export function PromoView({ salon: initialSalon }: { salon: Salon }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>("PROFILE")
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false)
  const [copiedBio, setCopiedBio] = useState(false)

  const [form, setForm] = useState({
    id: initialSalon.id,
    name: initialSalon.name ?? "Lumina Studio",
    slug: initialSalon.slug ?? "lumina",
    phone: initialSalon.phone ?? "(11) 98888-0101",
    logo_url: initialSalon.logo_url ?? "",
    cover_url: initialSalon.cover_url ?? "",
    business_type: (initialSalon.business_type ?? "SALON") as BusinessType,
    tagline:
      initialSalon.tagline ?? "Beleza, cortes & bem-estar sob medida",
    bio:
      initialSalon.bio ??
      "Espaço especializado em cortes modernos, colorimetria, barbearia clássica e nail spa com atendimento personalizado.",
    accent_color: (initialSalon.accent_color ?? "rose") as AccentTheme,
    address:
      initialSalon.address ?? "Av. Paulista, 1450 - Conj. 32, Bela Vista",
    city: initialSalon.city ?? "São Paulo - SP",
    instagram: initialSalon.instagram ?? "@lumina.studio",
    email: initialSalon.email ?? "contato@lumina.studio",
    opening_hours_text:
      initialSalon.opening_hours_text ?? "Seg a Sáb · 09:00 às 19:00",
    welcome_message:
      initialSalon.welcome_message ??
      "Escolha seu serviço favorito abaixo e garanta seu horário em poucos cliques.",
    cancellation_policy:
      initialSalon.cancellation_policy ??
      "Cancelamentos ou reagendamentos podem ser feitos com até 2 horas de antecedência. Tolerância de atraso de 10 minutos.",
    payment_methods: initialSalon.payment_methods ?? [
      "PIX",
      "Cartão de Crédito",
      "Cartão de Débito",
      "Dinheiro",
    ],
    allow_any_staff: initialSalon.allow_any_staff ?? true,
    booking_horizon_days: initialSalon.booking_horizon_days ?? 14,
  })

  const normalizedSlug = useMemo(
    () => sanitizeSlug(form.slug) || "meu-espaco",
    [form.slug]
  )

  const bookingUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/agendar/${normalizedSlug}`
    }
    return `${window.location.origin}/agendar/${normalizedSlug}`
  }, [normalizedSlug])

  const selectedAccent = useMemo(
    () =>
      ACCENT_OPTIONS.find((a) => a.id === form.accent_color) ??
      ACCENT_OPTIONS[0],
    [form.accent_color]
  )

  const whatsappShareText = useMemo(() => {
    const locationPart = form.address ? `\n📍 ${form.address}` : ""
    const hoursPart = form.opening_hours_text
      ? `\n🕒 ${form.opening_hours_text}`
      : ""
    return `✨ Olá! Agende seu horário no *${form.name}* de forma rápida e sem fila pelo nosso catálogo online:\n👉 ${bookingUrl}${hoursPart}${locationPart}`
  }, [bookingUrl, form.address, form.name, form.opening_hours_text])

  const instagramBioText = useMemo(() => {
    return `✨ ${form.name} | ${form.tagline || "Agendamento Online"}\n🕒 ${form.opening_hours_text || "Seg a Sáb"}\n📍 ${form.city || "Atendimento com hora marcada"}\n👇 Agende seu horário pelo link abaixo:\n${bookingUrl}`
  }, [bookingUrl, form.city, form.name, form.opening_hours_text, form.tagline])

  function handleFileUpload(
    field: "logo_url" | "cover_url",
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, [field]: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  function applyBusinessPreset(type: BusinessType) {
    const preset = BUSINESS_PRESETS[type]
    if (!preset) return
    setForm((prev) => ({
      ...prev,
      business_type: type,
      tagline: preset.defaultTagline,
      bio: preset.defaultBio,
      accent_color: preset.defaultAccent,
    }))
    setFeedback(
      `Perfil ajustado para "${preset.label}"! Clique em Salvar Personalizações para publicar.`
    )
    setTimeout(() => setFeedback(null), 3500)
  }

  function togglePaymentMethod(method: string) {
    setForm((prev) => {
      const exists = prev.payment_methods.includes(method)
      const next = exists
        ? prev.payment_methods.filter((m) => m !== method)
        : [...prev.payment_methods, method]
      return {
        ...prev,
        payment_methods: next.length > 0 ? next : [method],
      }
    })
  }

  async function copyText(
    text: string,
    setter: (val: boolean) => void
  ): Promise<void> {
    await navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 1800)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setErrorMsg(null)
    setFeedback(null)

    const cleanSlug = sanitizeSlug(form.slug)
    if (cleanSlug.length < 2) {
      setErrorMsg(
        "O link personalizado deve ter pelo menos 2 letras ou números."
      )
      setSaving(false)
      return
    }

    try {
      const res = await fetch("/api/salon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          slug: cleanSlug,
          logo_url: form.logo_url.trim() || null,
          cover_url: form.cover_url.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Não foi possível salvar as alterações.")
      } else {
        setForm((prev) => ({ ...prev, slug: cleanSlug }))
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("salon-updated", { detail: data.salon })
          )
        }
        router.refresh()
        setFeedback(
          "Personalizações do estabelecimento e link público atualizados com sucesso!"
        )
        setTimeout(() => setFeedback(null), 4000)
      }
    } catch {
      setErrorMsg("Erro de conexão ao salvar as configurações.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-700 dark:text-rose-400">
            Conta do Proprietário · Personalização Completa
          </p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Perfil do Estabelecimento, Link & Vitrine
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Adapte o link público, identidade visual, segmento e regras de
            atendimento ao perfil do seu negócio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/agendar/${normalizedSlug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200"
          >
            <ExternalLink className="size-3.5 text-amber-600" />
            Ver página pública
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-rose-700/20 hover:bg-rose-600 disabled:opacity-60"
          >
            <Check className="size-4" />
            {saving ? "Salvando..." : "Salvar Personalizações"}
          </button>
        </div>
      </header>

      {feedback ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Check className="size-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      ) : null}

      {errorMsg ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
          <ShieldAlert className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : null}

      {/* Abas de Navegação da Personalização */}
      <div className="grid grid-cols-1 gap-2 rounded-2xl border border-stone-200 bg-white p-1.5 sm:grid-cols-3 dark:border-stone-800 dark:bg-stone-900">
        <button
          type="button"
          onClick={() => setActiveTab("PROFILE")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
            activeTab === "PROFILE"
              ? "bg-rose-700 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          )}
        >
          <Store className="size-4" />
          1. Perfil & Identidade Visual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LINK_QR")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
            activeTab === "LINK_QR"
              ? "bg-rose-700 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          )}
        >
          <QrCode className="size-4" />
          2. Link Personalizado & QR Code
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("RULES")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
            activeTab === "RULES"
              ? "bg-rose-700 text-white shadow-xs"
              : "text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          )}
        >
          <CalendarClock className="size-4" />
          3. Endereço, Pagamentos & Regras
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Coluna Principal de Configuração */}
        <div className="space-y-6">
          {activeTab === "PROFILE" ? (
            <>
              {/* Segmento do Estabelecimento */}
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wand2 className="size-4 text-amber-600" />
                    <h2 className="text-base font-semibold">
                      Qual é o perfil do seu estabelecimento?
                    </h2>
                  </div>
                  <span className="text-xs text-stone-500">
                    Ajusta sugestões e visual
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(BUSINESS_PRESETS) as BusinessType[]).map(
                    (type) => {
                      const preset = BUSINESS_PRESETS[type]
                      const selected = form.business_type === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => applyBusinessPreset(type)}
                          className={cn(
                            "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
                            selected
                              ? "border-rose-600 bg-rose-50/70 ring-1 ring-rose-600 dark:border-rose-500 dark:bg-rose-950/40"
                              : "border-stone-200 hover:border-stone-300 dark:border-stone-800 dark:hover:border-stone-700"
                          )}
                        >
                          <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                            {preset.label}
                          </span>
                          <span className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
                            {preset.badge}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>
              </section>

              {/* Dados Principais e Identidade Visual */}
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-rose-700 dark:text-rose-400" />
                  <h2 className="text-base font-semibold">
                    Nome, Marca & Apresentação
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Nome do Estabelecimento *
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Ex: Studio Marina, Barbearia Imperial..."
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Slogan / Subtítulo da Vitrine
                    <input
                      value={form.tagline}
                      onChange={(e) =>
                        setForm({ ...form, tagline: e.target.value })
                      }
                      placeholder="Ex: Cortes de precisão, cor & bem-estar"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
                    Biografia / Descrição do Estabelecimento
                    <textarea
                      value={form.bio}
                      onChange={(e) =>
                        setForm({ ...form, bio: e.target.value })
                      }
                      placeholder="Conte um pouco sobre a especialidade do seu espaço, ambiente e diferenciais..."
                      className="min-h-20 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <div className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    <span>Logo / Foto de Perfil do Estabelecimento</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={form.logo_url}
                        onChange={(e) =>
                          setForm({ ...form, logo_url: e.target.value })
                        }
                        placeholder="URL da logo ou envie arquivo"
                        className="min-h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                      />
                      <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                        <ImagePlus className="size-4 text-rose-700" />
                        <span>Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload("logo_url", e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    <span>Imagem de Capa / Banner (opcional)</span>
                    <div className="flex items-center gap-2">
                      <input
                        value={form.cover_url}
                        onChange={(e) =>
                          setForm({ ...form, cover_url: e.target.value })
                        }
                        placeholder="URL do banner ou envie arquivo"
                        className="min-h-11 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                      />
                      <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200">
                        <ImagePlus className="size-4 text-amber-600" />
                        <span>Capa</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload("cover_url", e)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Paleta de Cor de Destaque da Vitrine */}
                <div className="pt-2">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                    <Palette className="size-4 text-amber-600" />
                    <span>Cor de Destaque da Página de Agendamento</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {ACCENT_OPTIONS.map((option) => {
                      const active = form.accent_color === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, accent_color: option.id })
                          }
                          className={cn(
                            "flex flex-col items-start rounded-xl border p-2.5 text-left transition-all",
                            active
                              ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900 dark:border-white dark:bg-stone-800 dark:ring-white"
                              : "border-stone-200 hover:bg-stone-50 dark:border-stone-800"
                          )}
                        >
                          <span
                            className={cn(
                              "mb-1.5 size-5 rounded-full shadow-xs",
                              option.swatch
                            )}
                          />
                          <span className="text-xs font-semibold">
                            {option.label}
                          </span>
                          <span className="text-[10px] text-stone-500">
                            {option.badge}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {activeTab === "LINK_QR" ? (
            <>
              {/* Editor do Link Personalizado */}
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2">
                  <Link2 className="size-4 text-amber-600" />
                  <h2 className="text-base font-semibold">
                    Personalizar Link de Agendamento
                  </h2>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Escolha o endereço exclusivo que seus clientes vão acessar
                  pelo Instagram ou WhatsApp.
                </p>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="flex min-h-11 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 px-3 focus-within:ring-2 focus-within:ring-rose-600 dark:border-stone-700 dark:bg-stone-950">
                    <span className="select-none text-xs font-medium text-stone-400 sm:text-sm">
                      /agendar/
                    </span>
                    <input
                      required
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: e.target.value })
                      }
                      placeholder="seu-estabelecimento"
                      className="min-w-0 flex-1 bg-transparent py-2 pl-1 font-mono text-sm font-semibold text-rose-700 outline-none dark:text-rose-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => copyText(bookingUrl, setCopiedLink)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-100 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {copiedLink ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copiedLink ? "Link Copiado!" : "Copiar URL"}
                  </button>
                </div>

                <div className="rounded-xl bg-amber-50/70 p-3 text-xs text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                  <span className="font-semibold">URL final ativa: </span>
                  <span className="font-mono break-all text-rose-700 dark:text-rose-400">
                    {bookingUrl}
                  </span>
                </div>
              </section>

              {/* QR Code e Mensagens Prontas */}
              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-5 text-center dark:border-stone-800 dark:bg-stone-900">
                  <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-amber-200">
                    <QRCodeSVG
                      value={bookingUrl}
                      size={168}
                      level="M"
                      className="h-auto max-w-full"
                    />
                  </div>
                  <p className="mt-3 text-xs font-medium text-stone-700 dark:text-stone-300">
                    QR Code da Recepção / Bancada
                  </p>
                  <p className="mt-1 text-[11px] text-stone-500">
                    Atualiza automaticamente com o seu link personalizado.
                  </p>
                </div>

                <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                  <div className="flex items-center gap-2">
                    <MessageSquareShare className="size-4 text-rose-700 dark:text-rose-400" />
                    <h3 className="text-sm font-semibold">
                      Textos Prontos para Divulgação
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                        Mensagem automática para WhatsApp
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(whatsappShareText, setCopiedWhatsapp)
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-400"
                      >
                        {copiedWhatsapp ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedWhatsapp ? "Copiado!" : "Copiar mensagem"}
                      </button>
                    </div>
                    <pre className=" rounded-xl bg-stone-50 p-3 font-sans text-xs whitespace-pre-wrap text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                      {whatsappShareText}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                        Texto sugerido para Bio do Instagram
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(instagramBioText, setCopiedBio)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-400"
                      >
                        {copiedBio ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                        {copiedBio ? "Copiado!" : "Copiar Bio"}
                      </button>
                    </div>
                    <pre className="rounded-xl bg-stone-50 p-3 font-sans text-xs whitespace-pre-wrap text-stone-700 dark:bg-stone-950 dark:text-stone-300">
                      {instagramBioText}
                    </pre>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "RULES" ? (
            <>
              {/* Contato, Localização e Horários */}
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-rose-700 dark:text-rose-400" />
                  <h2 className="text-base font-semibold">
                    Localização, Contatos & Horário de Atendimento
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    WhatsApp / Telefone de Atendimento *
                    <input
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="(11) 98888-0101"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Instagram do Estabelecimento
                    <input
                      value={form.instagram}
                      onChange={(e) =>
                        setForm({ ...form, instagram: e.target.value })
                      }
                      placeholder="@seu.estabelecimento"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
                    Endereço Completo (exibido para o cliente)
                    <input
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      placeholder="Rua, número, complemento e bairro"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Cidade / Estado
                    <input
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      placeholder="Ex: São Paulo - SP"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Horário de Funcionamento (Texto da Vitrine)
                    <input
                      value={form.opening_hours_text}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          opening_hours_text: e.target.value,
                        })
                      }
                      placeholder="Ex: Ter a Sáb · 09:00 às 20:00"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>
                </div>
              </section>

              {/* Formas de Pagamento e Regras de Agendamento */}
              <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center gap-2">
                  <CreditCard className="size-4 text-amber-600" />
                  <h2 className="text-base font-semibold">
                    Formas de Pagamento & Regras do Catálogo
                  </h2>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Meios de pagamento aceitos no local
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map((method) => {
                      const active = form.payment_methods.includes(method)
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => togglePaymentMethod(method)}
                          className={cn(
                            "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-rose-600 bg-rose-700 text-white"
                              : "border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400"
                          )}
                        >
                          {method}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                    Antecedência máxima na agenda pública
                    <select
                      value={String(form.booking_horizon_days)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          booking_horizon_days: Number(e.target.value),
                        })
                      }
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    >
                      <option value="7">Próximos 7 dias</option>
                      <option value="14">Próximos 14 dias</option>
                      <option value="21">Próximos 21 dias</option>
                      <option value="30">Próximos 30 dias</option>
                      <option value="60">Próximos 60 dias</option>
                    </select>
                  </label>

                  <div className="flex items-center pt-4">
                    <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-medium text-stone-700 dark:text-stone-300">
                      <input
                        type="checkbox"
                        checked={form.allow_any_staff}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            allow_any_staff: e.target.checked,
                          })
                        }
                        className="size-4 rounded border-stone-300 text-rose-700 focus:ring-rose-600"
                      />
                      <span>
                        Permitir opção &ldquo;Qualquer profissional
                        disponível&rdquo;
                      </span>
                    </label>
                  </div>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
                    Mensagem de boas-vindas no topo do catálogo
                    <input
                      value={form.welcome_message}
                      onChange={(e) =>
                        setForm({ ...form, welcome_message: e.target.value })
                      }
                      placeholder="Ex: Escolha seu serviço abaixo e garanta seu horário!"
                      className="min-h-11 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-medium text-stone-600 sm:col-span-2 dark:text-stone-300">
                    Política de Cancelamento e Tolerância de Atraso
                    <textarea
                      value={form.cancellation_policy}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          cancellation_policy: e.target.value,
                        })
                      }
                      placeholder="Informe regras de reagendamento, tolerância de atraso ou sinal..."
                      className="min-h-20 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm text-stone-900 outline-none ring-rose-600 focus:ring-2 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </label>
                </div>
              </section>
            </>
          ) : null}
        </div>

        {/* Coluna Lateral: Preview em Tempo Real da Vitrine do Estabelecimento */}
        <aside className="space-y-4">
          <div className="sticky top-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 text-xs font-semibold text-stone-500 dark:border-stone-800">
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-3.5 text-rose-700 dark:text-rose-400" />
                Prévia da Página Pública
              </span>
              <span className="font-mono text-[11px] text-stone-400">
                /agendar/{normalizedSlug}
              </span>
            </div>

            {/* Capa / Banner */}
            <div
              className={cn(
                "relative h-28 w-full bg-gradient-to-r",
                selectedAccent.gradient
              )}
            >
              {form.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.cover_url}
                  alt="Capa"
                  className="size-full object-cover opacity-85"
                />
              ) : null}
            </div>

            <div className="relative px-5 pb-5">
              {/* Avatar / Logo sobreposto */}
              <div className="-mt-8 mb-3 flex items-end justify-between">
                <div
                  className={cn(
                    "flex size-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br text-white shadow-md dark:border-stone-900",
                    selectedAccent.gradient
                  )}
                >
                  {form.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logo_url}
                      alt={form.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <Sparkles className="size-6" />
                  )}
                </div>

                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  {BUSINESS_PRESETS[form.business_type]?.label ??
                    "Estabelecimento"}
                </span>
              </div>

              <h3 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
                {form.name || "Nome do Estabelecimento"}
              </h3>
              {form.tagline ? (
                <p className="mt-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  {form.tagline}
                </p>
              ) : null}
              {form.bio ? (
                <p className="mt-2 line-clamp-3 text-xs text-stone-500 dark:text-stone-400">
                  {form.bio}
                </p>
              ) : null}

              <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-400">
                {form.opening_hours_text ? (
                  <p className="flex items-center gap-2">
                    <Clock className="size-3.5 shrink-0 text-amber-600" />
                    <span className="truncate">{form.opening_hours_text}</span>
                  </p>
                ) : null}
                {form.address ? (
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-rose-700 dark:text-rose-400" />
                    <span className="truncate">
                      {form.address}
                      {form.city ? ` · ${form.city}` : ""}
                    </span>
                  </p>
                ) : null}
                {form.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-emerald-600" />
                    <span>{form.phone}</span>
                  </p>
                ) : null}
                {form.instagram ? (
                  <p className="flex items-center gap-2">
                    <AtSign className="size-3.5 shrink-0 text-pink-600" />
                    <span>{form.instagram}</span>
                  </p>
                ) : null}
              </div>

              {form.payment_methods.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1 pt-1">
                  {form.payment_methods.map((pm) => (
                    <span
                      key={pm}
                      className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {pm}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                <Link
                  href="/dashboard/servicos"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
                >
                  Personalizar Catálogo de Serviços →
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  )
}
