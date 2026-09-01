-- =========================================================
-- SkillSwap — Supabase schema
-- Browse skills -> Book session -> Spend/Earn time tokens
-- Matches the approved ERD/use cases and the shapes already
-- queried by src/services/{supabase,auth,api,swapService}.js
-- =========================================================

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------
create type public.session_status as enum ('pending', 'completed', 'cancelled');
create type public.transaction_type as enum ('earn', 'spend');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'scheduled');
create type public.swipe_direction as enum ('left', 'right', 'maybe');

-- ---------------------------------------------------------
-- users (profile row, 1:1 with auth.users)
-- PK is named user_id (not id) to match src/services/*.js,
-- which does .eq('user_id', ...) everywhere.
-- ---------------------------------------------------------
create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar text,
  bio text,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- token_wallet (singular — matches supabase.from('token_wallet'))
-- ---------------------------------------------------------
create table public.token_wallet (
  wallet_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(user_id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- skills
-- ---------------------------------------------------------
create table public.skills (
  skill_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  title text not null check (char_length(title) >= 3),
  description text,
  category text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- availability
-- ---------------------------------------------------------
create table public.availability (
  availability_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  skill_id uuid not null references public.skills(skill_id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint availability_valid_range check (end_time > start_time),
  constraint availability_unique_skill_start unique (skill_id, start_time)
);

-- ---------------------------------------------------------
-- availability_hours — recurring weekly "open hours" template.
-- Teacher sets these once per skill; generate_availability_slots()
-- expands them into concrete public.availability rows for a rolling
-- window (see functions below). Matches
-- supabase.rpc('set_availability_hours', { p_skill_id, p_hours }).
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- sessions
-- ---------------------------------------------------------
create table public.sessions (
  session_id uuid primary key default gen_random_uuid(),
  availability_id uuid not null unique references public.availability(availability_id) on delete cascade,
  teacher_id uuid not null references public.users(user_id),
  learner_id uuid not null references public.users(user_id),
  session_date timestamptz not null,
  duration integer not null default 60 check (duration > 0),
  status public.session_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint sessions_distinct_parties check (teacher_id <> learner_id)
);

-- ---------------------------------------------------------
-- session_availability — links a session to every availability slot it
-- consumed. A session can span more than one contiguous slot (a 3-hour
-- lesson = 3 rows here); sessions.availability_id above still points at
-- just the first one, for the existing display joins.
-- ---------------------------------------------------------
create table public.session_availability (
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  availability_id uuid not null references public.availability(availability_id) on delete cascade,
  primary key (session_id, availability_id)
);

-- ---------------------------------------------------------
-- session_requests — "ask to book" step before a session
-- exists. A learner requests a skill (no time attached yet);
-- the teacher accepts/declines; only once accepted does the
-- learner pick a specific open slot, which is when the actual
-- sessions row gets created and the token is spent.
-- ---------------------------------------------------------
create table public.session_requests (
  request_id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(skill_id) on delete cascade,
  teacher_id uuid not null references public.users(user_id),
  learner_id uuid not null references public.users(user_id),
  message text,
  status public.request_status not null default 'pending',
  session_id uuid references public.sessions(session_id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint session_requests_distinct_parties check (teacher_id <> learner_id)
);

-- ---------------------------------------------------------
-- reviews
-- ---------------------------------------------------------
create table public.reviews (
  review_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  reviewer_id uuid not null references public.users(user_id),
  reviewee_id uuid not null references public.users(user_id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_distinct_parties check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_reviewer_per_session unique (session_id, reviewer_id)
);

-- ---------------------------------------------------------
-- token_transactions
-- ---------------------------------------------------------
create table public.token_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  session_id uuid references public.sessions(session_id) on delete set null,
  type public.transaction_type not null,
  amount integer not null,
  description text,
  created_at timestamptz not null default now(),
  constraint token_transactions_amount_sign check (
    (type = 'earn' and amount > 0) or (type = 'spend' and amount < 0)
  )
);

-- ---------------------------------------------------------
-- learning_interests — onboarding: "what do you want to learn?"
-- Category-level, not tied to a specific skill listing, so it
-- works even before anyone teaches that category yet.
-- ---------------------------------------------------------
create table public.learning_interests (
  interest_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint learning_interests_unique unique (user_id, category)
);

-- ---------------------------------------------------------
-- swipes / matches / blocked_users / swap_preferences
-- Skill Match (swipe discovery). A swipe is only visible to
-- the swiper; a mutual right-swipe (checked server-side in
-- record_swipe(), not client-side) creates a match row both
-- sides can see.
-- ---------------------------------------------------------
create table public.swipes (
  swipe_id uuid primary key default gen_random_uuid(),
  swiper_id uuid not null references public.users(user_id) on delete cascade,
  target_id uuid not null references public.users(user_id) on delete cascade,
  direction public.swipe_direction not null,
  created_at timestamptz not null default now(),
  constraint swipes_distinct_parties check (swiper_id <> target_id),
  constraint swipes_unique_pair unique (swiper_id, target_id)
);

create table public.matches (
  match_id uuid primary key default gen_random_uuid(),
  user_id_1 uuid not null references public.users(user_id) on delete cascade,
  user_id_2 uuid not null references public.users(user_id) on delete cascade,
  matched_at timestamptz not null default now(),
  constraint matches_distinct_parties check (user_id_1 <> user_id_2),
  constraint matches_ordered check (user_id_1 < user_id_2),
  constraint matches_unique_pair unique (user_id_1, user_id_2)
);

create table public.blocked_users (
  user_id uuid not null references public.users(user_id) on delete cascade,
  blocked_user_id uuid not null references public.users(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint blocked_users_distinct check (user_id <> blocked_user_id)
);

create table public.swap_preferences (
  user_id uuid primary key references public.users(user_id) on delete cascade,
  skill_category text,
  notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

-- style_preferences — set during onboarding (teaching/learning style),
-- editable later. Public read so a browsing learner's prefs can be
-- compared against a candidate's teach_* prefs in get_swap_candidates.
create table public.style_preferences (
  user_id uuid primary key references public.users(user_id) on delete cascade,
  teach_pace smallint check (teach_pace between 1 and 5),
  teach_structure smallint check (teach_structure between 1 and 5),
  teach_formats text[] not null default '{}',
  learn_pace smallint check (learn_pace between 1 and 5),
  learn_structure smallint check (learn_structure between 1 and 5),
  learn_formats text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------
create index skills_user_id_idx on public.skills(user_id);
create index skills_category_idx on public.skills(category);
create index availability_skill_id_idx on public.availability(skill_id);
create index availability_user_id_idx on public.availability(user_id);
create index availability_unbooked_idx on public.availability(skill_id) where not booked;
create index availability_hours_skill_id_idx on public.availability_hours(skill_id);
create index availability_hours_user_id_idx on public.availability_hours(user_id);
create index sessions_teacher_id_idx on public.sessions(teacher_id);
create index sessions_learner_id_idx on public.sessions(learner_id);
create index session_availability_session_id_idx on public.session_availability(session_id);
create index session_requests_teacher_id_idx on public.session_requests(teacher_id);
create index session_requests_learner_id_idx on public.session_requests(learner_id);
create index reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index token_transactions_user_id_idx on public.token_transactions(user_id);
create index learning_interests_user_id_idx on public.learning_interests(user_id);
create index swipes_swiper_id_idx on public.swipes(swiper_id);
create index swipes_target_id_idx on public.swipes(target_id);
create index matches_user_id_1_idx on public.matches(user_id_1);
create index matches_user_id_2_idx on public.matches(user_id_2);

-- =========================================================
-- Functions & triggers
-- All SECURITY DEFINER functions below are owned by the
-- migration-running role (postgres), which — like the table
-- owner — bypasses RLS. That's what lets them move tokens and
-- write sessions on the user's behalf inside one transaction.
-- =========================================================

-- New Supabase Auth user -> create profile + starter wallet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.token_wallet (user_id, balance)
  values (new.id, 5);

  insert into public.token_transactions (user_id, type, amount, description)
  values (new.id, 'earn', 5, 'Welcome bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep users.rating / review_count in sync with reviews.
create or replace function public.refresh_user_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.users
  set rating = coalesce(
        (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.reviewee_id = v_user_id),
        0
      ),
      review_count = (select count(*) from public.reviews r where r.reviewee_id = v_user_id)
  where user_id = v_user_id;
  return coalesce(new, old);
end;
$$;

create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_user_rating();

-- Step 1: learner asks to book a skill (no time attached). Matches
-- supabase.rpc('request_session', { p_skill_id, p_message }).
create or replace function public.request_session(
  p_skill_id uuid,
  p_message text default null
)
returns public.session_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_id constant uuid := auth.uid();
  v_teacher_id uuid;
  v_request public.session_requests;
begin
  if v_learner_id is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into v_teacher_id from public.skills where skill_id = p_skill_id;
  if v_teacher_id is null then
    raise exception 'Skill not found';
  end if;
  if v_teacher_id = v_learner_id then
    raise exception 'You cannot request your own skill';
  end if;

  insert into public.session_requests (skill_id, teacher_id, learner_id, message)
  values (p_skill_id, v_teacher_id, v_learner_id, p_message)
  returning * into v_request;

  return v_request;
end;
$$;

-- Step 2: teacher accepts or declines. Matches
-- supabase.rpc('respond_to_request', { p_request_id, p_accept }).
create or replace function public.respond_to_request(
  p_request_id uuid,
  p_accept boolean
)
returns public.session_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.session_requests;
begin
  select * into v_request from public.session_requests where request_id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.teacher_id <> auth.uid() then
    raise exception 'Only the teacher can respond to this request';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request has already been responded to';
  end if;

  update public.session_requests
  set status = case when p_accept then 'accepted' else 'declined' end::public.request_status,
      responded_at = now()
  where request_id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- Step 3: learner picks one or more contiguous open slots on an accepted
-- request (a longer session = several back-to-back slots merged into one
-- booking; cost is 1 token per hour). This is the actual Book Session ->
-- Spend Tokens moment. Matches
-- supabase.rpc('schedule_session', { p_request_id, p_availability_ids }).
drop function if exists public.schedule_session(uuid, uuid);

create or replace function public.schedule_session(
  p_request_id uuid,
  p_availability_ids uuid[]
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.session_requests;
  v_input_count integer;
  v_distinct_count integer;
  v_found_count integer;
  v_gap_count integer;
  v_min_start timestamptz;
  v_max_end timestamptz;
  v_total_minutes integer;
  v_cost integer;
  v_skill_title text;
  v_balance integer;
  v_session public.sessions;
  v_primary_availability_id uuid;
begin
  if p_availability_ids is null or array_length(p_availability_ids, 1) is null then
    raise exception 'No time slots selected';
  end if;

  v_input_count := array_length(p_availability_ids, 1);
  select count(distinct x) into v_distinct_count from unnest(p_availability_ids) as x;
  if v_distinct_count <> v_input_count then
    raise exception 'Duplicate time slots selected';
  end if;

  select * into v_request from public.session_requests where request_id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.learner_id <> auth.uid() then
    raise exception 'Only the requesting learner can schedule this session';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'This request has not been accepted yet';
  end if;

  -- Lock every requested slot before validating so nothing else can book
  -- one out from under this transaction.
  perform 1 from public.availability where availability_id = any(p_availability_ids) for update;

  select count(*) into v_found_count from public.availability where availability_id = any(p_availability_ids);
  if v_found_count <> v_input_count then
    raise exception 'One or more time slots were not found';
  end if;

  if exists (select 1 from public.availability where availability_id = any(p_availability_ids) and booked) then
    raise exception 'One or more of these time slots has already been booked';
  end if;

  if exists (
    select 1 from public.availability
    where availability_id = any(p_availability_ids)
      and (skill_id <> v_request.skill_id or user_id <> v_request.teacher_id)
  ) then
    raise exception 'These slots do not belong to the requested skill';
  end if;

  select count(*) into v_gap_count
  from (
    select start_time, end_time, lag(end_time) over (order by start_time) as prev_end
    from public.availability
    where availability_id = any(p_availability_ids)
  ) ordered
  where prev_end is not null and prev_end <> start_time;
  if v_gap_count > 0 then
    raise exception 'Selected time slots must be consecutive with no gaps';
  end if;

  select min(start_time), max(end_time) into v_min_start, v_max_end
    from public.availability where availability_id = any(p_availability_ids);

  select availability_id into v_primary_availability_id
    from public.availability where availability_id = any(p_availability_ids)
    order by start_time asc limit 1;

  v_total_minutes := greatest(1, round(extract(epoch from (v_max_end - v_min_start)) / 60)::integer);
  v_cost := greatest(1, round(extract(epoch from (v_max_end - v_min_start)) / 3600)::integer);

  select title into v_skill_title from public.skills where skill_id = v_request.skill_id;

  select balance into v_balance from public.token_wallet where user_id = v_request.learner_id for update;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Not enough tokens to book this session';
  end if;

  update public.availability set booked = true where availability_id = any(p_availability_ids);

  insert into public.sessions (availability_id, teacher_id, learner_id, session_date, duration, status)
  values (v_primary_availability_id, v_request.teacher_id, v_request.learner_id, v_min_start, v_total_minutes, 'pending')
  returning * into v_session;

  insert into public.session_availability (session_id, availability_id)
  select v_session.session_id, id from unnest(p_availability_ids) as id;

  update public.token_wallet set balance = balance - v_cost, updated_at = now() where user_id = v_request.learner_id;

  insert into public.token_transactions (user_id, session_id, type, amount, description)
  values (v_request.learner_id, v_session.session_id, 'spend', -v_cost, 'Booked ' || coalesce(v_skill_title, 'a session'));

  update public.session_requests set status = 'scheduled', session_id = v_session.session_id
  where request_id = p_request_id;

  return v_session;
end;
$$;

-- Complete Session -> Earn Tokens. Matches supabase.rpc('complete_session', { p_session_id }).
create or replace function public.complete_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward integer;
  v_session public.sessions;
  v_skill_title text;
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.teacher_id <> auth.uid() then
    raise exception 'Only the teacher can mark a session complete';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be completed';
  end if;

  -- Pay whatever the learner was actually charged, not a flat amount —
  -- sessions can now be more than 1 hour (schedule_session charges 1
  -- token per hour), so the reward must match the real spend.
  select abs(amount) into v_reward
  from public.token_transactions
  where session_id = p_session_id and type = 'spend'
  limit 1;
  v_reward := coalesce(v_reward, 1);

  select s.title into v_skill_title
  from public.availability a
  join public.skills s on s.skill_id = a.skill_id
  where a.availability_id = v_session.availability_id;

  update public.sessions set status = 'completed' where session_id = p_session_id
  returning * into v_session;

  update public.token_wallet set balance = balance + v_reward, updated_at = now()
  where user_id = v_session.teacher_id;

  insert into public.token_transactions (user_id, session_id, type, amount, description)
  values (v_session.teacher_id, p_session_id, 'earn', v_reward, 'Taught ' || coalesce(v_skill_title, 'a session'));

  return v_session;
end;
$$;

-- Cancel a pending session: frees the slot and refunds the learner.
-- Matches supabase.rpc('cancel_session', { p_session_id }).
create or replace function public.cancel_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_refund integer;
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if auth.uid() not in (v_session.teacher_id, v_session.learner_id) then
    raise exception 'Only participants can cancel this session';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be cancelled';
  end if;

  update public.sessions set status = 'cancelled' where session_id = p_session_id
  returning * into v_session;

  update public.availability set booked = false
  where availability_id in (
    select availability_id from public.session_availability where session_id = p_session_id
  );

  select abs(amount) into v_refund
  from public.token_transactions
  where session_id = p_session_id and type = 'spend'
  limit 1;

  if v_refund is not null then
    update public.token_wallet set balance = balance + v_refund, updated_at = now()
    where user_id = v_session.learner_id;

    insert into public.token_transactions (user_id, session_id, type, amount, description)
    values (v_session.learner_id, p_session_id, 'earn', v_refund, 'Refund for cancelled session');
  end if;

  return v_session;
end;
$$;

-- Expands availability_hours into concrete 1-hour availability rows
-- for [today .. today + p_days_ahead - 1]. Idempotent (ON CONFLICT DO
-- NOTHING), additive-only — never updates/deletes existing rows, so
-- booked or manually-added slots are never touched. Matches
-- supabase.rpc('generate_availability_slots', { p_skill_id }).
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
-- Matches supabase.rpc('set_availability_hours', { p_skill_id, p_hours }).
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

-- Records a swipe and, if it completes a mutual right-swipe, creates the
-- match — this is the server-side check that replaced a client-side
-- Math.random() "match" result. Matches
-- supabase.rpc('record_swipe', { p_target_id, p_direction }).
create or replace function public.record_swipe(
  p_target_id uuid,
  p_direction public.swipe_direction
)
returns table (swipe_id uuid, matched boolean, match_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_swiper_id constant uuid := auth.uid();
  v_swipe_id uuid;
  v_reciprocal boolean;
  v_match_id uuid;
  v_user_lo uuid;
  v_user_hi uuid;
begin
  if v_swiper_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_swiper_id = p_target_id then
    raise exception 'You cannot swipe on yourself';
  end if;

  insert into public.swipes (swiper_id, target_id, direction)
  values (v_swiper_id, p_target_id, p_direction)
  on conflict (swiper_id, target_id) do update set direction = excluded.direction
  returning swipes.swipe_id into v_swipe_id;

  if p_direction = 'right' then
    select exists (
      select 1 from public.swipes
      where swiper_id = p_target_id and target_id = v_swiper_id and direction = 'right'
    ) into v_reciprocal;

    if v_reciprocal then
      v_user_lo := least(v_swiper_id, p_target_id);
      v_user_hi := greatest(v_swiper_id, p_target_id);

      insert into public.matches (user_id_1, user_id_2)
      values (v_user_lo, v_user_hi)
      on conflict (user_id_1, user_id_2) do nothing
      returning matches.match_id into v_match_id;

      if v_match_id is null then
        select m.match_id into v_match_id
        from public.matches m
        where m.user_id_1 = v_user_lo and m.user_id_2 = v_user_hi;
      end if;

      return query select v_swipe_id, true, v_match_id;
      return;
    end if;
  end if;

  return query select v_swipe_id, false, null::uuid;
end;
$$;

-- Discovery pool: everyone except yourself, anyone already swiped on, and
-- anyone who's blocked you (or you've blocked). SECURITY DEFINER because
-- checking "has this person blocked me" requires reading a blocked_users
-- row that isn't yours. Also returns teaches_skill_id so a match can deep
-- link straight into requesting that skill, and aggregates every skill/
-- interest (not just the most recent) plus member_since for a fuller
-- swipe-card profile.
drop function if exists public.get_swap_candidates(integer);

-- Ranks/flags candidates by real style compatibility (learn_* vs their
-- teach_*) instead of pure recency — a caller with no style_preferences
-- row yet falls back to neutral values (3/3/{}) via the `me` CTE.
drop function if exists public.get_swap_candidates(integer);

create or replace function public.get_swap_candidates(p_limit integer default 10)
returns table (
  user_id uuid,
  name text,
  avatar text,
  bio text,
  rating numeric,
  review_count integer,
  member_since timestamptz,
  teaches text,
  teaches_skill_id uuid,
  category text,
  wants_to_learn text,
  skills json,
  interests json,
  compat_pace boolean,
  compat_structure boolean,
  compat_formats text[]
)
language sql
security definer
set search_path = public
stable
as $$
  with me as (
    select
      coalesce(learn_pace, 3) as learn_pace,
      coalesce(learn_structure, 3) as learn_structure,
      coalesce(learn_formats, '{}'::text[]) as learn_formats
    from public.style_preferences
    where user_id = auth.uid()
    union all
    select 3, 3, '{}'::text[]
    where not exists (select 1 from public.style_preferences where user_id = auth.uid())
    limit 1
  ),
  -- A CTE so compat_pace/compat_structure/compat_formats become real
  -- output columns of `scored` — Postgres won't let a compound ORDER BY
  -- expression (e.g. compat_pace::int + ...) reference a same-level
  -- SELECT-list alias, only a bare one, so scoring has to happen one
  -- level down for the outer ORDER BY to see them as real columns.
  scored as (
    select
      u.user_id,
      u.name,
      u.avatar,
      u.bio,
      u.rating,
      u.review_count,
      u.created_at as member_since,
      s.title as teaches,
      s.skill_id as teaches_skill_id,
      s.category,
      li.category as wants_to_learn,
      coalesce(all_skills.skills, '[]'::json) as skills,
      coalesce(all_interests.interests, '[]'::json) as interests,
      abs(coalesce(sp.teach_pace, 3) - me.learn_pace) <= 1 as compat_pace,
      abs(coalesce(sp.teach_structure, 3) - me.learn_structure) <= 1 as compat_structure,
      coalesce(
        array(
          select unnest(coalesce(sp.teach_formats, '{}'::text[]))
          intersect
          select unnest(me.learn_formats)
        ),
        '{}'::text[]
      ) as compat_formats
    from public.users u
    cross join me
    left join public.style_preferences sp on sp.user_id = u.user_id
    left join lateral (
      select skill_id, title, category from public.skills
      where skills.user_id = u.user_id
      order by created_at desc limit 1
    ) s on true
    left join lateral (
      select category from public.learning_interests
      where learning_interests.user_id = u.user_id
      order by created_at desc limit 1
    ) li on true
    left join lateral (
      select json_agg(json_build_object('skill_id', skill_id, 'title', title, 'category', category) order by created_at desc) as skills
      from public.skills
      where skills.user_id = u.user_id
    ) all_skills on true
    left join lateral (
      select json_agg(category order by created_at desc) as interests
      from public.learning_interests
      where learning_interests.user_id = u.user_id
    ) all_interests on true
    where u.user_id <> auth.uid()
      and not exists (
        select 1 from public.swipes
        where swiper_id = auth.uid() and target_id = u.user_id
      )
      and not exists (
        select 1 from public.blocked_users
        where user_id = auth.uid() and blocked_user_id = u.user_id
      )
      and not exists (
        select 1 from public.blocked_users
        where user_id = u.user_id and blocked_user_id = auth.uid()
      )
  )
  select *
  from scored
  order by
    (compat_pace::int + compat_structure::int + least(coalesce(array_length(compat_formats, 1), 0), 1)) desc,
    member_since desc
  limit p_limit;
$$;

-- Undo the caller's most recent swipe. If it was a 'right' swipe that
-- had formed a match, the match is removed too. Matches
-- supabase.rpc('undo_last_swipe').
create or replace function public.undo_last_swipe()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_swiper_id constant uuid := auth.uid();
  v_last public.swipes;
  v_lo uuid;
  v_hi uuid;
begin
  if v_swiper_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_last from public.swipes
  where swiper_id = v_swiper_id
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Nothing to undo';
  end if;

  if v_last.direction = 'right' then
    v_lo := least(v_swiper_id, v_last.target_id);
    v_hi := greatest(v_swiper_id, v_last.target_id);
    delete from public.matches where user_id_1 = v_lo and user_id_2 = v_hi;
  end if;

  delete from public.swipes where swipe_id = v_last.swipe_id;
end;
$$;

-- Break an existing match and clear both sides' swipe history toward
-- each other, so they're eligible to reappear in get_swap_candidates
-- for both parties. Matches supabase.rpc('unmatch', { p_match_id }).
create or replace function public.unmatch(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
begin
  select * into v_match from public.matches where match_id = p_match_id for update;
  if not found then
    raise exception 'Match not found';
  end if;
  if auth.uid() not in (v_match.user_id_1, v_match.user_id_2) then
    raise exception 'Only participants can unmatch';
  end if;

  delete from public.matches where match_id = p_match_id;
  delete from public.swipes
  where (swiper_id = v_match.user_id_1 and target_id = v_match.user_id_2)
     or (swiper_id = v_match.user_id_2 and target_id = v_match.user_id_1);
end;
$$;

grant execute on function public.request_session(uuid, text) to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.schedule_session(uuid, uuid[]) to authenticated;
grant execute on function public.complete_session(uuid) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;
grant execute on function public.generate_availability_slots(uuid, integer) to authenticated;
grant execute on function public.set_availability_hours(uuid, jsonb) to authenticated;
grant execute on function public.record_swipe(uuid, public.swipe_direction) to authenticated;
grant execute on function public.get_swap_candidates(integer) to authenticated;
grant execute on function public.undo_last_swipe() to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.users enable row level security;
alter table public.token_wallet enable row level security;
alter table public.skills enable row level security;
alter table public.availability enable row level security;
alter table public.availability_hours enable row level security;
alter table public.sessions enable row level security;
alter table public.session_availability enable row level security;
alter table public.session_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.token_transactions enable row level security;
alter table public.learning_interests enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.blocked_users enable row level security;
alter table public.swap_preferences enable row level security;
alter table public.style_preferences enable row level security;

-- users: public directory, self-editable, admins can moderate
create policy "Users are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can update any user"
  on public.users for update
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- token_wallet: private balance, writable only by SECURITY DEFINER functions
create policy "Users can view their own wallet"
  on public.token_wallet for select using (auth.uid() = user_id);

create policy "Admins can view all wallets"
  on public.token_wallet for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- skills: public browse, owner-managed
create policy "Skills are viewable by everyone"
  on public.skills for select using (true);

create policy "Users can add their own skills"
  on public.skills for insert with check (auth.uid() = user_id);

create policy "Users can update their own skills"
  on public.skills for update using (auth.uid() = user_id);

create policy "Users can delete their own skills"
  on public.skills for delete using (auth.uid() = user_id);

-- availability: public browse, owner-managed
create policy "Availability is viewable by everyone"
  on public.availability for select using (true);

create policy "Users can add their own availability"
  on public.availability for insert with check (auth.uid() = user_id);

create policy "Users can update their own availability"
  on public.availability for update using (auth.uid() = user_id);

create policy "Users can delete their own availability"
  on public.availability for delete using (auth.uid() = user_id);

-- availability_hours: public browse, owner-managed (writes normally go
-- through set_availability_hours(), these policies are defense in depth)
create policy "Availability hours are viewable by everyone"
  on public.availability_hours for select using (true);

create policy "Users can add their own availability hours"
  on public.availability_hours for insert with check (auth.uid() = user_id);

create policy "Users can update their own availability hours"
  on public.availability_hours for update using (auth.uid() = user_id);

create policy "Users can delete their own availability hours"
  on public.availability_hours for delete using (auth.uid() = user_id);

-- sessions: participants only; writes go through book/complete/cancel_session()
create policy "Participants can view their sessions"
  on public.sessions for select
  using (auth.uid() = teacher_id or auth.uid() = learner_id);

create policy "Admins can view all sessions"
  on public.sessions for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- session_availability: internal linking table, only touched by the
-- SECURITY DEFINER booking functions above; participants can read it.
create policy "Participants can view their session availability"
  on public.session_availability for select
  using (exists (
    select 1 from public.sessions s
    where s.session_id = session_availability.session_id
      and (s.teacher_id = auth.uid() or s.learner_id = auth.uid())
  ));

-- session_requests: participants only; writes go through request/respond/schedule_session()
create policy "Participants can view their requests"
  on public.session_requests for select
  using (auth.uid() = teacher_id or auth.uid() = learner_id);

-- reviews: public read, insertable only by a participant of a completed session
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);

create policy "Session participants can review each other after completion"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewee_id <> auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.session_id = reviews.session_id
        and s.status = 'completed'
        and auth.uid() in (s.teacher_id, s.learner_id)
        and reviewee_id in (s.teacher_id, s.learner_id)
    )
  );

-- token_transactions: private ledger, system-generated only
create policy "Users can view their own transactions"
  on public.token_transactions for select using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.token_transactions for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- learning_interests: public read (supports future matching), owner-managed
create policy "Learning interests are viewable by everyone"
  on public.learning_interests for select using (true);

create policy "Users can add their own learning interests"
  on public.learning_interests for insert with check (auth.uid() = user_id);

create policy "Users can delete their own learning interests"
  on public.learning_interests for delete using (auth.uid() = user_id);

-- swipes: you can only ever see your own swipes (not who swiped on you —
-- that's only revealed once record_swipe() turns it into a match)
create policy "Users can view their own swipes"
  on public.swipes for select using (auth.uid() = swiper_id);

-- matches: both participants can see it; writes only via record_swipe()
create policy "Participants can view their matches"
  on public.matches for select
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

-- blocked_users: fully self-managed
create policy "Users can view their own blocks"
  on public.blocked_users for select using (auth.uid() = user_id);

create policy "Users can block someone"
  on public.blocked_users for insert with check (auth.uid() = user_id);

create policy "Users can unblock someone"
  on public.blocked_users for delete using (auth.uid() = user_id);

-- swap_preferences: fully self-managed
create policy "Users can view their own swap preferences"
  on public.swap_preferences for select using (auth.uid() = user_id);

create policy "Users can upsert their own swap preferences"
  on public.swap_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update their own swap preferences"
  on public.swap_preferences for update using (auth.uid() = user_id);

-- style_preferences: public read (compatibility scoring needs to read
-- others' teach_* prefs), owner-write
create policy "Style preferences are viewable by everyone"
  on public.style_preferences for select using (true);

create policy "Users can add their own style preferences"
  on public.style_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update their own style preferences"
  on public.style_preferences for update using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- Avatar storage — public "avatars" bucket, one folder per
-- user (avatars/<user_id>/...), write-restricted to owner.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
