-- ============================================================
-- PARTE 1 — ENUMS GLOBAIS
-- ============================================================
create type actor_type as enum ('human', 'ai_agent');
create type actor_status as enum ('active', 'inactive', 'archived');
create type human_role as enum ('owner', 'developer', 'designer', 'commercial', 'support', 'manager');
create type employment_type as enum ('founder', 'pj', 'clt', 'intern', 'freelancer');
create type ai_provider as enum ('anthropic', 'openai', 'google', 'custom');
create type company_type as enum ('client', 'prospect', 'supplier', 'partner', 'other');
create type company_size as enum ('micro', 'small', 'medium', 'large', 'enterprise');
create type company_status as enum ('active', 'inactive', 'churned', 'lost');
create type person_status as enum ('active', 'inactive');
create type project_status as enum (
  'proposta', 'aceito', 'em_desenvolvimento', 'em_homologacao',
  'entregue', 'em_manutencao', 'pausado', 'cancelado', 'arquivado'
);
create type project_type as enum (
  'sistema_personalizado', 'chatbot', 'consultoria', 'interno', 'outro'
);
create type project_actor_role as enum ('owner', 'developer', 'designer', 'consultant', 'support');
create type maintenance_contract_status as enum ('active', 'paused', 'ended', 'cancelled');
create type audit_action as enum ('create', 'update', 'delete', 'restore', 'status_change', 'custom');

-- ============================================================
-- PARTE 4 (antecipada) — Função genérica updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- PARTE 2 — Constante UUID GetBrain (função helper)
-- ============================================================
create or replace function public.getbrain_org_id()
returns uuid
language sql
immutable
set search_path = public
as $$
  select '00000000-0000-0000-0000-000000000001'::uuid;
$$;

-- ============================================================
-- PARTE 3 — TABELAS
-- ============================================================

-- 3.1 organizations
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

-- 3.2 actors
create table public.actors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  type actor_type not null,
  display_name text not null,
  avatar_url text,
  status actor_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_actors_org on public.actors(organization_id) where deleted_at is null;
create index idx_actors_type on public.actors(type) where deleted_at is null;
create trigger trg_actors_updated_at before update on public.actors
  for each row execute function public.set_updated_at();

-- 3.3 humans
create table public.humans (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null unique references public.actors(id) on delete restrict,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  phone text,
  cpf text,
  role human_role not null,
  employment_type employment_type not null,
  fixed_monthly_pay numeric(12,2),
  hourly_cost numeric(12,2),
  variable_percentage numeric(5,2),
  contract_start_date date,
  contract_end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_humans_auth on public.humans(auth_user_id);
create index idx_humans_role on public.humans(role);
create trigger trg_humans_updated_at before update on public.humans
  for each row execute function public.set_updated_at();

-- 3.4 ai_agents
create table public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null unique references public.actors(id) on delete restrict,
  provider ai_provider not null,
  model text not null,
  system_prompt text,
  capabilities text[] default '{}',
  cost_per_1k_input_tokens_usd numeric(10,6),
  cost_per_1k_output_tokens_usd numeric(10,6),
  openclaw_agent_id text,
  config jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_ai_agents_updated_at before update on public.ai_agents
  for each row execute function public.set_updated_at();

-- 3.5 companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  legal_name text not null,
  trade_name text,
  cnpj text,
  company_type company_type not null,
  industry text,
  size company_size,
  website text,
  status company_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_actor_id uuid references public.actors(id) on delete set null
);
create index idx_companies_org on public.companies(organization_id) where deleted_at is null;
create index idx_companies_type on public.companies(company_type) where deleted_at is null;
create unique index idx_companies_cnpj on public.companies(cnpj) where cnpj is not null and deleted_at is null;
create trigger trg_companies_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

-- 3.6 people
create table public.people (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  full_name text not null,
  email text,
  phone text,
  role_in_company text,
  linkedin_url text,
  notes text,
  status person_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index idx_people_org on public.people(organization_id) where deleted_at is null;
create index idx_people_email on public.people(email) where email is not null and deleted_at is null;
create trigger trg_people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- 3.7 company_people
create table public.company_people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  is_primary_contact boolean not null default false,
  role text,
  started_at date,
  ended_at date,
  created_at timestamptz not null default now()
);
create unique index idx_company_people_unique on public.company_people(company_id, person_id) where ended_at is null;
create index idx_company_people_primary on public.company_people(company_id) where is_primary_contact = true and ended_at is null;

