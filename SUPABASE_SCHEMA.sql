-- ============================================================
--  Baby Tummy Time — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Babies ────────────────────────────────────────────────
create table if not exists babies (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_at timestamptz default now()
);

-- ── Tummy sessions ────────────────────────────────────────
create table if not exists tummy_sessions (
  id               uuid primary key default uuid_generate_v4(),
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
  baby_id        uuid not null references babies(id) on delete cascade,
  target_minutes integer not null default 30,
  created_at     timestamptz default now()
);

-- ── Row-Level Security (personal app — open access) ───────
alter table babies         disable row level security;
alter table tummy_sessions disable row level security;
alter table daily_goals    disable row level security;

-- ── Done ──────────────────────────────────────────────────
-- You should now see 3 tables in your Supabase dashboard:
--   babies, tummy_sessions, daily_goals
