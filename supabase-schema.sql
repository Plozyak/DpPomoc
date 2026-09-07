-- DiplomovaDilna CRM v2: normalized schema
-- Safe additive migration. Existing crm_state is kept for backward compatibility.
-- Run in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

-- Legacy cloud state (kept temporarily)
create table if not exists public.crm_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"editors":[],"orders":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  preferred_channel text,
  source text default 'manual',
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders / leads
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  order_no text,
  stage text not null default 'ЛІД',
  status text not null default 'Активний',
  work_type text,
  help_type text,
  topic text,
  pages_text text,
  pages numeric,
  deadline_text text,
  deadline date,
  institution text,
  faculty text,
  department text,
  supervisor text,
  citation_style text,
  methodology text,
  client_price numeric(12,2) not null default 0,
  editor_budget numeric(12,2) not null default 0,
  editor_id uuid,
  source text default 'manual',
  source_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  custom_fields jsonb not null default '{}'::jsonb,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_stage_check check (stage in ('ЛІД','Опрацьований','Договір','1 ОПЛАТА','2 ОПЛАТА','Надіслано роботу','Правки','Фінальна оплата'))
);

-- Editors
create table if not exists public.editors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  specialization text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add editor FK after editors exists
alter table public.orders drop constraint if exists orders_editor_id_fkey;
alter table public.orders add constraint orders_editor_id_fkey foreign key (editor_id) references public.editors(id) on delete set null;

-- Payments from clients
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  method text,
  note text,
  created_at timestamptz not null default now()
);

-- Editor payouts
create table if not exists public.editor_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  editor_id uuid references public.editors(id) on delete set null,
  amount numeric(12,2) not null,
  paid_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

-- Other expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  amount numeric(12,2) not null,
  category text,
  spent_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now()
);

-- Unified communications: website form, email, WhatsApp, internal system events
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  channel text not null,
  direction text not null default 'in',
  sender text,
  recipient text,
  subject text,
  body text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Internal notes
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  note_type text default 'Внутрішня',
  body text not null,
  created_at timestamptz not null default now()
);

-- File metadata (actual files can live in Supabase Storage later)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  file_name text not null,
  storage_path text,
  file_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists clients_owner_email_idx on public.clients(owner_id, lower(email));
create index if not exists clients_owner_phone_idx on public.clients(owner_id, phone);
create index if not exists orders_owner_stage_idx on public.orders(owner_id, stage);
create index if not exists orders_owner_created_idx on public.orders(owner_id, created_at desc);
create index if not exists messages_order_time_idx on public.messages(order_id, occurred_at desc);
create index if not exists payments_order_time_idx on public.payments(order_id, paid_at desc);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists editors_set_updated_at on public.editors;
create trigger editors_set_updated_at before update on public.editors for each row execute function public.set_updated_at();

-- RLS
alter table public.crm_state enable row level security;
alter table public.clients enable row level security;
alter table public.orders enable row level security;
alter table public.editors enable row level security;
alter table public.payments enable row level security;
alter table public.editor_payments enable row level security;
alter table public.expenses enable row level security;
alter table public.messages enable row level security;
alter table public.notes enable row level security;
alter table public.files enable row level security;

-- Authenticated users may only access their own rows.
-- Service-role requests from Netlify bypass RLS by design.
do $$
declare t text;
begin
  foreach t in array array['clients','orders','editors','payments','editor_payments','expenses','messages','notes','files']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_own_all', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id)', t || '_own_all', t);
  end loop;
end $$;

drop policy if exists "crm_state_select_own" on public.crm_state;
drop policy if exists "crm_state_insert_own" on public.crm_state;
drop policy if exists "crm_state_update_own" on public.crm_state;
drop policy if exists "crm_state_delete_own" on public.crm_state;
create policy "crm_state_select_own" on public.crm_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "crm_state_insert_own" on public.crm_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "crm_state_update_own" on public.crm_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "crm_state_delete_own" on public.crm_state for delete to authenticated using ((select auth.uid()) = user_id);

-- API grants. RLS still restricts authenticated rows.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.clients, public.orders, public.editors, public.payments, public.editor_payments, public.expenses, public.messages, public.notes, public.files to authenticated;

notify pgrst, 'reload schema';
