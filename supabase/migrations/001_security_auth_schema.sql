-- ============================================================================
-- LUMINA STUDIO — OWASP-COMPLIANT AUTHENTICATION & SECURITY SCHEMA
-- Tabelas: auth_users, auth_sessions, auth_verification_tokens,
--          auth_rate_limits, auth_audit_logs
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Tabela de Usuários (Users)
create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references public.salons(id) on delete set null,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role public.user_role not null default 'ADMIN',
  is_verified boolean not null default false,
  failed_login_attempts integer not null default 0,
  lockout_count integer not null default 0,
  locked_until timestamptz,
  totp_enabled boolean not null default false,
  totp_secret_encrypted text,
  totp_backup_codes_hash text[],
  last_login_at timestamptz,
  last_login_ip text,
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auth_users_email on public.auth_users(email);
create index if not exists idx_auth_users_salon_id on public.auth_users(salon_id);

-- 2. Tabela de Sessões e Refresh Tokens (Sessions / RefreshToken Rotation)
create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  family_id uuid not null,
  refresh_token_hash text not null unique,
  ip_address text not null,
  user_agent text not null,
  is_revoked boolean not null default false,
  revoked_reason text,
  rotated_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id on public.auth_sessions(user_id);
create index if not exists idx_auth_sessions_family_id on public.auth_sessions(family_id);
create index if not exists idx_auth_sessions_token_hash on public.auth_sessions(refresh_token_hash);

-- 3. Tabela de Tokens de Verificação e Recuperação (VerificationTokens)
create table if not exists public.auth_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.auth_users(id) on delete cascade,
  purpose text not null check (purpose in ('EMAIL_VERIFY', 'PASSWORD_RESET', 'TWO_FACTOR')),
  token_hash text not null,
  otp_hash text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_verif_user_purpose on public.auth_verification_tokens(user_id, purpose);
create index if not exists idx_auth_verif_token_hash on public.auth_verification_tokens(token_hash);

-- 4. Tabela de Rate Limiting por IP e Conta
create table if not exists public.auth_rate_limits (
  key text primary key,
  attempts integer not null default 1,
  window_start timestamptz not null default now(),
  blocked_until timestamptz
);

-- 5. Tabela de Logs de Auditoria de Segurança (Security Audit Logs)
create table if not exists public.auth_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.auth_users(id) on delete set null,
  event_type text not null,
  ip_address text not null,
  user_agent text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_audit_user_id on public.auth_audit_logs(user_id, created_at desc);
create index if not exists idx_auth_audit_event_type on public.auth_audit_logs(event_type, created_at desc);

-- 6. Row-Level Security (RLS)
alter table public.auth_users enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.auth_verification_tokens enable row level security;
alter table public.auth_rate_limits enable row level security;
alter table public.auth_audit_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.auth_users,
  public.auth_sessions,
  public.auth_verification_tokens,
  public.auth_rate_limits,
  public.auth_audit_logs
to anon, authenticated;

drop policy if exists "Service access auth_users" on public.auth_users;
create policy "Service access auth_users" on public.auth_users for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service access auth_sessions" on public.auth_sessions;
create policy "Service access auth_sessions" on public.auth_sessions for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service access auth_verification_tokens" on public.auth_verification_tokens;
create policy "Service access auth_verification_tokens" on public.auth_verification_tokens for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service access auth_rate_limits" on public.auth_rate_limits;
create policy "Service access auth_rate_limits" on public.auth_rate_limits for all to anon, authenticated using (true) with check (true);

drop policy if exists "Service access auth_audit_logs" on public.auth_audit_logs;
create policy "Service access auth_audit_logs" on public.auth_audit_logs for all to anon, authenticated using (true) with check (true);

