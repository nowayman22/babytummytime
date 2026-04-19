-- ============================================================
--  Baby Tummy Time — Migration from v0.3 → v0.4 (multi-tenant)
--  Run this ONCE in: Supabase Dashboard → SQL Editor
--
--  After running: sign up in the app with nikits1993@gmail.com,
--  then run the "CLAIM ORPHAN ROWS" block at the bottom.
-- ============================================================

-- Add owner_id columns (nullable so existing rows stay readable)
alter table babies         add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table tummy_sessions add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table daily_goals    add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Enable RLS + policies (see SUPABASE_SCHEMA.sql for the full set)
alter table babies         enable row level security;
alter table tummy_sessions enable row level security;
alter table daily_goals    enable row level security;

drop policy if exists "own_babies"   on babies;
drop policy if exists "own_sessions" on tummy_sessions;
drop policy if exists "own_goals"    on daily_goals;

create policy "own_babies" on babies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_sessions" on tummy_sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "own_goals" on daily_goals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Realtime on babies too
do $$ begin
  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename = 'babies';
  if not found then
    alter publication supabase_realtime add table babies;
  end if;
end $$;

-- ============================================================
--  CLAIM ORPHAN ROWS — run this AFTER you sign up in the app
--  Replace the email below if yours differs.
-- ============================================================
-- update babies         set owner_id = (select id from auth.users where email = 'nikits1993@gmail.com') where owner_id is null;
-- update tummy_sessions set owner_id = (select b.owner_id from babies b where b.id = tummy_sessions.baby_id) where owner_id is null;
-- update daily_goals    set owner_id = (select b.owner_id from babies b where b.id = daily_goals.baby_id) where owner_id is null;
