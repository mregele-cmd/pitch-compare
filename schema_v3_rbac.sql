-- ============================================================
-- Pitch Comparison App — Schema v3: RBAC & creator_email
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- 1. Ensure owner_id column exists (added manually after v2).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 2. Add creator_email column (the correct column name).
--    Stores the creator's email at insert time so the admin dashboard
--    can display it without needing a service-role key to query auth.users.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS creator_email TEXT;

-- 3. Drop old owner_email column if it was added by a previous version
--    of this migration (wrong column name — now corrected to creator_email).
ALTER TABLE rooms DROP COLUMN IF EXISTS owner_email;

-- ============================================================
-- 4. Row Level Security (RLS)
--
--    SELECT  → public (anyone, including unauthenticated students,
--              can read rooms — needed for the home-page access-code
--              lookup and the vote page).  Access control for who
--              can *manage* a room is enforced at the application layer
--              (ownership check in the dashboard page).
--
--    INSERT  → authenticated users only (owner_id / creator_email set by API).
--    UPDATE  → admin: any room.  Professors: only their own room.
--    DELETE  → admin: any room.  Professors: only their own room.
-- ============================================================

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies so we can recreate them cleanly.
DROP POLICY IF EXISTS "Rooms are publicly readable"    ON rooms;
DROP POLICY IF EXISTS "Professors see own rooms"        ON rooms;
DROP POLICY IF EXISTS "Admin sees all rooms"            ON rooms;
DROP POLICY IF EXISTS "Professors insert own room"      ON rooms;
DROP POLICY IF EXISTS "Admin insert any room"           ON rooms;
DROP POLICY IF EXISTS "Authenticated users insert rooms" ON rooms;
DROP POLICY IF EXISTS "Professors update own room"      ON rooms;
DROP POLICY IF EXISTS "Admin update any room"           ON rooms;
DROP POLICY IF EXISTS "Professors delete own room"      ON rooms;
DROP POLICY IF EXISTS "Admin delete any room"           ON rooms;

-- SELECT: open to everyone (anon + authenticated).
--   Rooms are not sensitive — students need to look them up by access code.
--   The dashboard page enforces who can *manage* each room.
CREATE POLICY "Rooms are publicly readable"
  ON rooms FOR SELECT
  USING (true);

-- INSERT: any authenticated user can create a room.
CREATE POLICY "Authenticated users insert rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: admin can update any room; professors only their own.
CREATE POLICY "Admin update any room"
  ON rooms FOR UPDATE
  USING ((auth.jwt() ->> 'email') = 'regelem@xavier.edu');

CREATE POLICY "Professors update own room"
  ON rooms FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') <> 'regelem@xavier.edu'
    AND owner_id = auth.uid()
  );

-- DELETE: admin can delete any room; professors only their own.
CREATE POLICY "Admin delete any room"
  ON rooms FOR DELETE
  USING ((auth.jwt() ->> 'email') = 'regelem@xavier.edu');

CREATE POLICY "Professors delete own room"
  ON rooms FOR DELETE
  USING (
    (auth.jwt() ->> 'email') <> 'regelem@xavier.edu'
    AND owner_id = auth.uid()
  );
