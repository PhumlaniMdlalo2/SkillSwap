-- Security, privacy, and data-loss fixes from the audit.

-- users: email/is_admin/xp are no longer client-readable, and only the
-- editable profile columns are writable directly.
revoke select, insert, update, delete on public.users from anon, authenticated;
grant select (user_id, name, avatar, bio, rating, review_count, xp, streak_weeks, last_active_week, created_at)
  on public.users to anon, authenticated;
grant update (name, bio, avatar) on public.users to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.user_id = auth.uid() and u.is_admin
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can update any user" on public.users;
create policy "Admins can update any user"
  on public.users for update
  using (public.is_admin());

drop policy if exists "Admins can view all wallets" on public.token_wallet;
create policy "Admins can view all wallets"
  on public.token_wallet for select
  using (public.is_admin());

drop policy if exists "Admins can view all sessions" on public.sessions;
create policy "Admins can view all sessions"
  on public.sessions for select
  using (public.is_admin());

drop policy if exists "Admins can view all transactions" on public.token_transactions;
create policy "Admins can view all transactions"
  on public.token_transactions for select
  using (public.is_admin());

revoke all on function public.award_xp_and_streak(uuid, integer) from public, anon, authenticated;

-- Preserve financial and session history instead of cascading deletes.
alter table public.token_wallet drop constraint if exists token_wallet_user_id_fkey;
alter table public.token_wallet
  add constraint token_wallet_user_id_fkey foreign key (user_id)
  references public.users(user_id) on delete restrict;

alter table public.availability drop constraint if exists availability_skill_id_fkey;
alter table public.availability
  add constraint availability_skill_id_fkey foreign key (skill_id)
  references public.skills(skill_id) on delete restrict;

alter table public.sessions drop constraint if exists sessions_availability_id_fkey;
alter table public.sessions
  add constraint sessions_availability_id_fkey foreign key (availability_id)
  references public.availability(availability_id) on delete restrict;

alter table public.session_availability drop constraint if exists session_availability_availability_id_fkey;
alter table public.session_availability
  add constraint session_availability_availability_id_fkey foreign key (availability_id)
  references public.availability(availability_id) on delete restrict;

alter table public.session_requests drop constraint if exists session_requests_skill_id_fkey;
alter table public.session_requests
  add constraint session_requests_skill_id_fkey foreign key (skill_id)
  references public.skills(skill_id) on delete restrict;

alter table public.reviews drop constraint if exists reviews_session_id_fkey;
alter table public.reviews
  add constraint reviews_session_id_fkey foreign key (session_id)
  references public.sessions(session_id) on delete restrict;

alter table public.token_transactions drop constraint if exists token_transactions_user_id_fkey;
alter table public.token_transactions
  add constraint token_transactions_user_id_fkey foreign key (user_id)
  references public.users(user_id) on delete restrict;

alter table public.messages alter column match_id drop not null;
alter table public.messages drop constraint if exists messages_match_id_fkey;
alter table public.messages
  add constraint messages_match_id_fkey foreign key (match_id)
  references public.matches(match_id) on delete set null;

alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages
  add constraint messages_sender_id_fkey foreign key (sender_id)
  references public.users(user_id) on delete restrict;

alter table public.bounties drop constraint if exists bounties_creator_id_fkey;
alter table public.bounties
  add constraint bounties_creator_id_fkey foreign key (creator_id)
  references public.users(user_id) on delete restrict;

alter table public.bounty_offers drop constraint if exists bounty_offers_helper_id_fkey;
alter table public.bounty_offers
  add constraint bounty_offers_helper_id_fkey foreign key (helper_id)
  references public.users(user_id) on delete restrict;

alter table public.trades drop constraint if exists trades_bounty_id_fkey;
alter table public.trades
  add constraint trades_bounty_id_fkey foreign key (bounty_id)
  references public.bounties(bounty_id) on delete restrict;

alter table public.endorsements drop constraint if exists endorsements_session_id_fkey;
alter table public.endorsements
  add constraint endorsements_session_id_fkey foreign key (session_id)
  references public.sessions(session_id) on delete restrict;

