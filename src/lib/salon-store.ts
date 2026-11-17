import { MOCK_SALON } from "@/lib/mock-data"
import type { AccentTheme, BusinessType, Salon, Service } from "@/types"

// Armazena customizações do estabelecimento em memória do servidor como complemento/fallback ao Supabase
let customSalonOverride: Partial<Salon> = {}
const historicalSlugs = new Set<string>(["lumina", "lumina-studio"])

// Armazena serviços criados/editados/removidos e metadados estendidos de catálogo
const customServicesMap = new Map<string, Service>()
const serviceMetadataMap = new Map<
  string,
  Partial<
    Pick<
      Service,
      | "category"
      | "image_url"
      | "promo_price"
      | "featured"
      | "active"
      | "title"
      | "description"
      | "price"
      | "duration_minutes"
    >
  >
>()
const deletedServiceIds = new Set<string>()

export interface BusinessPreset {
  type: BusinessType
  label: string
  badge: string
  defaultTagline: string
  defaultBio: string
  defaultAccent: AccentTheme
  suggestedCategories: string[]
  templateServices: Array<{
    title: string
    category: string
    price: number
    promo_price?: number | null
    duration_minutes: number
    description: string
    featured?: boolean
  }>
}

export const BUSINESS_PRESETS: Record<BusinessType, BusinessPreset> = {
  SALON: {
    type: "SALON",
    label: "Salão de Beleza Completo",
    badge: "Cabelo, Colorimetria & Unhas",
    defaultTagline: "Beleza, cortes & bem-estar sob medida",
    defaultBio:
      "Espaço especializado em cortes modernos, mechas, colorimetria avançada, tratamentos capilares e nail spa.",
    defaultAccent: "rose",
    suggestedCategories: [
      "Cabelo",
      "Colorimetria",
      "Tratamentos",
      "Unhas & Spa",
      "Maquiagem & Penteados",
    ],
    templateServices: [
      {
        title: "Corte Feminino + Escova Modelada",
        category: "Cabelo",
        price: 130,
        duration_minutes: 60,
        description: "Visagismo, lavagem relaxante, corte técnico e finalização.",
        featured: true,
      },
      {
        title: "Mechas & Iluminação Personalizada",
        category: "Colorimetria",
        price: 380,
        promo_price: 329,
        duration_minutes: 180,
        description: "Técnica de iluminação com tratamento reconstrutor pós-química.",
        featured: true,
      },
      {
        title: "Cronograma de Hidratação Profunda",
        category: "Tratamentos",
        price: 110,
        duration_minutes: 45,
        description: "Reposição hídrica e lipídica para brilho espelhado.",
      },
    ],
  },
  BARBERSHOP: {
    type: "BARBERSHOP",
    label: "Barbearia Clássica & Moderna",
    badge: "Cortes Masculinos, Barba & Navalha",
    defaultTagline: "Cortes de precisão, navalha quente & estilo",
    defaultBio:
      "Barbearia especializada em degradê (fade), cortes clássicos na tesoura, barboterapia com toalha quente e cuidados masculinos.",
    defaultAccent: "amber",
    suggestedCategories: [
      "Cortes Masculinos",
      "Barba & Navalha",
      "Combos VIP",
      "Química & Pigmentação",
      "Acabamentos",
    ],
    templateServices: [
      {
        title: "Combo Corte Degradê + Barboterapia",
        category: "Combos VIP",
        price: 110,
        promo_price: 95,
        duration_minutes: 60,
        description: "Corte moderno + barba na navalha com toalha quente e óleo essencial.",
        featured: true,
      },
      {
        title: "Corte Masculino (Fade / Social)",
        category: "Cortes Masculinos",
        price: 65,
        duration_minutes: 45,
        description: "Corte na máquina e tesoura com lavagem e pomada modeladora.",
        featured: true,
      },
      {
        title: "Barba Completa na Toalha Quente",
        category: "Barba & Navalha",
        price: 55,
        duration_minutes: 30,
        description: "Alinhamento, esfoliação facial, toalha quente e balm pós-barba.",
      },
    ],
  },
  AESTHETICS: {
    type: "AESTHETICS",
    label: "Clínica de Estética & Spa",
    badge: "Estética Facial, Corporal & Massagens",
    defaultTagline: "Autocuidado, rejuvenescimento & relaxamento",
    defaultBio:
      "Clínica voltada para protocolos faciais e corporais, limpeza de pele profunda, drenagem linfática e terapias relaxantes.",
    defaultAccent: "emerald",
    suggestedCategories: [
      "Estética Facial",
      "Estética Corporal",
      "Massagens & Spa",
      "Depilação",
      "Pacotes",
    ],
    templateServices: [
      {
        title: "Limpeza de Pele Profunda + Peeling de Diamante",
        category: "Estética Facial",
        price: 180,
        promo_price: 149,
        duration_minutes: 75,
        description: "Extração delicada, renovação celular e máscara calmante de LED.",
        featured: true,
      },
      {
        title: "Drenagem Linfática Corporal",
        category: "Estética Corporal",
        price: 140,
        duration_minutes: 60,
        description: "Técnica manual para redução de retenção líquida e bem-estar.",
        featured: true,
      },
      {
        title: "Massagem Relaxante com Pedras Quentes",
        category: "Massagens & Spa",
        price: 160,
        duration_minutes: 60,
        description: "Alívio imediato de tensões musculares com aromaterapia.",
      },
    ],
  },
  NAILS: {
    type: "NAILS",
    label: "Nail Studio & Esmalteria",
    badge: "Alongamento em Gel, Fibra & Spa dos Pés",
    defaultTagline: "Unhas impecáveis, nail art & spa das mãos",
    defaultBio:
      "Studio especializado em alongamento em fibra de vidro, banho de gel, blindagem, esmaltação em gel e spa completo.",
    defaultAccent: "rose",
    suggestedCategories: [
      "Alongamentos",
      "Manutenção & Blindagem",
      "Manicure & Pedicure",
      "Spa dos Pés",
      "Nail Art",
    ],
    templateServices: [
      {
        title: "Alongamento em Fibra de Vidro + Esmaltação em Gel",
        category: "Alongamentos",
        price: 190,
        promo_price: 165,
        duration_minutes: 120,
        description: "Acabamento natural, resistência superior e brilho por até 25 dias.",
        featured: true,
      },
      {
        title: "Blindagem Diamante (Banho de Gel)",
        category: "Manutenção & Blindagem",
        price: 110,
        duration_minutes: 60,
        description: "Proteção estrutural para crescimento saudável das unhas naturais.",
        featured: true,
      },
      {
        title: "Combo Manicure + Pedicure Spa",
        category: "Manicure & Pedicure",
        price: 95,
        duration_minutes: 75,
        description: "Cutilagem russa combinada, esfoliação e hidratação térmica.",
      },
    ],
  },
  LASH_BROW: {
    type: "LASH_BROW",
    label: "Studio de Cílios & Sobrancelhas",
    badge: "Extensão de Cílios, Lash Lifting & Design",
    defaultTagline: "Realçando a expressão e a beleza do seu olhar",
    defaultBio:
      "Especialistas em extensão de cílios (fio a fio, volume brasileiro e russo), lash lifting, brow lamination e design com henna.",
    defaultAccent: "violet",
    suggestedCategories: [
      "Extensão de Cílios",
      "Manutenção de Cílios",
      "Sobrancelhas & Brow",
      "Lash Lifting",
      "Combos do Olhar",
    ],
    templateServices: [
      {
        title: "Extensão de Cílios Volume Brasileiro",
        category: "Extensão de Cílios",
        price: 175,
        promo_price: 150,
        duration_minutes: 105,
        description: "Efeito marcante, leveza extrema e alta retenção dos fios.",
        featured: true,
      },
      {
        title: "Brow Lamination + Design com Tintura",
        category: "Sobrancelhas & Brow",
        price: 120,
        duration_minutes: 60,
        description: "Alinhamento dos fios naturais com nutrição e simetria facial.",
        featured: true,
      },
      {
        title: "Design de Sobrancelhas com Henna",
        category: "Sobrancelhas & Brow",
        price: 65,
        duration_minutes: 45,
        description: "Mapeamento geométrico personalizado e aplicação de henna.",
      },
    ],
  },
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function matchesKnownSalonSlug(
  candidateSlug: string | undefined,
  dbSlug?: string
): boolean {
  if (!candidateSlug) return true
  const normalized = sanitizeSlug(candidateSlug)
  if (dbSlug && sanitizeSlug(dbSlug) === normalized) return true
  if (
    customSalonOverride.slug &&
    sanitizeSlug(customSalonOverride.slug) === normalized
  ) {
    return true
  }
  return historicalSlugs.has(normalized)
}

export function enrichSalonWithCustomizations(baseSalon: Salon): Salon {
  if (baseSalon.slug) {
    historicalSlugs.add(sanitizeSlug(baseSalon.slug))
  }
  return {
    ...MOCK_SALON,
    ...baseSalon,
    ...customSalonOverride,
    id: baseSalon.id || MOCK_SALON.id,
    name: customSalonOverride.name ?? baseSalon.name ?? MOCK_SALON.name,
    slug: customSalonOverride.slug ?? baseSalon.slug ?? MOCK_SALON.slug,
    phone: customSalonOverride.phone ?? baseSalon.phone ?? MOCK_SALON.phone,
    logo_url:
      customSalonOverride.logo_url !== undefined
        ? customSalonOverride.logo_url
        : (baseSalon.logo_url ?? MOCK_SALON.logo_url),
    business_type:
      customSalonOverride.business_type ??
      baseSalon.business_type ??
      MOCK_SALON.business_type ??
      "SALON",
    tagline:
      customSalonOverride.tagline !== undefined
        ? customSalonOverride.tagline
        : (baseSalon.tagline ?? MOCK_SALON.tagline),
    bio:
      customSalonOverride.bio !== undefined
        ? customSalonOverride.bio
        : (baseSalon.bio ?? MOCK_SALON.bio),
    cover_url:
      customSalonOverride.cover_url !== undefined
        ? customSalonOverride.cover_url
        : (baseSalon.cover_url ?? MOCK_SALON.cover_url),
    accent_color:
      customSalonOverride.accent_color ??
      baseSalon.accent_color ??
      MOCK_SALON.accent_color ??
      "rose",
    address:
      customSalonOverride.address !== undefined
        ? customSalonOverride.address
        : (baseSalon.address ?? MOCK_SALON.address),
    city:
      customSalonOverride.city !== undefined
        ? customSalonOverride.city
        : (baseSalon.city ?? MOCK_SALON.city),
    instagram:
      customSalonOverride.instagram !== undefined
        ? customSalonOverride.instagram
        : (baseSalon.instagram ?? MOCK_SALON.instagram),
    email:
      customSalonOverride.email !== undefined
        ? customSalonOverride.email
        : (baseSalon.email ?? MOCK_SALON.email),
    opening_hours_text:
      customSalonOverride.opening_hours_text !== undefined
        ? customSalonOverride.opening_hours_text
        : (baseSalon.opening_hours_text ?? MOCK_SALON.opening_hours_text),
    welcome_message:
      customSalonOverride.welcome_message !== undefined
        ? customSalonOverride.welcome_message
        : (baseSalon.welcome_message ?? MOCK_SALON.welcome_message),
    cancellation_policy:
      customSalonOverride.cancellation_policy !== undefined
        ? customSalonOverride.cancellation_policy
        : (baseSalon.cancellation_policy ?? MOCK_SALON.cancellation_policy),
    payment_methods:
      customSalonOverride.payment_methods ??
      baseSalon.payment_methods ??
      MOCK_SALON.payment_methods ?? [
        "PIX",
        "Cartão de Crédito",
        "Cartão de Débito",
        "Dinheiro",
      ],
    allow_any_staff:
      customSalonOverride.allow_any_staff !== undefined
        ? customSalonOverride.allow_any_staff
        : (baseSalon.allow_any_staff ?? true),
    booking_horizon_days:
      customSalonOverride.booking_horizon_days ??
      baseSalon.booking_horizon_days ??
      14,
  }
}

export function updateSalonCustomizations(patch: Partial<Salon>): Salon {
  if (patch.slug) {
    const clean = sanitizeSlug(patch.slug)
    if (clean) {
      patch.slug = clean
      historicalSlugs.add(clean)
    }
  }
  customSalonOverride = {
    ...customSalonOverride,
    ...patch,
  }
  return enrichSalonWithCustomizations(MOCK_SALON)
}

function inferDefaultCategory(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes("barba") || lower.includes("fade") || lower.includes("masculino")) {
    return "Barbearia"
  }
  if (lower.includes("manicure") || lower.includes("pedicure") || lower.includes("unha") || lower.includes("gel")) {
    return "Unhas & Spa"
  }
  if (lower.includes("colora") || lower.includes("mecha") || lower.includes("luzes")) {
    return "Colorimetria"
  }
  if (lower.includes("limpeza") || lower.includes("peeling") || lower.includes("massagem") || lower.includes("drenagem")) {
    return "Estética & Spa"
  }
  if (lower.includes("corte") || lower.includes("escova") || lower.includes("cabelo") || lower.includes("hidrata")) {
    return "Cabelo"
  }
  return "Serviços"
}

