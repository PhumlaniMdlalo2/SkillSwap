-- =========================================================
-- SkillSwap — learning interests (onboarding: "what do you
-- want to learn?"). Run this once in the SQL Editor if you
-- already applied schema.sql — it's also folded into
-- schema.sql for anyone setting up from scratch.
-- =========================================================

create table if not exists public.learning_interests (
  interest_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint learning_interests_unique unique (user_id, category)
);

create index if not exists learning_interests_user_id_idx on public.learning_interests(user_id);

alter table public.learning_interests enable row level security;

create policy "Learning interests are viewable by everyone"
  on public.learning_interests for select using (true);

create policy "Users can add their own learning interests"
  on public.learning_interests for insert with check (auth.uid() = user_id);

create policy "Users can delete their own learning interests"
  on public.learning_interests for delete using (auth.uid() = user_id);
