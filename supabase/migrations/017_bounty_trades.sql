-- Skill-trade proof for swap-reward bounties. Accepting an offer creates a
-- trade; the swap is only recorded as done once BOTH parties confirm a
-- reciprocal lesson happened (72h auto-finalize for the eager side). Swap
-- bounties can no longer be marked complete without a confirmed trade.

-- ---------------------------------------------------------
-- trades
-- ---------------------------------------------------------
create table if not exists public.trades (
  trade_id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null unique references public.bounties(bounty_id) on delete cascade,
  creator_id uuid not null references public.users(user_id),
  helper_id uuid not null references public.users(user_id),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'cancelled')),
  creator_confirmed_at timestamptz,
  helper_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint trades_distinct_parties check (creator_id <> helper_id)
);

create index if not exists trades_status_idx on public.trades(status);
create index if not exists trades_creator_id_idx on public.trades(creator_id);
create index if not exists trades_helper_id_idx on public.trades(helper_id);

alter table public.trades enable row level security;

create policy "Trade participants can view their trade"
  on public.trades for select
  using (auth.uid() = creator_id or auth.uid() = helper_id);

-- ---------------------------------------------------------
-- accept_bounty_offer: creator picks an offer -> trade begins
-- ---------------------------------------------------------
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

grant execute on function public.accept_bounty_offer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------
-- confirm_trade_side: participant attests they did their side.
-- Completes (and marks the bounty completed) once both confirm,
-- or 72h after acceptance if only one side ever confirms.
-- ---------------------------------------------------------
create or replace function public.confirm_trade_side(p_trade_id uuid)
returns public.trades
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trade public.trades;
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
    update public.trades set status = 'completed', updated_at = now()
      where trade_id = p_trade_id
      returning * into v_trade;
    update public.bounties set status = 'completed', updated_at = now()
      where bounty_id = v_trade.bounty_id;
  else
    update public.trades set updated_at = now()
      where trade_id = p_trade_id
      returning * into v_trade;
  end if;

  return v_trade;
end;
$$;

grant execute on function public.confirm_trade_side(uuid) to authenticated;

-- ---------------------------------------------------------
-- Guard: a swap-reward bounty can only reach 'completed' via a
-- confirmed trade. Token bounties keep the one-tap flow.
-- ---------------------------------------------------------
create or replace function public.bounties_guard_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status <> 'completed' and old.reward_type = 'swap' then
    if not exists (
      select 1 from public.trades t
      where t.bounty_id = old.bounty_id and t.status = 'completed'
    ) then
      raise exception 'Skill-trade bounties must be confirmed by both sides before completion';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bounties_guard_completion_trg on public.bounties;
create trigger bounties_guard_completion_trg
  before update on public.bounties
  for each row execute function public.bounties_guard_completion();