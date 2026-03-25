-- ============================================================
-- Pitch Comparison App — Schema v3: RBAC & owner_email
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add owner_email to rooms so the admin Global Dashboard can
--    display the creator's email without joining auth.users
--    (which requires the service-role key).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- 2. Add owner_id if it does not yet exist (was added manually after v2).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_id UUID;

-- ============================================================
-- 3. Row Level Security (RLS)
--    If RLS is NOT currently enabled on rooms, skip this section.
--    If RLS IS enabled, apply the policies below so that:
--      • Professors only see/write their own rooms.
--      • The designated admin (regelem@xavier.edu) can see all rooms.
--
--    NOTE: These policies run with the anon/authenticated role.
--    The admin bypass uses auth.jwt() to read the user's email
--    from the JWT — no service-role key required.
-- ============================================================

-- Enable RLS (idempotent — safe to run even if already enabled)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist so we can recreate them cleanly.
DROP POLICY IF EXISTS "Professors see own rooms"  ON rooms;
DROP POLICY IF EXISTS "Admin sees all rooms"       ON rooms;
DROP POLICY IF EXISTS "Professors insert own room" ON rooms;
DROP POLICY IF EXISTS "Admin insert any room"      ON rooms;
DROP POLICY IF EXISTS "Professors update own room" ON rooms;
DROP POLICY IF EXISTS "Admin update any room"      ON rooms;
DROP POLICY IF EXISTS "Professors delete own room" ON rooms;
DROP POLICY IF EXISTS "Admin delete any room"      ON rooms;

-- SELECT: admin sees everything; professors see only their rows.
CREATE POLICY "Admin sees all rooms"
  ON rooms FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'regelem@xavier.edu'
  );

CREATE POLICY "Professors see own rooms"
  ON rooms FOR SELECT
  USING (
    (auth.jwt() ->> 'email') <> 'regelem@xavier.edu'
    AND owner_id = auth.uid()
  );

-- INSERT: any authenticated user can create rooms (owner_id set by API).
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
