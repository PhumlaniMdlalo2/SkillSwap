-- Session check-in: both parties confirm they actually met by scanning each
-- other's QR code before a session can be marked complete. The QR payload
-- carries the owner's role, so a scan always records the *scanner* as present
-- and refuses a code that belongs to the scanner's own role.

alter table public.sessions
  add column if not exists teacher_checked_in_at timestamptz,
  add column if not exists learner_checked_in_at timestamptz;

-- Record the caller's attendance. Matches
-- supabase.rpc('check_in_session', { p_session_id, p_owner_role }).
create or replace function public.check_in_session(p_session_id uuid, p_owner_role text)
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

grant execute on function public.check_in_session(uuid, text) to authenticated;

-- Complete Session -> Earn Tokens. Matches supabase.rpc('complete_session', { p_session_id }).
-- Now requires both parties to have checked in first.
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
  if v_session.teacher_checked_in_at is null or v_session.learner_checked_in_at is null then
    raise exception 'Both people need to check in before this session can be completed';
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
