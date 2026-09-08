-- Public booking surface: two SECURITY DEFINER functions are the ONLY way an
-- anonymous visitor ever touches tenant tables. No table grants to `anon`.

-- Read-only: candidate start times for a given business/service(s)/date,
-- derived from business_hours minus existing non-cancelled appointments for
-- the (single, MVP) active staff member. This read can go stale by a few
-- seconds under concurrent bookings -- that's fine, because the exclusion
-- constraint on `appointments` (0001_init.sql) is the actual race-condition
-- guard, not this read.
create or replace function get_available_slots(
  p_business_slug text,
  p_service_ids uuid[],
  p_date date
)
returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  v_business businesses;
  v_staff_id uuid;
  v_duration int;
  v_weekday int;
  v_hours record;
  v_slot timestamptz;
  v_slot_end timestamptz;
begin
  select * into v_business from businesses where slug = p_business_slug and active;
  if not found then
    return;
  end if;

  select coalesce(sum(duration_minutes), 0) into v_duration
  from services where id = any (p_service_ids) and business_id = v_business.id;
  if v_duration = 0 then
    return;
  end if;

  select id into v_staff_id from staff_members
    where business_id = v_business.id and active limit 1;
  if v_staff_id is null then
    return;
  end if;

  v_weekday := extract(dow from p_date)::int;

  for v_hours in
    select start_time, end_time from business_hours
    where business_id = v_business.id and weekday = v_weekday
  loop
    v_slot := (p_date::text || ' ' || v_hours.start_time::text)::timestamp at time zone v_business.timezone;
    while v_slot + (v_duration || ' minutes')::interval
          <= (p_date::text || ' ' || v_hours.end_time::text)::timestamp at time zone v_business.timezone
    loop
      v_slot_end := v_slot + (v_duration || ' minutes')::interval;
      if not exists (
        select 1 from appointments a
        where a.staff_member_id = v_staff_id
          and a.status <> 'cancelled'
          and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(v_slot, v_slot_end, '[)')
      ) and v_slot > now() then
        slot_start := v_slot;
        return next;
      end if;
      v_slot := v_slot + (v_duration || ' minutes')::interval;
    end loop;
  end loop;
end;
$$;

-- Write path: creates/updates the customer and inserts the appointment.
-- The exclusion constraint on `appointments` is what actually prevents two
-- concurrent bookings from grabbing the same slot -- this function just
-- turns that into a friendly SLOT_TAKEN error instead of a raw SQL error.
create or replace function create_public_booking(
  p_business_slug text,
  p_service_ids uuid[],
  p_starts_at timestamptz,
  p_full_name text,
  p_phone text,
  p_email text default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_business businesses;
  v_staff_id uuid;
  v_customer_id uuid;
  v_appointment_id uuid;
  v_duration int;
  v_weekday int;
begin
  select * into v_business from businesses where slug = p_business_slug and active;
  if not found then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  select coalesce(sum(duration_minutes), 0) into v_duration
  from services where id = any (p_service_ids) and business_id = v_business.id;
  if v_duration = 0
     or (select count(*) from services where id = any (p_service_ids)) <> array_length(p_service_ids, 1)
  then
    raise exception 'INVALID_SERVICES';
  end if;

  select id into v_staff_id from staff_members
    where business_id = v_business.id and active limit 1;
  if v_staff_id is null then
    raise exception 'NO_STAFF_AVAILABLE';
  end if;

  v_weekday := extract(dow from (p_starts_at at time zone v_business.timezone))::int;
  perform 1 from business_hours bh
    where bh.business_id = v_business.id
      and bh.weekday = v_weekday
      and (p_starts_at at time zone v_business.timezone)::time >= bh.start_time
      and ((p_starts_at at time zone v_business.timezone) + (v_duration || ' minutes')::interval)::time <= bh.end_time;
  if not found then
    raise exception 'OUTSIDE_BUSINESS_HOURS';
  end if;

  if p_starts_at <= now() then
    raise exception 'SLOT_IN_PAST';
  end if;

  insert into customers (business_id, full_name, phone, email)
  values (v_business.id, p_full_name, p_phone, p_email)
  on conflict (business_id, phone)
  do update set full_name = excluded.full_name,
                email = coalesce(excluded.email, customers.email)
  returning id into v_customer_id;

  begin
    insert into appointments (business_id, customer_id, staff_member_id, starts_at, ends_at, created_via)
    values (v_business.id, v_customer_id, v_staff_id, p_starts_at,
            p_starts_at + (v_duration || ' minutes')::interval, 'public_booking')
    returning id into v_appointment_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';
  end;

  insert into appointment_services (appointment_id, business_id, service_id, price_cents, duration_minutes)
  select v_appointment_id, v_business.id, s.id, s.price_cents, s.duration_minutes
  from services s where s.id = any (p_service_ids);

  return v_appointment_id;
end;
$$;

revoke all on function get_available_slots(text, uuid[], date) from public;
grant execute on function get_available_slots(text, uuid[], date) to anon, authenticated;

revoke all on function create_public_booking(text, uuid[], timestamptz, text, text, text) from public;
grant execute on function create_public_booking(text, uuid[], timestamptz, text, text, text) to anon, authenticated;
