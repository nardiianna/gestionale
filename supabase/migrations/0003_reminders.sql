-- Reminder configuration + send log. The pg_cron schedule that actually
-- triggers the send-reminders Edge Function is set up separately (see
-- supabase/functions/send-reminders/README.md) once the project exists and
-- has a deployed function URL + secret to call -- it can't be a plain
-- migration here without embedding real, project-specific secrets.

create table reminder_settings (
  business_id uuid primary key references businesses (id) on delete cascade,
  enabled boolean not null default true,
  hours_before int not null default 24 check (hours_before > 0),
  email_subject_template text not null default 'Promemoria appuntamento',
  email_body_template text,
  updated_at timestamptz not null default now()
);

-- Dedupe guard for sent reminders. `reminder_type` is forward-compatible
-- with future channels (sms_24h, whatsapp_24h, ...).
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  reminder_type text not null default 'email_24h',
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

-- Only one *successful* send per appointment/type is ever allowed; failed
-- attempts can accumulate for audit/retry without blocking a later success.
create unique index reminder_log_sent_unique
  on reminder_log (appointment_id, reminder_type) where (status = 'sent');

alter table reminder_settings enable row level security;
alter table reminder_log enable row level security;

create policy reminder_settings_tenant on reminder_settings for all
  using (is_super_admin() or business_id = my_business_id())
  with check (is_super_admin() or business_id = my_business_id());

-- reminder_log is written by the Edge Function via the service-role key
-- (which bypasses RLS entirely), so staff only need read access here.
create policy reminder_log_select on reminder_log for select
  using (
    is_super_admin() or exists (
      select 1 from appointments a
      where a.id = reminder_log.appointment_id and a.business_id = my_business_id()
    )
  );
