-- Richer swipe-card data: the card only ever showed one (most recent)
-- taught skill and one learning interest, and never surfaced review count
-- or how long someone's been a member — feeding it exactly one skill made
-- it feel thin even for teachers who list several. Aggregate ALL of a
-- candidate's skills/interests and add member_since, without touching the
-- existing teaches/teaches_skill_id/category/wants_to_learn columns
-- (SwapResultsScreen's "Request a Session" deep link relies on those).

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
  interests json
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
    u.created_at as member_since,
    s.title as teaches,
    s.skill_id as teaches_skill_id,
    s.category,
    li.category as wants_to_learn,
    coalesce(all_skills.skills, '[]'::json) as skills,
    coalesce(all_interests.interests, '[]'::json) as interests
  from public.users u
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
  order by u.created_at desc
  limit p_limit;
$$;

grant execute on function public.get_swap_candidates(integer) to authenticated;
