-- ============================================================================
-- LUMINA STUDIO — GESTÃO DE FUNCIONÁRIOS, FOTOS E REMUNERAÇÃO (COMISSÃO / SALÁRIO)
-- ============================================================================

-- 1. Permite criar funcionários diretamente em public.profiles sem depender de auth.users
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

-- 2. Novos campos de perfil profissional e remuneração dos cortes/serviços
alter table public.profiles
  add column if not exists phone text,
  add column if not exists specialty text default 'Profissional de Beleza',
  add column if not exists document text,
  add column if not exists compensation_type text not null default 'COMMISSION'
    check (compensation_type in ('COMMISSION', 'SALARY', 'HYBRID')),
  add column if not exists commission_rate numeric(5, 2) not null default 40.00
    check (commission_rate between 0 and 100),
  add column if not exists fixed_salary numeric(10, 2) not null default 0.00
    check (fixed_salary >= 0);

-- 3. Políticas RLS para criação, atualização e remoção de funcionários no painel
drop policy if exists "Acesso total demo profiles" on public.profiles;
create policy "Acesso total demo profiles"
  on public.profiles for all
  to anon, authenticated
  using (true)
  with check (true);

