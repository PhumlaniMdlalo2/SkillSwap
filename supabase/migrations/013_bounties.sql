-- =========================================================
-- SkillSwap — Reverse Bounty Board Migration
-- Allows members to post urgent learning requests with token
-- or swap rewards, and mentors to claim/offer help.
-- =========================================================

create table if not exists public.bounties (
  bounty_id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(user_id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 5 and char_length(title) <= 120),
  description text not null check (char_length(trim(description)) >= 10),
  category text not null,
  reward_type text not null default 'token' check (reward_type in ('token', 'swap')),
  token_amount integer not null default 1 check (token_amount >= 1),
  urgency text not null default 'flexible' check (urgency in ('urgent', 'this_week', 'flexible')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bounty_offers (
  offer_id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(bounty_id) on delete cascade,
  helper_id uuid not null references public.users(user_id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint bounty_offers_unique_helper unique (bounty_id, helper_id)
);

create index if not exists bounties_creator_id_idx on public.bounties(creator_id);
create index if not exists bounties_category_idx on public.bounties(category);
create index if not exists bounties_status_idx on public.bounties(status);
create index if not exists bounties_created_at_idx on public.bounties(created_at desc);
create index if not exists bounty_offers_bounty_id_idx on public.bounty_offers(bounty_id);
create index if not exists bounty_offers_helper_id_idx on public.bounty_offers(helper_id);

alter table public.bounties enable row level security;
alter table public.bounty_offers enable row level security;

-- Policies for bounties
create policy "Anyone authenticated can view bounties"
  on public.bounties for select
  using (true);

create policy "Users can create their own bounties"
  on public.bounties for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update their bounties"
  on public.bounties for update
  using (auth.uid() = creator_id);

create policy "Creators can delete their bounties"
  on public.bounties for delete
  using (auth.uid() = creator_id);

-- Policies for bounty_offers
create policy "Creators and helpers can view offers"
  on public.bounty_offers for select
  using (
    auth.uid() = helper_id or
    exists (
      select 1 from public.bounties b
      where b.bounty_id = bounty_offers.bounty_id and b.creator_id = auth.uid()
    )
  );

create policy "Users can make an offer if not the creator"
  on public.bounty_offers for insert
  with check (
    auth.uid() = helper_id and
    exists (
      select 1 from public.bounties b
      where b.bounty_id = bounty_offers.bounty_id and b.creator_id <> auth.uid()
    )
  );

create policy "Creators can update offer status"
  on public.bounty_offers for update
  using (
    exists (
      select 1 from public.bounties b
      where b.bounty_id = bounty_offers.bounty_id and b.creator_id = auth.uid()
    )
  );