alter table public.endorsements drop constraint if exists endorsements_reviewer_id_fkey;
alter table public.endorsements
  add constraint endorsements_reviewer_id_fkey foreign key (reviewer_id)
  references public.users(user_id) on delete restrict;

alter table public.endorsements drop constraint if exists endorsements_reviewee_id_fkey;
alter table public.endorsements
  add constraint endorsements_reviewee_id_fkey foreign key (reviewee_id)
  references public.users(user_id) on delete restrict;

-- Blocking now hides matches and stops chat in both directions.
drop policy if exists "Participants can view their matches" on public.matches;
create policy "Participants can view their matches"
  on public.matches for select
  using (
    (auth.uid() = user_id_1 or auth.uid() = user_id_2)
    and not exists (
      select 1 from public.blocked_users b
      where (b.user_id = matches.user_id_1 and b.blocked_user_id = matches.user_id_2)
         or (b.user_id = matches.user_id_2 and b.blocked_user_id = matches.user_id_1)
    )
  );

drop policy if exists "Match participants can read messages" on public.messages;
create policy "Match participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.match_id = messages.match_id
        and (m.user_id_1 = auth.uid() or m.user_id_2 = auth.uid())
        and not exists (
          select 1 from public.blocked_users b
          where (b.user_id = m.user_id_1 and b.blocked_user_id = m.user_id_2)
             or (b.user_id = m.user_id_2 and b.blocked_user_id = m.user_id_1)
        )
    )
  );

drop policy if exists "Match participants can insert messages" on public.messages;
create policy "Match participants can insert messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.match_id = messages.match_id
        and (m.user_id_1 = auth.uid() or m.user_id_2 = auth.uid())
        and not exists (
          select 1 from public.blocked_users b
          where (b.user_id = m.user_id_1 and b.blocked_user_id = m.user_id_2)
             or (b.user_id = m.user_id_2 and b.blocked_user_id = m.user_id_1)
        )
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Endorsements must come from a participant of a completed session, for a
-- known badge key.
drop policy if exists "Users can give endorsements" on public.endorsements;
create policy "Users can give endorsements"
  on public.endorsements for insert
  with check (
    auth.uid() = reviewer_id
    and reviewee_id <> auth.uid()
    and badge_key in (
      'explains_simply', 'infinite_patience', 'super_punctual',
      'practical_exercises', 'conversational_pro', 'hands_on'
    )
    and exists (
      select 1 from public.sessions s
      where s.session_id = endorsements.session_id
        and s.status = 'completed'
        and auth.uid() in (s.teacher_id, s.learner_id)
        and reviewee_id in (s.teacher_id, s.learner_id)
    )
  );

-- Check-in codes are server-issued, role-bound, short-lived, and single-use.
alter table public.sessions
  add column if not exists teacher_checkin_code text,
  add column if not exists teacher_checkin_code_exp timestamptz,
  add column if not exists learner_checkin_code text,
  add column if not exists learner_checkin_code_exp timestamptz;

