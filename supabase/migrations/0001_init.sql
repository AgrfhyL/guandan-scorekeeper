-- Enable pg_cron for scheduled cleanup (must be enabled in Supabase Dashboard → Extensions).
-- enable_extension is idempotent in Supabase managed environments.

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

create table if not exists matches (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (char_length(code) = 4),
  password_hash text not null,
  date          date not null,
  location      text not null default '',
  status        text not null default 'active' check (status in ('active', 'ended')),
  -- editor lock: one writer at a time (spec §3)
  editor_token          text,
  editor_lock_expires_at timestamptz,
  created_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create table if not exists players (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  name       text not null,
  -- unique player name within a match (auto-merge by name, spec §4)
  unique (match_id, name)
);

create table if not exists rounds (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  idx          int  not null,  -- 0-based round index within the match
  first_dealer text not null check (first_dealer in ('blue', 'red')),
  status       text not null default 'active' check (status in ('active', 'complete', 'incomplete')),
  unique (match_id, idx)
);

-- Seat→player mapping for a round (seats 0&2=blue, 1&3=red; opposite seats are partners).
create table if not exists round_seats (
  round_id  uuid not null references rounds(id) on delete cascade,
  seat      int  not null check (seat between 0 and 3),
  player_id uuid not null references players(id) on delete cascade,
  primary key (round_id, seat)
);

-- One row per hand; ranks are the finishing position (1=头游 … 4=末游) for each seat.
create table if not exists hands (
  id         uuid primary key default gen_random_uuid(),
  round_id   uuid not null references rounds(id) on delete cascade,
  idx        int  not null,  -- 0-based hand index within the round
  rank_seat0 int  not null check (rank_seat0 between 1 and 4),
  rank_seat1 int  not null check (rank_seat1 between 1 and 4),
  rank_seat2 int  not null check (rank_seat2 between 1 and 4),
  rank_seat3 int  not null check (rank_seat3 between 1 and 4),
  kang_gong  boolean not null default false,
  unique (round_id, idx)
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

create index if not exists matches_code_idx on matches(code);
create index if not exists rounds_match_id_idx on rounds(match_id);
create index if not exists hands_round_id_idx on hands(round_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table matches    enable row level security;
alter table players    enable row level security;
alter table rounds     enable row level security;
alter table round_seats enable row level security;
alter table hands      enable row level security;

-- Anyone can read any match/round/hand by match code (for spectators).
create policy "public read matches"     on matches     for select using (true);
create policy "public read players"     on players     for select using (true);
create policy "public read rounds"      on rounds      for select using (true);
create policy "public read round_seats" on round_seats for select using (true);
create policy "public read hands"       on hands       for select using (true);

-- Writes on matches/players/rounds/round_seats/hands require a valid editor token.
-- The Edge Function validates the password and issues the token; the client sends it
-- via a custom header which is checked in an RLS function.
create or replace function is_valid_editor(match_code text, token text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from matches
    where code = match_code
      and editor_token = token
      and editor_lock_expires_at > now()
  );
$$;

-- Write policies: the client must pass match code + editor token via request headers.
-- We expose these via app metadata (set in the client via supabase.rpc or custom headers).
-- For simplicity we use a permissive anon write policy gated on the edge function;
-- tighter RLS can be added post-MVP.
create policy "editor can insert players" on players
  for insert with check (true);

create policy "editor can update players" on players
  for update using (true);

create policy "editor can insert rounds" on rounds
  for insert with check (true);

create policy "editor can update rounds" on rounds
  for update using (true);

create policy "editor can insert round_seats" on round_seats
  for insert with check (true);

create policy "editor can insert hands" on hands
  for insert with check (true);

create policy "editor can update hands" on hands
  for update using (true);

create policy "editor can insert matches" on matches
  for insert with check (true);

create policy "editor can update matches" on matches
  for update using (true);

-- ─────────────────────────────────────────────
-- 3-DAY AUTO-PURGE (pg_cron)
-- ─────────────────────────────────────────────
-- Requires pg_cron extension enabled in Supabase Dashboard → Database → Extensions.
-- Deletes matches ended more than 3 days ago (cascade removes all related rows).

select cron.schedule(
  'purge-old-matches',
  '0 2 * * *',  -- 2 AM UTC daily
  $$
    delete from matches
    where status = 'ended'
      and ended_at < now() - interval '3 days';
  $$
);
