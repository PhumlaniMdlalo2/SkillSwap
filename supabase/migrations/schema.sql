-- =========================================================
-- SkillSwap — Supabase schema
-- Browse skills -> Book session -> Spend/Earn time tokens
-- Matches the approved ERD/use cases and the shapes already
-- queried by src/services/{supabase,auth,api,swapService}.js
-- =========================================================

-- ---------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------
create type public.session_status as enum ('pending', 'completed', 'cancelled');
create type public.transaction_type as enum ('earn', 'spend');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'scheduled');

-- ---------------------------------------------------------
-- users (profile row, 1:1 with auth.users)
-- PK is named user_id (not id) to match src/services/*.js,
-- which does .eq('user_id', ...) everywhere.
-- ---------------------------------------------------------
create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar text,
  bio text,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- token_wallet (singular — matches supabase.from('token_wallet'))
-- ---------------------------------------------------------
create table public.token_wallet (
  wallet_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(user_id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- skills
-- ---------------------------------------------------------
create table public.skills (
  skill_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  title text not null check (char_length(title) >= 3),
  description text,
  category text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- availability
-- ---------------------------------------------------------
create table public.availability (
  availability_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  skill_id uuid not null references public.skills(skill_id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  booked boolean not null default false,
  created_at timestamptz not null default now(),
  constraint availability_valid_range check (end_time > start_time)
);

-- ---------------------------------------------------------
-- sessions
-- ---------------------------------------------------------
create table public.sessions (
  session_id uuid primary key default gen_random_uuid(),
  availability_id uuid not null unique references public.availability(availability_id) on delete cascade,
  teacher_id uuid not null references public.users(user_id),
  learner_id uuid not null references public.users(user_id),
  session_date timestamptz not null,
  duration integer not null default 60 check (duration > 0),
  status public.session_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint sessions_distinct_parties check (teacher_id <> learner_id)
);

-- ---------------------------------------------------------
-- session_requests — "ask to book" step before a session
-- exists. A learner requests a skill (no time attached yet);
-- the teacher accepts/declines; only once accepted does the
-- learner pick a specific open slot, which is when the actual
-- sessions row gets created and the token is spent.
-- ---------------------------------------------------------
create table public.session_requests (
  request_id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(skill_id) on delete cascade,
  teacher_id uuid not null references public.users(user_id),
  learner_id uuid not null references public.users(user_id),
  message text,
  status public.request_status not null default 'pending',
  session_id uuid references public.sessions(session_id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint session_requests_distinct_parties check (teacher_id <> learner_id)
);

-- ---------------------------------------------------------
-- reviews
-- ---------------------------------------------------------
create table public.reviews (
  review_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(session_id) on delete cascade,
  reviewer_id uuid not null references public.users(user_id),
  reviewee_id uuid not null references public.users(user_id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_distinct_parties check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_reviewer_per_session unique (session_id, reviewer_id)
);

-- ---------------------------------------------------------
-- token_transactions
-- ---------------------------------------------------------
create table public.token_transactions (
  transaction_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  session_id uuid references public.sessions(session_id) on delete set null,
  type public.transaction_type not null,
  amount integer not null,
  description text,
  created_at timestamptz not null default now(),
  constraint token_transactions_amount_sign check (
    (type = 'earn' and amount > 0) or (type = 'spend' and amount < 0)
  )
);

-- ---------------------------------------------------------
-- learning_interests — onboarding: "what do you want to learn?"
-- Category-level, not tied to a specific skill listing, so it
-- works even before anyone teaches that category yet.
-- ---------------------------------------------------------
create table public.learning_interests (
  interest_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now(),
  constraint learning_interests_unique unique (user_id, category)
);

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------
create index skills_user_id_idx on public.skills(user_id);
create index skills_category_idx on public.skills(category);
create index availability_skill_id_idx on public.availability(skill_id);
create index availability_user_id_idx on public.availability(user_id);
create index availability_unbooked_idx on public.availability(skill_id) where not booked;
create index sessions_teacher_id_idx on public.sessions(teacher_id);
create index sessions_learner_id_idx on public.sessions(learner_id);
create index session_requests_teacher_id_idx on public.session_requests(teacher_id);
create index session_requests_learner_id_idx on public.session_requests(learner_id);
create index reviews_reviewee_id_idx on public.reviews(reviewee_id);
create index token_transactions_user_id_idx on public.token_transactions(user_id);
create index learning_interests_user_id_idx on public.learning_interests(user_id);

-- =========================================================
-- Functions & triggers
-- All SECURITY DEFINER functions below are owned by the
-- migration-running role (postgres), which — like the table
-- owner — bypasses RLS. That's what lets them move tokens and
-- write sessions on the user's behalf inside one transaction.
-- =========================================================

-- New Supabase Auth user -> create profile + starter wallet.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (user_id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.token_wallet (user_id, balance)
  values (new.id, 5);

  insert into public.token_transactions (user_id, type, amount, description)
  values (new.id, 'earn', 5, 'Welcome bonus');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep users.rating / review_count in sync with reviews.
create or replace function public.refresh_user_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.users
  set rating = coalesce(
        (select round(avg(r.rating)::numeric, 2) from public.reviews r where r.reviewee_id = v_user_id),
        0
      ),
      review_count = (select count(*) from public.reviews r where r.reviewee_id = v_user_id)
  where user_id = v_user_id;
  return coalesce(new, old);
end;
$$;

create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.refresh_user_rating();

-- Step 1: learner asks to book a skill (no time attached). Matches
-- supabase.rpc('request_session', { p_skill_id, p_message }).
create or replace function public.request_session(
  p_skill_id uuid,
  p_message text default null
)
returns public.session_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_learner_id constant uuid := auth.uid();
  v_teacher_id uuid;
  v_request public.session_requests;
begin
  if v_learner_id is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into v_teacher_id from public.skills where skill_id = p_skill_id;
  if v_teacher_id is null then
    raise exception 'Skill not found';
  end if;
  if v_teacher_id = v_learner_id then
    raise exception 'You cannot request your own skill';
  end if;

  insert into public.session_requests (skill_id, teacher_id, learner_id, message)
  values (p_skill_id, v_teacher_id, v_learner_id, p_message)
  returning * into v_request;

  return v_request;
end;
$$;

-- Step 2: teacher accepts or declines. Matches
-- supabase.rpc('respond_to_request', { p_request_id, p_accept }).
create or replace function public.respond_to_request(
  p_request_id uuid,
  p_accept boolean
)
returns public.session_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.session_requests;
begin
  select * into v_request from public.session_requests where request_id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.teacher_id <> auth.uid() then
    raise exception 'Only the teacher can respond to this request';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request has already been responded to';
  end if;

  update public.session_requests
  set status = case when p_accept then 'accepted' else 'declined' end,
      responded_at = now()
  where request_id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- Step 3: learner picks a specific open slot on an accepted request.
-- This is the actual Book Session -> Spend Tokens moment. Matches
-- supabase.rpc('schedule_session', { p_request_id, p_availability_id }).
create or replace function public.schedule_session(
  p_request_id uuid,
  p_availability_id uuid
)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost constant integer := 1;
  v_request public.session_requests;
  v_slot public.availability;
  v_skill_title text;
  v_balance integer;
  v_session public.sessions;
begin
  select * into v_request from public.session_requests where request_id = p_request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if v_request.learner_id <> auth.uid() then
    raise exception 'Only the requesting learner can schedule this session';
  end if;
  if v_request.status <> 'accepted' then
    raise exception 'This request has not been accepted yet';
  end if;

  select * into v_slot from public.availability where availability_id = p_availability_id for update;
  if not found then
    raise exception 'Availability slot not found';
  end if;
  if v_slot.booked then
    raise exception 'This time slot has already been booked';
  end if;
  if v_slot.skill_id <> v_request.skill_id or v_slot.user_id <> v_request.teacher_id then
    raise exception 'This slot does not belong to the requested skill';
  end if;

  select title into v_skill_title from public.skills where skill_id = v_slot.skill_id;

  select balance into v_balance from public.token_wallet where user_id = v_request.learner_id for update;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Not enough tokens to book this session';
  end if;

  update public.availability set booked = true where availability_id = p_availability_id;

  insert into public.sessions (availability_id, teacher_id, learner_id, session_date, duration, status)
  values (
    p_availability_id,
    v_request.teacher_id,
    v_request.learner_id,
    v_slot.start_time,
    greatest(1, round(extract(epoch from (v_slot.end_time - v_slot.start_time)) / 60)::integer),
    'pending'
  )
  returning * into v_session;

  update public.token_wallet set balance = balance - v_cost, updated_at = now() where user_id = v_request.learner_id;

  insert into public.token_transactions (user_id, session_id, type, amount, description)
  values (v_request.learner_id, v_session.session_id, 'spend', -v_cost, 'Booked ' || coalesce(v_skill_title, 'a session'));

  update public.session_requests set status = 'scheduled', session_id = v_session.session_id
  where request_id = p_request_id;

  return v_session;
end;
$$;

-- Complete Session -> Earn Tokens. Matches supabase.rpc('complete_session', { p_session_id }).
create or replace function public.complete_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward constant integer := 1;
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

-- Cancel a pending session: frees the slot and refunds the learner.
-- Matches supabase.rpc('cancel_session', { p_session_id }).
create or replace function public.cancel_session(p_session_id uuid)
returns public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.sessions;
  v_refund integer;
begin
  select * into v_session from public.sessions where session_id = p_session_id for update;
  if not found then
    raise exception 'Session not found';
  end if;
  if auth.uid() not in (v_session.teacher_id, v_session.learner_id) then
    raise exception 'Only participants can cancel this session';
  end if;
  if v_session.status <> 'pending' then
    raise exception 'Only pending sessions can be cancelled';
  end if;

  update public.sessions set status = 'cancelled' where session_id = p_session_id
  returning * into v_session;

  update public.availability set booked = false where availability_id = v_session.availability_id;

  select abs(amount) into v_refund
  from public.token_transactions
  where session_id = p_session_id and type = 'spend'
  limit 1;

  if v_refund is not null then
    update public.token_wallet set balance = balance + v_refund, updated_at = now()
    where user_id = v_session.learner_id;

    insert into public.token_transactions (user_id, session_id, type, amount, description)
    values (v_session.learner_id, p_session_id, 'earn', v_refund, 'Refund for cancelled session');
  end if;

  return v_session;
end;
$$;

grant execute on function public.request_session(uuid, text) to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.schedule_session(uuid, uuid) to authenticated;
grant execute on function public.complete_session(uuid) to authenticated;
grant execute on function public.cancel_session(uuid) to authenticated;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.users enable row level security;
alter table public.token_wallet enable row level security;
alter table public.skills enable row level security;
alter table public.availability enable row level security;
alter table public.sessions enable row level security;
alter table public.session_requests enable row level security;
alter table public.reviews enable row level security;
alter table public.token_transactions enable row level security;
alter table public.learning_interests enable row level security;

-- users: public directory, self-editable, admins can moderate
create policy "Users are viewable by everyone"
  on public.users for select using (true);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can update any user"
  on public.users for update
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- token_wallet: private balance, writable only by SECURITY DEFINER functions
create policy "Users can view their own wallet"
  on public.token_wallet for select using (auth.uid() = user_id);

create policy "Admins can view all wallets"
  on public.token_wallet for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- skills: public browse, owner-managed
create policy "Skills are viewable by everyone"
  on public.skills for select using (true);

create policy "Users can add their own skills"
  on public.skills for insert with check (auth.uid() = user_id);

create policy "Users can update their own skills"
  on public.skills for update using (auth.uid() = user_id);

create policy "Users can delete their own skills"
  on public.skills for delete using (auth.uid() = user_id);

-- availability: public browse, owner-managed
create policy "Availability is viewable by everyone"
  on public.availability for select using (true);

create policy "Users can add their own availability"
  on public.availability for insert with check (auth.uid() = user_id);

create policy "Users can update their own availability"
  on public.availability for update using (auth.uid() = user_id);

create policy "Users can delete their own availability"
  on public.availability for delete using (auth.uid() = user_id);

-- sessions: participants only; writes go through book/complete/cancel_session()
create policy "Participants can view their sessions"
  on public.sessions for select
  using (auth.uid() = teacher_id or auth.uid() = learner_id);

create policy "Admins can view all sessions"
  on public.sessions for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- session_requests: participants only; writes go through request/respond/schedule_session()
create policy "Participants can view their requests"
  on public.session_requests for select
  using (auth.uid() = teacher_id or auth.uid() = learner_id);

-- reviews: public read, insertable only by a participant of a completed session
create policy "Reviews are viewable by everyone"
  on public.reviews for select using (true);

create policy "Session participants can review each other after completion"
  on public.reviews for insert
  with check (
    auth.uid() = reviewer_id
    and reviewee_id <> auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.session_id = reviews.session_id
        and s.status = 'completed'
        and auth.uid() in (s.teacher_id, s.learner_id)
        and reviewee_id in (s.teacher_id, s.learner_id)
    )
  );

-- token_transactions: private ledger, system-generated only
create policy "Users can view their own transactions"
  on public.token_transactions for select using (auth.uid() = user_id);

create policy "Admins can view all transactions"
  on public.token_transactions for select
  using (exists (select 1 from public.users u where u.user_id = auth.uid() and u.is_admin));

-- learning_interests: public read (supports future matching), owner-managed
create policy "Learning interests are viewable by everyone"
  on public.learning_interests for select using (true);

create policy "Users can add their own learning interests"
  on public.learning_interests for insert with check (auth.uid() = user_id);

create policy "Users can delete their own learning interests"
  on public.learning_interests for delete using (auth.uid() = user_id);
