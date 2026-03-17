-- schema_v5.sql
-- Migrate rooms table from creator_email to owner_id (Supabase Auth UUID)
-- Run this in the Supabase SQL Editor.

alter table rooms
  add column if not exists owner_id uuid references auth.users(id);

-- Existing rooms will have owner_id = NULL.
-- Rooms created going forward will have owner_id set from the logged-in user.
-- The /api/rooms endpoint treats NULL owner_id rooms as "admin-only" rows
-- that are visible to any user whose email matches the ADMIN_EMAIL env var.
