-- =========================================================
-- SkillSwap — real backend for Skill Match (swipe/match).
-- Previously this feature only worked against local mock data
-- and a client-side Math.random() "match" coin flip — a swipe
-- never reached anyone. This replaces it with real tables and
-- server-side mutual-match detection.
--
-- Run this once in the SQL Editor after schema.sql (and after
-- 002/003 if you applied schema.sql before those existed) —
-- it's also folded into schema.sql for anyone setting up fresh.
-- =========================================================

create type public.swipe_direction as enum ('left', 'right', 'maybe');

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

create index swipes_swiper_id_idx on public.swipes(swiper_id);
create index swipes_target_id_idx on public.swipes(target_id);
create index matches_user_id_1_idx on public.matches(user_id_1);
create index matches_user_id_2_idx on public.matches(user_id_2);

alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.blocked_users enable row level security;
alter table public.swap_preferences enable row level security;

create policy "Users can view their own swipes"
  on public.swipes for select using (auth.uid() = swiper_id);

create policy "Participants can view their matches"
  on public.matches for select
  using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "Users can view their own blocks"
  on public.blocked_users for select using (auth.uid() = user_id);

create policy "Users can block someone"
  on public.blocked_users for insert with check (auth.uid() = user_id);

create policy "Users can unblock someone"
  on public.blocked_users for delete using (auth.uid() = user_id);

create policy "Users can view their own swap preferences"
  on public.swap_preferences for select using (auth.uid() = user_id);

create policy "Users can upsert their own swap preferences"
  on public.swap_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update their own swap preferences"
  on public.swap_preferences for update using (auth.uid() = user_id);

-- Records a swipe and, if it completes a mutual right-swipe, creates the
-- match — replacing the old client-side Math.random() "match" check.
-- Matches supabase.rpc('record_swipe', { p_target_id, p_direction }).
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

-- Discovery pool: everyone except yourself, anyone you've already swiped
-- on, and anyone who's blocked you (or you've blocked). SECURITY DEFINER
-- because checking "has this person blocked me" requires reading a
-- blocked_users row that isn't yours — the RLS above only lets a user see
-- their own blocks otherwise.
create or replace function public.get_swap_candidates(p_limit integer default 10)
returns table (
  user_id uuid,
  name text,
  avatar text,
  bio text,
  rating numeric,
  review_count integer,
  teaches text,
  category text,
  wants_to_learn text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.user_id,
    u.name,
    u.avatar,
    u.bio,
    u.rating,
    u.review_count,
    s.title as teaches,
    s.category,
    li.category as wants_to_learn
  from public.users u
  left join lateral (
    select title, category from public.skills
    where skills.user_id = u.user_id
    order by created_at desc limit 1
  ) s on true
  left join lateral (
    select category from public.learning_interests
    where learning_interests.user_id = u.user_id
    order by created_at desc limit 1
  ) li on true
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
  order by u.created_at desc
  limit p_limit;
$$;

grant execute on function public.record_swipe(uuid, public.swipe_direction) to authenticated;
grant execute on function public.get_swap_candidates(integer) to authenticated;
