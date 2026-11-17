-- =============================================================================
-- Migration 003: Personalização do Estabelecimento, Link e Catálogo de Serviços
-- =============================================================================

-- 1. Extensão da tabela `salons` com dados completos do perfil do estabelecimento
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'SALON'
    CHECK (business_type IN ('SALON', 'BARBERSHOP', 'AESTHETICS', 'NAILS', 'LASH_BROW')),
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT 'rose'
    CHECK (accent_color IN ('rose', 'amber', 'emerald', 'violet', 'stone')),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours_text TEXT DEFAULT 'Seg a Sáb · 09:00 às 19:00',
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
  ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'],
  ADD COLUMN IF NOT EXISTS allow_any_staff BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS booking_horizon_days INTEGER NOT NULL DEFAULT 14;

-- Índice único no slug para busca rápida do link público (/agendar/[slug])
CREATE UNIQUE INDEX IF NOT EXISTS idx_salons_slug_unique ON public.salons (slug);

-- 2. Extensão da tabela `services` com campos ricos do catálogo
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Geral',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Índice composto para listagem rápida de serviços ativos por salão e categoria
CREATE INDEX IF NOT EXISTS idx_services_salon_active_category
  ON public.services (salon_id, active, category);

