-- Mutual trade confirmation for sessions. On top of the QR check-in
-- (presence), each participant must explicitly confirm the trade happened
-- before completion + reward. A 72h deadline after both check-ins lets the
-- eager side finish even if the partner checks nothing (auto-finalize).
-- Also makes check-in codes time-limited so a screenshotted QR can't be
-- scanned later: the payload carries a unix-seconds expiry the server checks.

alter table public.sessions
  add column if not exists teacher_confirmed_at timestamptz,
  add column if not exists learner_confirmed_at timestamptz;

-- Drop the old two-arg signature (create or replace would keep it alive).
drop function if exists public.check_in_session(uuid, text);

-- Record the caller's attendance. The scanned payload now carries codeExp
-- (unix seconds). Matches supabase.rpc('check_in_session',
-- { p_session_id, p_owner_role, p_code_exp }).
create or replace function public.check_in_session(p_session_id uuid, p_owner_role text, p_code_exp bigint)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_caller_role text;
begin
  if p_code_exp is not null and (floor(extract(epoch from now())) - p_code_exp) > 15 then
    raise exception 'This check-in code has expired. Ask your partner to show a fresh one.';
  end if;

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

grant execute on function public.check_in_session(uuid, text, bigint) to authenticated;

-- Each participant explicitly confirms the trade happened. Requires having
-- checked in first (attestation follows presence). Matches
-- supabase.rpc('confirm_session_side', { p_session_id }).
create or replace function public.confirm_session_side(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be confirmed';
  end if;

  if v_session.teacher_id = auth.uid() then
    if v_session.teacher_checked_in_at is null then
      raise exception 'You need to check in before confirming the trade';
    end if;
    update public.sessions
      set teacher_confirmed_at = coalesce(teacher_confirmed_at, now())
      where session_id = p_session_id
      returning * into v_session;
  elsif v_session.learner_id = auth.uid() then
    if v_session.learner_checked_in_at is null then
      raise exception 'You need to check in before confirming the trade';
    end if;
    update public.sessions
      set learner_confirmed_at = coalesce(learner_confirmed_at, now())
      where session_id = p_session_id
      returning * into v_session;
  else
    raise exception 'Only participants can confirm this session';
  end if;

  return v_session;
end;
$$;

grant execute on function public.confirm_session_side(uuid) to authenticated;

-- Complete Session -> Earn Tokens. Now requires both check-ins AND both
-- confirmations unless the 72h auto-finalize deadline (anchored to the last
-- check-in) has passed, in which case a single confirmation suffices.
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
      -- Auto-finalize: the partner never confirmed within the deadline.
      null;
    else
      raise exception 'Waiting for both of you to confirm the trade (auto-completes 72 hours after check-in)';
    end if;
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

grant execute on function public.complete_session(uuid) to authenticated;

-- Lazy 72h sweep: finalises any of the caller's pending sessions that are
-- eligible (both checked in and either fully confirmed or past the deadline
-- with one side confirmed). Idempotent — completion flips status, so a
-- second sweep skips them. Returns the number completed.
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

    update public.sessions set status = 'completed' where session_id = v_session.session_id;

    update public.token_wallet set balance = balance + v_reward, updated_at = now()
    where user_id = v_session.teacher_id;

    insert into public.token_transactions (user_id, session_id, type, amount, description)
    values (v_session.teacher_id, v_session.session_id, 'earn', v_reward, 'Taught ' || coalesce(v_skill_title, 'a session'));

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.finalize_stale_sessions() to authenticated;