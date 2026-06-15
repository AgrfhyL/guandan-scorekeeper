-- Fix: the initial migration created an UPDATE policy for `matches` but no INSERT policy,
-- so creating a new match (the first autosave of pushSnapshot's upsert) failed RLS.
-- All other tables already had insert policies; this brings `matches` in line.

create policy "editor can insert matches" on matches
  for insert with check (true);