-- 3.8 projects (com sequência e função para code)
create sequence if not exists public.project_code_seq start 1;

create or replace function public.generate_project_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  next_num int;
begin
  next_num := nextval('public.project_code_seq');
  return 'PRJ-' || lpad(next_num::text, 3, '0');
end;
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text unique not null default public.generate_project_code(),
  name text not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  owner_actor_id uuid references public.actors(id) on delete set null,
  status project_status not null default 'proposta',
  project_type project_type not null,
  contract_value numeric(12,2),
  installments_count int,
  token_budget_brl numeric(12,2),
  start_date date,
  estimated_delivery_date date,
  actual_delivery_date date,
  description text,
  acceptance_criteria text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_actor_id uuid references public.actors(id) on delete set null,
  updated_by_actor_id uuid references public.actors(id) on delete set null
);
create index idx_projects_org on public.projects(organization_id) where deleted_at is null;
create index idx_projects_company on public.projects(company_id) where deleted_at is null;
create index idx_projects_status on public.projects(status) where deleted_at is null;
create index idx_projects_type on public.projects(project_type) where deleted_at is null;
create trigger trg_projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- 3.9 project_actors
create table public.project_actors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid not null references public.actors(id) on delete restrict,
  role_in_project project_actor_role not null,
  allocation_percent numeric(5,2),
  started_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now()
);
create unique index idx_project_actors_active on public.project_actors(project_id, actor_id) where ended_at is null;
create index idx_project_actors_project on public.project_actors(project_id) where ended_at is null;
create index idx_project_actors_actor on public.project_actors(actor_id) where ended_at is null;

-- 3.10 maintenance_contracts
create table public.maintenance_contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  monthly_fee numeric(12,2) not null,
  monthly_fee_discount_percent numeric(5,2) not null default 0,
  token_budget_brl numeric(12,2),
  hours_budget int,
  start_date date not null,
  end_date date,
  status maintenance_contract_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by_actor_id uuid references public.actors(id) on delete set null,
  updated_by_actor_id uuid references public.actors(id) on delete set null
);
create index idx_maintenance_project on public.maintenance_contracts(project_id) where deleted_at is null;
create index idx_maintenance_status on public.maintenance_contracts(status) where deleted_at is null;
create unique index idx_maintenance_one_active_per_project
  on public.maintenance_contracts(project_id)
  where status = 'active' and deleted_at is null;
create trigger trg_maintenance_contracts_updated_at before update on public.maintenance_contracts
  for each row execute function public.set_updated_at();