create or replace function public.create_check_in_code(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_role text;
  v_code text := replace(gen_random_uuid()::text, '-', '');
  v_expires_at timestamptz := now() + interval '90 seconds';
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be checked in';
  end if;

  if v_session.teacher_id = auth.uid() then
    v_role := 'teacher';
    update public.sessions
      set teacher_checkin_code = v_code, teacher_checkin_code_exp = v_expires_at
      where session_id = p_session_id;
  elsif v_session.learner_id = auth.uid() then
    v_role := 'learner';
    update public.sessions
      set learner_checkin_code = v_code, learner_checkin_code_exp = v_expires_at
      where session_id = p_session_id;
  else
    raise exception 'Only participants can check in to this session';
  end if;

  return jsonb_build_object('code', v_code, 'expires_at', v_expires_at, 'owner_role', v_role);
end;
$$;

revoke all on function public.create_check_in_code(uuid) from public, anon;
grant execute on function public.create_check_in_code(uuid) to authenticated;

drop function if exists public.check_in_session(uuid, text, bigint);
drop function if exists public.check_in_session(uuid, text);

create or replace function public.check_in_session(p_session_id uuid, p_owner_role text, p_code text)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_caller_role text;
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be checked in';
  end if;

  if v_session.teacher_id = auth.uid() then
    v_caller_role := 'teacher';
  elsif v_session.learner_id = auth.uid() then
    v_caller_role := 'learner';
  else
    raise exception 'Only participants can check in to this session';
  end if;

  if p_owner_role not in ('teacher', 'learner') then
    raise exception 'Invalid check-in code';
  end if;
  if p_owner_role = v_caller_role then
    raise exception 'Scan your partner''s code, not your own';
  end if;

  if p_owner_role = 'teacher' then
    if v_session.teacher_checkin_code is null
      or v_session.teacher_checkin_code_exp is null
      or v_session.teacher_checkin_code_exp < now()
      or v_session.teacher_checkin_code <> p_code then
      raise exception 'This check-in code is invalid or has expired. Ask your partner to show a fresh one.';
    end if;
    update public.sessions
      set teacher_checkin_code = null, teacher_checkin_code_exp = null
      where session_id = p_session_id;
  else
    if v_session.learner_checkin_code is null
      or v_session.learner_checkin_code_exp is null
      or v_session.learner_checkin_code_exp < now()
      or v_session.learner_checkin_code <> p_code then
      raise exception 'This check-in code is invalid or has expired. Ask your partner to show a fresh one.';
    end if;
    update public.sessions
      set learner_checkin_code = null, learner_checkin_code_exp = null
      where session_id = p_session_id;
  end if;

  if v_caller_role = 'teacher' then
    update public.sessions
      set teacher_checked_in_at = coalesce(teacher_checked_in_at, now())
      where session_id = p_session_id
      returning * into v_session;
  else
    update public.sessions
      set learner_checked_in_at = coalesce(learner_checked_in_at, now())
      where session_id = p_session_id
      returning * into v_session;
  end if;

  return v_session;
end;
$$;

revoke all on function public.check_in_session(uuid, text, text) from public, anon;
grant execute on function public.check_in_session(uuid, text, text) to authenticated;

-- Booking cannot use slots that have already passed.
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
      and start_time <= now()
  ) then
    raise exception 'One or more selected time slots has already passed';
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

-- Changing weekly hours replaces stale future unbooked slots as well.
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

  delete from public.availability
  where skill_id = p_skill_id and booked = false and start_time > now();

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

-- =========================================================
-- Batch 2: timestamps, server-side XP/rewards, atomic interests
-- =========================================================

alter table public.sessions add column if not exists completed_at timestamptz;
update public.sessions
set completed_at = created_at
where status = 'completed' and completed_at is null;

alter table public.users add column if not exists last_perfect_week text;

