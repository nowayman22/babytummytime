-- ============================================================
--  Baby Tummy Time — Supabase Schema (v0.4.0, multi-tenant)
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Babies ────────────────────────────────────────────────
create table if not exists babies (
  id         uuid primary key default uuid_generate_v4(),
  owner_id   uuid references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- ── Tummy sessions ────────────────────────────────────────
create table if not exists tummy_sessions (
  id               uuid primary key default uuid_generate_v4(),
  owner_id         uuid references auth.users(id) on delete cascade,
  baby_id          uuid not null references babies(id) on delete cascade,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  duration_seconds integer,
  notes            text,
  created_at       timestamptz default now()
);

create index if not exists tummy_sessions_baby_started
  on tummy_sessions (baby_id, started_at desc);

-- ── Daily goals ───────────────────────────────────────────
create table if not exists daily_goals (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid references auth.users(id) on delete cascade,
  baby_id        uuid not null references babies(id) on delete cascade,
  target_minutes integer not null default 30,
  created_at     timestamptz default now()
);

-- ── Row-Level Security ────────────────────────────────────
alter table babies         enable row level security;
alter table tummy_sessions enable row level security;
alter table daily_goals    enable row level security;

-- Drop existing policies (idempotent re-run)
drop policy if exists "own_babies"   on babies;
drop policy if exists "own_sessions" on tummy_sessions;
drop policy if exists "own_goals"    on daily_goals;

create policy "own_babies" on babies
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own_sessions" on tummy_sessions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "own_goals" on daily_goals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── Realtime (multi-device sync) ──────────────────────────
do $$
begin
  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename = 'tummy_sessions';
  if not found then
    alter publication supabase_realtime add table tummy_sessions;
  end if;
  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename = 'daily_goals';
  if not found then
    alter publication supabase_realtime add table daily_goals;
  end if;
  perform 1 from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename = 'babies';
  if not found then
    alter publication supabase_realtime add table babies;
  end if;
end $$;
