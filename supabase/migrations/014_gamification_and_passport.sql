-- =========================================================
-- SkillSwap — Skill Passport & Gamification (Streaks + XP)
-- Adds endorsement stamps and streak / XP tracking.
-- =========================================================

-- 1. Add XP and Streak tracking to public.users
alter table public.users add column if not exists xp integer not null default 0 check (xp >= 0);
alter table public.users add column if not exists streak_weeks integer not null default 0 check (streak_weeks >= 0);
alter table public.users add column if not exists last_active_week text;

-- 2. Table for Skill Passport Endorsements
create table if not exists public.endorsements (
  endorsement_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  reviewer_id uuid not null references public.users(user_id) on delete cascade,
  reviewee_id uuid not null references public.users(user_id) on delete cascade,
  badge_key text not null,
  created_at timestamptz not null default now(),
  constraint endorsements_distinct_parties check (reviewer_id <> reviewee_id),
  constraint endorsements_unique_per_session unique (session_id, reviewer_id, badge_key)
);

create index if not exists endorsements_reviewee_id_idx on public.endorsements(reviewee_id);
create index if not exists endorsements_badge_key_idx on public.endorsements(badge_key);

alter table public.endorsements enable row level security;

create policy "Anyone authenticated can view endorsements"
  on public.endorsements for select
  using (true);

create policy "Users can give endorsements"
  on public.endorsements for insert
  with check (auth.uid() = reviewer_id);

-- 3. Function to record XP and update weekly streak
create or replace function public.award_xp_and_streak(
  p_user_id uuid,
  p_xp_amount integer
)
returns table (new_xp integer, new_streak integer, level integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_week text := to_char(now(), 'IYYY-"W"IW'); -- e.g. 2026-W41
  v_last_week text;
  v_curr_xp integer;
  v_curr_streak integer;
  v_prev_week text := to_char(now() - interval '7 days', 'IYYY-"W"IW');
  v_new_streak integer;
begin
  select xp, streak_weeks, last_active_week
  into v_curr_xp, v_curr_streak, v_last_week
  from public.users
  where user_id = p_user_id for update;

  if not found then
    raise exception 'User not found';
  end if;

  -- Calculate Streak
  if v_last_week is null then
    v_new_streak := 1;
  elsif v_last_week = v_current_week then
    -- Already active this week, preserve streak
    v_new_streak := greatest(1, v_curr_streak);
  elsif v_last_week = v_prev_week then
    -- Active in previous consecutive week, advance streak
    v_new_streak := v_curr_streak + 1;
  else
    -- Streak lapsed
    v_new_streak := 1;
  end if;

  update public.users
  set xp = xp + p_xp_amount,
      streak_weeks = v_new_streak,
      last_active_week = v_current_week
  where user_id = p_user_id
  returning xp, streak_weeks into v_curr_xp, v_curr_streak;

  return query select
    v_curr_xp,
    v_curr_streak,
    case
      when v_curr_xp < 200 then 1
      when v_curr_xp < 500 then 2
      when v_curr_xp < 1000 then 3
      when v_curr_xp < 2000 then 4
      else 5
    end;
end;
$$;
