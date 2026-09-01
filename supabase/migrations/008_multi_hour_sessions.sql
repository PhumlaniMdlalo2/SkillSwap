-- =========================================================
-- Multi-hour session booking.
-- Lets a learner book several contiguous open slots as one session
-- (e.g. a 3-hour lesson) instead of exactly one hour. Cost scales
-- with duration: 1 token per hour.
-- =========================================================

-- session_availability: links one session to every availability slot it
-- consumed (a session can now span more than one contiguous slot).
create table public.session_availability (
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  availability_id uuid not null references public.availability(availability_id) on delete cascade,
  primary key (session_id, availability_id)
);
create index session_availability_session_id_idx on public.session_availability(session_id);
alter table public.session_availability enable row level security;
create policy "Participants can view their session availability"
  on public.session_availability for select
  using (exists (
    select 1 from public.sessions s
    where s.session_id = session_availability.session_id
      and (s.teacher_id = auth.uid() or s.learner_id = auth.uid())
  ));

drop function if exists public.schedule_session(uuid, uuid);

-- Books 1+ contiguous open slots as a single session. Matches
-- supabase.rpc('schedule_session', { p_request_id, p_availability_ids }).
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

grant execute on function public.schedule_session(uuid, uuid[]) to authenticated;

-- Cancel a pending session: frees every slot it consumed (not just one)
-- and refunds the learner. Matches supabase.rpc('cancel_session', { p_session_id }).
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

-- Mark a session complete and pay the teacher whatever the learner was
-- actually charged for it (was a hardcoded 1 token — wrong once sessions
-- can be more than 1 hour). Matches supabase.rpc('complete_session', { p_session_id }).
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
