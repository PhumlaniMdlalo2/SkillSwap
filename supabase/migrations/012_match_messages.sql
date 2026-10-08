-- =========================================================
-- SkillSwap — In-App Match Chat Migration
-- Enables real-time peer messaging between matched users.
-- =========================================================

create table if not exists public.messages (
  message_id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(match_id) on delete cascade,
  sender_id uuid not null references public.users(user_id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_match_id_idx on public.messages(match_id);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_match_created_idx on public.messages(match_id, created_at asc);

alter table public.messages enable row level security;

-- Drop any existing policies if re-running
drop policy if exists "Match participants can read messages" on public.messages;
drop policy if exists "Match participants can insert messages" on public.messages;

-- RLS: Only participants of the match can read its messages
create policy "Match participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.match_id = messages.match_id
        and (m.user_id_1 = auth.uid() or m.user_id_2 = auth.uid())
    )
  );

-- RLS: Only participants can send messages, and sender_id must be auth.uid()
create policy "Match participants can insert messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.match_id = messages.match_id
        and (m.user_id_1 = auth.uid() or m.user_id_2 = auth.uid())
    )
  );

-- Enable Supabase Realtime for messages if publication exists
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