export function enrichServiceWithMetadata(service: Service): Service {
  const custom = customServicesMap.get(service.id)
  const meta = serviceMetadataMap.get(service.id)
  const merged = {
    ...service,
    ...(custom ?? {}),
    ...(meta ?? {}),
  }
  return {
    ...merged,
    category: merged.category || inferDefaultCategory(merged.title),
    image_url: merged.image_url ?? null,
    promo_price:
      merged.promo_price !== undefined && merged.promo_price !== null
        ? Number(merged.promo_price)
        : null,
    featured:
      merged.featured !== undefined
        ? Boolean(merged.featured)
        : merged.title.toLowerCase().includes("corte feminino") ||
          merged.title.toLowerCase().includes("coloração"),
    active: merged.active !== undefined ? Boolean(merged.active) : true,
  }
}

export function registerCustomService(service: Service): Service {
  deletedServiceIds.delete(service.id)
  const enriched = enrichServiceWithMetadata(service)
  customServicesMap.set(service.id, enriched)
  serviceMetadataMap.set(service.id, {
    title: enriched.title,
    description: enriched.description,
    price: enriched.price,
    duration_minutes: enriched.duration_minutes,
    category: enriched.category,
    image_url: enriched.image_url,
    promo_price: enriched.promo_price,
    featured: enriched.featured,
    active: enriched.active,
  })
  return enriched
}

export function updateCustomService(
  id: string,
  patch: Partial<Service>
): Service | null {
  const existingCustom = customServicesMap.get(id)
  if (existingCustom) {
    const updated = enrichServiceWithMetadata({ ...existingCustom, ...patch })
    customServicesMap.set(id, updated)
  }
  const prevMeta = serviceMetadataMap.get(id) ?? {}
  serviceMetadataMap.set(id, {
    ...prevMeta,
    ...patch,
  })
  return customServicesMap.get(id) ?? null
}

export function removeCustomService(id: string): void {
  deletedServiceIds.add(id)
  customServicesMap.delete(id)
  serviceMetadataMap.delete(id)
}

export function mergeCustomServicesIntoList(dbServices: Service[]): Service[] {
  const enrichedDb = dbServices
    .filter((s) => !deletedServiceIds.has(s.id))
    .map(enrichServiceWithMetadata)

  const existingIds = new Set(enrichedDb.map((s) => s.id))
  const extraServices: Service[] = []
  for (const custom of customServicesMap.values()) {
    if (!existingIds.has(custom.id) && !deletedServiceIds.has(custom.id)) {
      extraServices.push(enrichServiceWithMetadata(custom))
    }
  }

  return [...extraServices, ...enrichedDb]
}

