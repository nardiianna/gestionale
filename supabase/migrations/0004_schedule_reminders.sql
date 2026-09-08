-- Read-only helper joining everything the reminder sender needs per due
-- reminder: appointment, customer email, business name/timezone (for
-- formatting), and each business's own reminder_settings. The "not yet
-- sent" check re-does what 0003's partial unique index already guarantees
-- can never be violated -- this is just to avoid reprocessing the same
-- appointment on every run.
--
-- Scheduling note: this project's Supabase account doesn't have
-- organization-level API access from this machine (it was created under a
-- different account), so pg_cron + a Supabase Edge Function isn't
-- deployable here. The actual sender runs instead as a Vercel Cron Job
-- hitting a Next.js Route Handler (src/app/api/cron/send-reminders),
-- which calls this same function via the regular Supabase client.
create or replace function get_due_reminders()
returns table (
  appointment_id uuid,
  starts_at timestamptz,
  customer_email text,
  customer_name text,
  business_name text,
  business_timezone text,
  email_subject_template text
)
language sql stable as $$
  select a.id, a.starts_at, c.email, c.full_name, b.name, b.timezone, rs.email_subject_template
  from appointments a
  join customers c on c.id = a.customer_id
  join businesses b on b.id = a.business_id
  join reminder_settings rs on rs.business_id = a.business_id
  where a.status = 'scheduled'
    and rs.enabled
    and c.email is not null
    and a.starts_at > now()
    and a.starts_at <= now() + (rs.hours_before || ' hours')::interval
    and not exists (
      select 1 from reminder_log rl
      where rl.appointment_id = a.id and rl.reminder_type = 'email_24h' and rl.status = 'sent'
    );
$$;

revoke all on function get_due_reminders() from public;
grant execute on function get_due_reminders() to service_role;