create or replace function public.award_perfect_week_if_earned(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week text := to_char(now(), 'IYYY-"W"IW');
  v_last_awarded text;
  v_count integer;
begin
  select last_perfect_week into v_last_awarded
  from public.users where user_id = p_user_id for update;
  if not found or v_last_awarded = v_week then
    return;
  end if;

  select count(*) into v_count
  from public.sessions
  where status = 'completed'
    and completed_at >= date_trunc('week', now())
    and completed_at < date_trunc('week', now()) + interval '7 days'
    and (teacher_id = p_user_id or learner_id = p_user_id);

  if v_count >= 3 then
    perform public.award_xp_and_streak(p_user_id, 200);
    update public.users set last_perfect_week = v_week where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.award_perfect_week_if_earned(uuid) from public, anon, authenticated;

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
  v_deadline timestamptz;
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
  if v_session.teacher_checked_in_at is null or v_session.learner_checked_in_at is null then
    raise exception 'Both people need to check in before this session can be completed';
  end if;

  if v_session.teacher_confirmed_at is null or v_session.learner_confirmed_at is null then
    v_deadline := greatest(v_session.teacher_checked_in_at, v_session.learner_checked_in_at)
                    + interval '72 hours';
    if now() > v_deadline and (v_session.teacher_confirmed_at is not null or v_session.learner_confirmed_at is not null) then
      null;
    else
      raise exception 'Waiting for both of you to confirm the trade (auto-completes 72 hours after check-in)';
    end if;
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

  update public.sessions set status = 'completed', completed_at = now()
  where session_id = p_session_id
  returning * into v_session;

  update public.token_wallet set balance = balance + v_reward, updated_at = now()
  where user_id = v_session.teacher_id;

  insert into public.token_transactions (user_id, session_id, type, amount, description)
  values (v_session.teacher_id, p_session_id, 'earn', v_reward, 'Taught ' || coalesce(v_skill_title, 'a session'));

  perform public.award_xp_and_streak(v_session.teacher_id, 100);
  perform public.award_xp_and_streak(v_session.learner_id, 100);
  perform public.award_perfect_week_if_earned(v_session.teacher_id);
  perform public.award_perfect_week_if_earned(v_session.learner_id);

  return v_session;
end;
$$;

create or replace function public.finalize_stale_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_reward integer;
  v_skill_title text;
  v_count integer := 0;
begin
  for v_session in
    select *
    from public.sessions
    where status = 'pending'
      and (teacher_id = auth.uid() or learner_id = auth.uid())
      and teacher_checked_in_at is not null
      and learner_checked_in_at is not null
    for update skip locked
  loop
    if not (
      v_session.teacher_confirmed_at is not null and v_session.learner_confirmed_at is not null
    ) and not (
      now() > greatest(v_session.teacher_checked_in_at, v_session.learner_checked_in_at) + interval '72 hours'
      and (v_session.teacher_confirmed_at is not null or v_session.learner_confirmed_at is not null)
    ) then
      continue;
    end if;

    select abs(amount) into v_reward
    from public.token_transactions
    where session_id = v_session.session_id and type = 'spend'
    limit 1;
    v_reward := coalesce(v_reward, 1);

    select s.title into v_skill_title
    from public.availability a
    join public.skills s on s.skill_id = a.skill_id
    where a.availability_id = v_session.availability_id;

    update public.sessions set status = 'completed', completed_at = now()
    where session_id = v_session.session_id;

    update public.token_wallet set balance = balance + v_reward, updated_at = now()
    where user_id = v_session.teacher_id;

    insert into public.token_transactions (user_id, session_id, type, amount, description)
    values (v_session.teacher_id, v_session.session_id, 'earn', v_reward, 'Taught ' || coalesce(v_skill_title, 'a session'));

    perform public.award_xp_and_streak(v_session.teacher_id, 100);
    perform public.award_xp_and_streak(v_session.learner_id, 100);
    perform public.award_perfect_week_if_earned(v_session.teacher_id);
    perform public.award_perfect_week_if_earned(v_session.learner_id);

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.accept_bounty_offer(p_bounty_id uuid, p_offer_id uuid)
returns public.trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounty public.bounties;
  v_offer public.bounty_offers;
  v_trade public.trades;
  v_balance integer;
begin
  select * into v_bounty from public.bounties where bounty_id = p_bounty_id for update;
  if not found then
    raise exception 'Bounty not found';
  end if;
  if v_bounty.creator_id <> auth.uid() then
    raise exception 'Only the bounty creator can accept an offer';
  end if;
  if v_bounty.status <> 'open' then
    raise exception 'Only open bounties can accept offers';
  end if;
  if v_bounty.reward_type = 'token' then
    select balance into v_balance from public.token_wallet
    where user_id = v_bounty.creator_id for update;
    if v_balance is null or v_balance < v_bounty.token_amount then
      raise exception 'Not enough tokens to accept this offer';
    end if;
  end if;

  select * into v_offer from public.bounty_offers where offer_id = p_offer_id for update;
  if not found then
    raise exception 'Offer not found';
  end if;
  if v_offer.bounty_id <> p_bounty_id then
    raise exception 'This offer belongs to a different bounty';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'Only pending offers can be accepted';
  end if;

  update public.bounty_offers set status = 'accepted' where offer_id = p_offer_id;
  update public.bounty_offers set status = 'declined'
    where bounty_id = p_bounty_id and offer_id <> p_offer_id and status = 'pending';
  update public.bounties set status = 'in_progress', updated_at = now()
    where bounty_id = p_bounty_id;

  insert into public.trades (bounty_id, creator_id, helper_id)
  values (p_bounty_id, v_bounty.creator_id, v_offer.helper_id)
  returning * into v_trade;

  return v_trade;
end;
$$;

create or replace function public.confirm_trade_side(p_trade_id uuid)
returns public.trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades;
  v_bounty public.bounties;
  v_balance integer;
  v_role text;
begin
  select * into v_trade from public.trades where trade_id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if auth.uid() = v_trade.creator_id then
    v_role := 'creator';
  elsif auth.uid() = v_trade.helper_id then
    v_role := 'helper';
  else
    raise exception 'Only trade participants can confirm';
  end if;
  if v_trade.status <> 'in_progress' then
    raise exception 'This trade is not in progress';
  end if;

  if v_role = 'creator' then
    update public.trades
      set creator_confirmed_at = coalesce(creator_confirmed_at, now())
      where trade_id = p_trade_id
      returning * into v_trade;
  else
    update public.trades
      set helper_confirmed_at = coalesce(helper_confirmed_at, now())
      where trade_id = p_trade_id
      returning * into v_trade;
  end if;

  if (v_trade.creator_confirmed_at is not null and v_trade.helper_confirmed_at is not null)
    or (
      now() > v_trade.created_at + interval '72 hours'
      and (v_trade.creator_confirmed_at is not null or v_trade.helper_confirmed_at is not null)
    ) then
    select * into v_bounty from public.bounties
      where bounty_id = v_trade.bounty_id for update;
    if not found then
      raise exception 'Bounty not found';
    end if;

    if v_bounty.reward_type = 'token' then
      select balance into v_balance from public.token_wallet
        where user_id = v_bounty.creator_id for update;
      if v_balance is null or v_balance < v_bounty.token_amount then
        raise exception 'Not enough tokens to release the bounty reward';
      end if;

      update public.token_wallet
        set balance = balance - v_bounty.token_amount, updated_at = now()
        where user_id = v_bounty.creator_id;
      update public.token_wallet
        set balance = balance + v_bounty.token_amount, updated_at = now()
        where user_id = v_bounty.helper_id;

      insert into public.token_transactions (user_id, type, amount, description)
      values (v_bounty.creator_id, 'spend', -v_bounty.token_amount,
              'Bounty reward: ' || v_bounty.title);
      insert into public.token_transactions (user_id, type, amount, description)
      values (v_bounty.helper_id, 'earn', v_bounty.token_amount,
              'Bounty reward: ' || v_bounty.title);
    end if;

    update public.trades set status = 'completed', updated_at = now()
      where trade_id = p_trade_id
      returning * into v_trade;
    update public.bounties set status = 'completed', updated_at = now()
      where bounty_id = v_trade.bounty_id;

    perform public.award_xp_and_streak(v_trade.creator_id, 25);
    perform public.award_xp_and_streak(v_trade.helper_id, 25);
  else
    update public.trades set updated_at = now()
      where trade_id = p_trade_id
      returning * into v_trade;
  end if;

  return v_trade;
end;
$$;

create or replace function public.bounties_guard_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    if not exists (
      select 1 from public.trades t
      where t.bounty_id = old.bounty_id and t.status = 'completed'
    ) then
      raise exception 'Bounties must be confirmed by both sides before completion';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.set_learning_interests(p_user_id uuid, p_categories text[])
returns setof public.learning_interests
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only update your own learning interests';
  end if;

  delete from public.learning_interests where user_id = p_user_id;

  if p_categories is not null then
    insert into public.learning_interests (user_id, category)
    select p_user_id, category
    from (select distinct trim(category) as category from unnest(p_categories) as category) c
    where category <> ''
    on conflict do nothing;
  end if;

  return query
    select * from public.learning_interests
    where user_id = p_user_id
    order by created_at;
end;
$$;

revoke all on function public.set_learning_interests(uuid, text[]) from public, anon;
grant execute on function public.set_learning_interests(uuid, text[]) to authenticated;

-- Honor the saved swap category inside the RPC so the limit applies after
-- filtering, not before it.
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
    left join public.swap_preferences my_swap on my_swap.user_id = auth.uid()
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
      and (my_swap.skill_category is null or s.category = my_swap.skill_category)
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
