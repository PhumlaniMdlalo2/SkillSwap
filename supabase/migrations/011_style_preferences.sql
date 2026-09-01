-- =========================================================
-- Real compatibility matching + unswapping.
--
-- get_swap_candidates previously only filtered by category (the exact
-- same thing Explore's search already does), which is why Skill Match
-- felt redundant with Explore. This adds a teaching-style / learning-
-- style layer (set during onboarding) and uses it to both rank and
-- flag candidates with real compatibility signal, plus two "unswap"
-- actions: undo your last swipe, and unmatch an existing match.
-- =========================================================

-- ---------------------------------------------------------
-- style_preferences — set once during onboarding, editable later.
-- Public read (needed so a browsing learner's prefs can be compared
-- against a candidate's teach_* prefs), owner-write.
-- ---------------------------------------------------------
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

alter table public.style_preferences enable row level security;

create policy "Style preferences are viewable by everyone"
  on public.style_preferences for select using (true);

create policy "Users can add their own style preferences"
  on public.style_preferences for insert with check (auth.uid() = user_id);

create policy "Users can update their own style preferences"
  on public.style_preferences for update using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- get_swap_candidates: now also scores/ranks by style compatibility
-- between the caller's learn_* prefs and each candidate's teach_*
-- prefs, instead of pure recency. A caller with no style_preferences
-- row yet falls back to neutral values (3/3/{}) via the `me` CTE.
-- ---------------------------------------------------------
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

grant execute on function public.get_swap_candidates(integer) to authenticated;

-- ---------------------------------------------------------
-- undo_last_swipe: reverses the caller's most recent swipe. If it was
-- a 'right' swipe that had formed a match, the match is removed too —
-- deleting the swipe row alone would leave a match standing on a swipe
-- that (from this user's side) no longer exists.
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- unmatch: breaks an existing match and clears both sides' swipe
-- history toward each other, so they're eligible to reappear in
-- get_swap_candidates for both parties afterward.
-- ---------------------------------------------------------
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

grant execute on function public.undo_last_swipe() to authenticated;
grant execute on function public.unmatch(uuid) to authenticated;
