-- ============================================================
-- Pitch Comparison App — Schema v2 Migration (Rooms Support)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run on an existing v1 database (uses IF NOT EXISTS / IF EXISTS guards)
-- ============================================================

-- 1. Create the rooms table
create table if not exists rooms (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  access_code text        unique,
  created_at  timestamptz not null default now()
);

-- 2. Add room_id to each existing table (nullable so existing rows aren't broken)
alter table students   add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table videos     add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table assignments add column if not exists room_id uuid references rooms(id) on delete cascade;
alter table votes      add column if not exists room_id uuid references rooms(id) on delete cascade;

-- 3. Relax the global email uniqueness on students so the same person
--    can be enrolled in multiple rooms; enforce uniqueness per (email, room) instead.
alter table students drop constraint if exists students_email_key;
alter table students add  constraint if not exists students_email_room_id_key unique (email, room_id);
