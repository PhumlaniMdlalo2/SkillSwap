-- =========================================================
-- SkillSwap — request/accept/schedule booking pipeline.
-- Replaces instant self-service booking (book_session) with:
--   1. request_session()      learner asks to book a skill (no time yet)
--   2. respond_to_request()   teacher accepts/declines
--   3. schedule_session()     learner picks an open slot on an
--                             accepted request — this is the real
--                             Book Session -> Spend Tokens moment
--
-- Run this once in the SQL Editor if you already applied schema.sql
-- — it's also folded into schema.sql for anyone setting up fresh.
-- =========================================================

create type public.request_status as enum ('pending', 'accepted', 'declined', 'scheduled');

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

create index session_requests_teacher_id_idx on public.session_requests(teacher_id);
create index session_requests_learner_id_idx on public.session_requests(learner_id);

alter table public.session_requests enable row level security;

create policy "Participants can view their requests"
  on public.session_requests for select
  using (auth.uid() = teacher_id or auth.uid() = learner_id);

-- Old instant-booking RPC is retired in favor of the 3-step pipeline below.
drop function if exists public.book_session(uuid, uuid);

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
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where request_id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.schedule_session(
  p_request_id uuid,
  p_availability_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost constant integer := 1;
  v_request public.session_requests;
  v_slot public.availability;
  v_skill_title text;
  v_balance integer;
  v_session public.sessions;
begin
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

  select * into v_slot from public.availability where availability_id = p_availability_id for update;
  if not found then
    raise exception 'Availability slot not found';
  end if;
  if v_slot.booked then
    raise exception 'This time slot has already been booked';
  end if;
  if v_slot.skill_id <> v_request.skill_id or v_slot.user_id <> v_request.teacher_id then
    raise exception 'This slot does not belong to the requested skill';
  end if;

  select title into v_skill_title from public.skills where skill_id = v_slot.skill_id;

  select balance into v_balance from public.token_wallet where user_id = v_request.learner_id for update;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Not enough tokens to book this session';
  end if;

  update public.availability set booked = true where availability_id = p_availability_id;

  insert into public.sessions (availability_id, teacher_id, learner_id, session_date, duration, status)
  values (
    p_availability_id,
    v_request.teacher_id,
    v_request.learner_id,
    v_slot.start_time,
    greatest(1, round(extract(epoch from (v_slot.end_time - v_slot.start_time)) / 60)::integer),
    'pending'
  )
  returning * into v_session;

  update public.token_wallet set balance = balance - v_cost, updated_at = now() where user_id = v_request.learner_id;

  insert into public.token_transactions (user_id, session_id, type, amount, description)
  values (v_request.learner_id, v_session.session_id, 'spend', -v_cost, 'Booked ' || coalesce(v_skill_title, 'a session'));

  update public.session_requests set status = 'scheduled', session_id = v_session.session_id
  where request_id = p_request_id;

  return v_session;
end;
$$;

grant execute on function public.request_session(uuid, text) to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.schedule_session(uuid, uuid) to authenticated;
