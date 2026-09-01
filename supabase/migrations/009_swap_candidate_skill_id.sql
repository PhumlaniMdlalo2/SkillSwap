-- Wire a swap match to the actual booking flow: get_swap_candidates only
-- returned the matched teacher's skill *title* ("teaches"), so the "You've
-- got a swap!" screen had nowhere to link a "Request a Session" button to.
-- Add the skill_id alongside the title so the client can deep-link straight
-- into /skills/[id] (the existing request-to-book flow) from a match.

drop function if exists public.get_swap_candidates(integer);

create or replace function public.get_swap_candidates(p_limit integer default 10)
returns table (
  user_id uuid,
  name text,
  avatar text,
  bio text,
  rating numeric,
  review_count integer,
  teaches text,
  teaches_skill_id uuid,
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
    s.skill_id as teaches_skill_id,
    s.category,
    li.category as wants_to_learn
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
