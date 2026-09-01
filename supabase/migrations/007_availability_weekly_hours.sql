-- =========================================================
-- Weekly "open hours" template for teacher availability.
-- Teacher sets recurring day-of-week open/close ranges once;
-- generate_availability_slots() expands them into concrete
-- 1-hour public.availability rows for a rolling N-day window.
-- Existing availability table / booking RPCs are untouched.
-- =========================================================

-- Dedupe existing availability rows before adding the uniqueness
-- constraint below — the old one-slot-at-a-time UI had no guard
-- against inserting the same (skill_id, start_time) twice. Keep the
-- booked row if one exists (it's FK'd to a real session), else oldest.
with ranked as (
  select availability_id,
         row_number() over (
           partition by skill_id, start_time
           order by booked desc, created_at asc
         ) as rn
  from public.availability
)
delete from public.availability a
using ranked r
where a.availability_id = r.availability_id and r.rn > 1;

alter table public.availability
  add constraint availability_unique_skill_start unique (skill_id, start_time);

-- Recurring weekly template.
create table public.availability_hours (
  hours_id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(skill_id) on delete cascade,
  user_id uuid not null references public.users(user_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun..6=Sat, matches extract(dow from date)
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint availability_hours_valid_range check (end_time > start_time)
);

create index availability_hours_skill_id_idx on public.availability_hours(skill_id);
create index availability_hours_user_id_idx on public.availability_hours(user_id);

alter table public.availability_hours enable row level security;

create policy "Availability hours are viewable by everyone"
  on public.availability_hours for select using (true);
create policy "Users can add their own availability hours"
  on public.availability_hours for insert with check (auth.uid() = user_id);
create policy "Users can update their own availability hours"
  on public.availability_hours for update using (auth.uid() = user_id);
create policy "Users can delete their own availability hours"
  on public.availability_hours for delete using (auth.uid() = user_id);

-- Expands availability_hours into concrete 1-hour availability rows
-- for [today .. today + p_days_ahead - 1]. Idempotent (ON CONFLICT DO
-- NOTHING), additive-only — never updates/deletes existing rows, so
-- booked or manually-added slots are never touched.
create or replace function public.generate_availability_slots(
  p_skill_id uuid,
  p_days_ahead integer default 14
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_day date;
  v_dow smallint;
  v_hours record;
  v_cursor time;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
begin
  select user_id into v_owner_id from public.skills where skill_id = p_skill_id;
  if v_owner_id is null then
    raise exception 'Skill not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'Only the skill owner can generate availability';
  end if;

  for v_day in
    select generate_series(
      current_date,
      current_date + (greatest(p_days_ahead, 1) - 1) * interval '1 day',
      interval '1 day'
    )::date
  loop
    v_dow := extract(dow from v_day);

    for v_hours in
      select start_time, end_time
      from public.availability_hours
      where skill_id = p_skill_id and day_of_week = v_dow
    loop
      v_cursor := v_hours.start_time;
      while v_cursor + interval '1 hour' <= v_hours.end_time loop
        v_slot_start := (v_day + v_cursor)::timestamptz;
        v_slot_end := v_slot_start + interval '1 hour';

        if v_slot_start > now() then
          insert into public.availability (user_id, skill_id, start_time, end_time)
          values (v_owner_id, p_skill_id, v_slot_start, v_slot_end)
          on conflict (skill_id, start_time) do nothing;
        end if;

        v_cursor := v_cursor + interval '1 hour';
      end loop;
    end loop;
  end loop;
end;
$$;

-- Replace-the-whole-week semantics: delete this skill's existing
-- template rows, bulk-insert the new set, regenerate immediately so
-- the UI doesn't need a second round-trip. p_hours shape:
--   [{ "day_of_week": 1, "start_time": "09:00:00", "end_time": "17:00:00" }, ...]
create or replace function public.set_availability_hours(
  p_skill_id uuid,
  p_hours jsonb
)
returns setof public.availability_hours
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_item jsonb;
  v_day_of_week smallint;
  v_start time;
  v_end time;
begin
  select user_id into v_owner_id from public.skills where skill_id = p_skill_id;
  if v_owner_id is null then
    raise exception 'Skill not found';
  end if;
  if v_owner_id <> auth.uid() then
    raise exception 'Only the skill owner can set availability hours';
  end if;

  delete from public.availability_hours where skill_id = p_skill_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_hours, '[]'::jsonb))
  loop
    v_day_of_week := (v_item ->> 'day_of_week')::smallint;
    v_start := (v_item ->> 'start_time')::time;
    v_end := (v_item ->> 'end_time')::time;

    if v_day_of_week is null or v_day_of_week < 0 or v_day_of_week > 6 then
      raise exception 'Invalid day_of_week: %', v_item ->> 'day_of_week';
    end if;
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'Invalid time range for day %', v_day_of_week;
    end if;

    insert into public.availability_hours (skill_id, user_id, day_of_week, start_time, end_time)
    values (p_skill_id, v_owner_id, v_day_of_week, v_start, v_end);
  end loop;

  perform public.generate_availability_slots(p_skill_id);

  return query
    select * from public.availability_hours
    where skill_id = p_skill_id
    order by day_of_week, start_time;
end;
$$;

grant execute on function public.generate_availability_slots(uuid, integer) to authenticated;
grant execute on function public.set_availability_hours(uuid, jsonb) to authenticated;
