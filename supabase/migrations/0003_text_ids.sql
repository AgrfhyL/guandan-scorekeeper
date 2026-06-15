-- The Zustand store generates string ids (e.g. "p_lzx9k2_0", "r_...") but the original
-- schema used uuid primary keys for players/rounds/hands and uuid FKs in round_seats.
-- Every child-table write failed with 22P02 (invalid uuid). Only `matches` synced
-- because it keys on `code` and generates its own uuid.
--
-- Fix: recreate the four child tables with TEXT ids so they accept the store's ids
-- directly. `matches.id` stays uuid (the app reads it back as match_id). The tables
-- are empty, so dropping/recreating is safe. Policies + indexes are re-applied.

drop table if exists hands cascade;
drop table if exists round_seats cascade;
drop table if exists rounds cascade;
drop table if exists players cascade;

create table players (
  id         text primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  name       text not null,
  unique (match_id, name)
);

create table rounds (
  id           text primary key,
  match_id     uuid not null references matches(id) on delete cascade,
  idx          int  not null,
  first_dealer text not null check (first_dealer in ('blue', 'red')),
  status       text not null default 'active' check (status in ('active', 'complete', 'incomplete')),
  unique (match_id, idx)
);

create table round_seats (
  round_id  text not null references rounds(id) on delete cascade,
  seat      int  not null check (seat between 0 and 3),
  player_id text not null references players(id) on delete cascade,
  primary key (round_id, seat)
);

create table hands (
  id         text primary key,
  round_id   text not null references rounds(id) on delete cascade,
  idx        int  not null,
  rank_seat0 int  not null check (rank_seat0 between 1 and 4),
  rank_seat1 int  not null check (rank_seat1 between 1 and 4),
  rank_seat2 int  not null check (rank_seat2 between 1 and 4),
  rank_seat3 int  not null check (rank_seat3 between 1 and 4),
  kang_gong  boolean not null default false,
  unique (round_id, idx)
);

create index if not exists rounds_match_id_idx on rounds(match_id);
create index if not exists hands_round_id_idx on hands(round_id);

alter table players     enable row level security;
alter table rounds      enable row level security;
alter table round_seats enable row level security;
alter table hands       enable row level security;

create policy "public read players"     on players     for select using (true);
create policy "public read rounds"      on rounds      for select using (true);
create policy "public read round_seats" on round_seats for select using (true);
create policy "public read hands"       on hands       for select using (true);

create policy "editor can insert players" on players for insert with check (true);
create policy "editor can update players" on players for update using (true);
create policy "editor can insert rounds" on rounds for insert with check (true);
create policy "editor can update rounds" on rounds for update using (true);
create policy "editor can insert round_seats" on round_seats for insert with check (true);
create policy "editor can update round_seats" on round_seats for update using (true);
create policy "editor can insert hands" on hands for insert with check (true);
create policy "editor can update hands" on hands for update using (true);
