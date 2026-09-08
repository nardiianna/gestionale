-- Core schema: businesses (tenants), profiles (staff/super_admin), services,
-- customers, appointments, business hours, and row-level security.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  timezone text not null default 'Europe/Rome',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('super_admin', 'staff')),
  business_id uuid references businesses (id),
  full_name text,
  created_at timestamptz not null default now(),
  constraint staff_must_have_business check (
    (role = 'staff' and business_id is not null) or
    (role = 'super_admin' and business_id is null)
  )
);

-- Lightweight "operatore" picklist used by the appointment form.
-- MVP: one row per business (the owner) -- no invites/permissions yet.
create table staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  profile_id uuid references profiles (id),
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents int not null default 0,
  color text not null default '#6366f1',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  customer_id uuid not null references customers (id),
  staff_member_id uuid not null references staff_members (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_via text not null default 'staff'
    check (created_via in ('staff', 'public_booking')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Authoritative anti-double-booking guard: two non-cancelled appointments
  -- for the same operator can never overlap in time. Enforced by the DB,
  -- not application logic, so it holds under real concurrency.
  exclude using gist (
    staff_member_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status <> 'cancelled')
);
create index appointments_business_starts_idx on appointments (business_id, starts_at);
create index appointments_customer_idx on appointments (customer_id);

-- Multi-service per appointment. Price/duration are snapshots at booking
-- time -- a forward-compatible hook for future invoicing without having to
-- design invoicing tables now.
create table appointment_services (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  business_id uuid not null references businesses (id),
  service_id uuid not null references services (id),
  price_cents int not null,
  duration_minutes int not null,
  unique (appointment_id, service_id)
);

-- Local wall-clock weekly hours. Multiple rows per weekday allow split shifts.
create table business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS helper functions
--
-- SECURITY DEFINER from day one: a policy that queries `profiles` from
-- within a policy ON `profiles` recurses infinitely unless the lookup goes
-- through a SECURITY DEFINER function (this bit Enea -- baking the fix in
-- here from the start).
-- ─────────────────────────────────────────────────────────────────────────

create or replace function is_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function my_business_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from profiles where id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS: enable + tenant-isolation policies.
-- No table below ever grants anything to `anon` -- the only public surface
-- is the SECURITY DEFINER RPC functions added in 0002_public_booking_rpc.sql.
-- ─────────────────────────────────────────────────────────────────────────

alter table businesses enable row level security;
alter table profiles enable row level security;
alter table staff_members enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table business_hours enable row level security;

create policy businesses_select on businesses for select
  using (is_super_admin() or id = my_business_id());
create policy businesses_write on businesses for all
  using (is_super_admin()) with check (is_super_admin());

create policy profiles_select on profiles for select
  using (id = auth.uid() or is_super_admin());
create policy profiles_write on profiles for all
  using (is_super_admin()) with check (is_super_admin());

create policy staff_members_tenant on staff_members for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

create policy services_tenant on services for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

create policy customers_tenant on customers for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

create policy appointments_tenant on appointments for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

create policy appointment_services_tenant on appointment_services for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

create policy business_hours_tenant on business_hours for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());