-- 3.11 audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_id uuid references public.actors(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action audit_action not null,
  changes jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_actor on public.audit_logs(actor_id);
create index idx_audit_created on public.audit_logs(created_at desc);

-- ============================================================
-- PARTE 5 — RLS (política simples authenticated, igual ao resto do sistema)
-- ============================================================
alter table public.organizations enable row level security;
create policy "auth full access organizations" on public.organizations
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.actors enable row level security;
create policy "auth full access actors" on public.actors
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.humans enable row level security;
create policy "auth full access humans" on public.humans
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.ai_agents enable row level security;
create policy "auth full access ai_agents" on public.ai_agents
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.companies enable row level security;
create policy "auth full access companies" on public.companies
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.people enable row level security;
create policy "auth full access people" on public.people
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.company_people enable row level security;
create policy "auth full access company_people" on public.company_people
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.projects enable row level security;
create policy "auth full access projects" on public.projects
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.project_actors enable row level security;
create policy "auth full access project_actors" on public.project_actors
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

alter table public.maintenance_contracts enable row level security;
create policy "auth full access maintenance_contracts" on public.maintenance_contracts
  for all to authenticated
  using (auth.uid() is not null) with check (auth.uid() is not null);

-- audit_logs: leitura para autenticados, insert para autenticados, sem update/delete
alter table public.audit_logs enable row level security;
create policy "auth read audit_logs" on public.audit_logs
  for select to authenticated using (auth.uid() is not null);
create policy "auth insert audit_logs" on public.audit_logs
  for insert to authenticated with check (auth.uid() is not null);

-- ============================================================
-- PARTE 6 — SEED de dados reais
-- ============================================================

-- Organização GetBrain
insert into public.organizations (id, name, slug)
values ('00000000-0000-0000-0000-000000000001', 'GetBrain', 'getbrain');

-- Actors
with new_actors as (
  insert into public.actors (organization_id, type, display_name, status)
  values
    ('00000000-0000-0000-0000-000000000001', 'human', 'Daniel', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'human', 'Vitor Correa', 'active'),
    ('00000000-0000-0000-0000-000000000001', 'human', 'João Pedro', 'active')
  returning id, display_name
)
insert into public.humans (actor_id, email, role, employment_type, fixed_monthly_pay)
select
  a.id,
  case a.display_name
    when 'Daniel' then 'daniel@getbrain.com.br'
    when 'Vitor Correa' then 'vitor@getbrain.com.br'
    when 'João Pedro' then 'joao.pedro@getbrain.com.br'
  end,
  case a.display_name
    when 'Daniel' then 'owner'::human_role
    else 'developer'::human_role
  end,
  case a.display_name
    when 'Daniel' then 'founder'::employment_type
    else 'pj'::employment_type
  end,
  case a.display_name
    when 'Daniel' then null
    when 'Vitor Correa' then 3000
    when 'João Pedro' then 2000
  end
from new_actors a;

-- Companies (clientes reais)
insert into public.companies (organization_id, legal_name, trade_name, company_type, industry, status)
values
  ('00000000-0000-0000-0000-000000000001', 'Equipe Certa', 'Equipe Certa', 'client', 'RH/Recrutamento', 'active'),
  ('00000000-0000-0000-0000-000000000001', 'NOI', 'NOI', 'client', null, 'active'),
  ('00000000-0000-0000-0000-000000000001', 'No Frontier', 'No Frontier', 'client', 'Tradução/Interpretação', 'active');

-- Projects
insert into public.projects (organization_id, name, company_id, owner_actor_id, status, project_type, description)
select
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Triagem de Candidatos',
  c.id,
  (select a.id from public.actors a where a.display_name = 'Daniel'),
  'em_manutencao'::project_status,
  'sistema_personalizado'::project_type,
  'Sistema de triagem de candidatos integrado a Recrutei, Evolution API (WhatsApp), OpenAI e Microsoft Graph'
from public.companies c where c.legal_name = 'Equipe Certa';

insert into public.projects (organization_id, name, company_id, owner_actor_id, status, project_type)
select
  '00000000-0000-0000-0000-000000000001',
  'Sistema Personalizado',
  c.id,
  (select a.id from public.actors a where a.display_name = 'Daniel'),
  'em_desenvolvimento'::project_status,
  'sistema_personalizado'::project_type
from public.companies c where c.legal_name = 'NOI';

insert into public.projects (organization_id, name, company_id, owner_actor_id, status, project_type)
select
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Tradução e Interpretação',
  c.id,
  (select a.id from public.actors a where a.display_name = 'Daniel'),
  'em_manutencao'::project_status,
  'sistema_personalizado'::project_type
from public.companies c where c.legal_name = 'No Frontier';

-- Project actors: Daniel como owner em todos
insert into public.project_actors (project_id, actor_id, role_in_project)
select p.id, (select a.id from public.actors a where a.display_name = 'Daniel'), 'owner'::project_actor_role
from public.projects p;

-- Maintenance contracts (Equipe Certa e No Frontier)
insert into public.maintenance_contracts (organization_id, project_id, monthly_fee, monthly_fee_discount_percent, start_date, status)
select
  '00000000-0000-0000-0000-000000000001',
  p.id,
  750,
  50,
  current_date,
  'active'::maintenance_contract_status
from public.projects p
join public.companies c on c.id = p.company_id
where c.legal_name = 'Equipe Certa';

insert into public.maintenance_contracts (organization_id, project_id, monthly_fee, monthly_fee_discount_percent, start_date, status)
select
  '00000000-0000-0000-0000-000000000001',
  p.id,
  550,
  50,
  current_date,
  'active'::maintenance_contract_status
from public.projects p
join public.companies c on c.id = p.company_id
where c.legal_name = 'No Frontier';