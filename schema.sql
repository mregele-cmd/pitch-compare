-- ============================================================
-- Pitch Comparison App — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Students enrolled in the course
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique
);

-- Video pitches (YouTube / Vimeo / Drive links)
create table if not exists videos (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  url        text not null,
  elo_rating integer not null default 1200
);

-- Pairwise comparison tasks assigned to each student
create table if not exists assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  video_1_id  uuid not null references videos(id)   on delete cascade,
  video_2_id  uuid not null references videos(id)   on delete cascade,
  status      text not null default 'pending'
                check (status in ('pending', 'completed'))
);

-- Each vote cast by a student
create table if not exists votes (
  id               uuid        primary key default gen_random_uuid(),
  student_id       uuid        not null references students(id) on delete cascade,
  winner_video_id  uuid        not null references videos(id)   on delete cascade,
  loser_video_id   uuid        not null references videos(id)   on delete cascade,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Enable after you add authentication. Leave disabled for now
-- while building and testing with the anon key.
-- ============================================================
-- alter table students  enable row level security;
-- alter table videos    enable row level security;
-- alter table assignments enable row level security;
-- alter table votes     enable row level security;
