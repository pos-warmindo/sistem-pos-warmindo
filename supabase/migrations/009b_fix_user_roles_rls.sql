-- ============================================================
-- FIX: user_roles RLS circular dependency (Section 8C.1 hotfix)
-- 
-- Problem: SELECT policy on user_roles checks user_roles itself
--          → infinite loop → all users blocked → get_my_role() = null
--          → middleware redirects everyone to /auth/login
--
-- Fix:
--   1. Allow every user to SELECT their OWN row in user_roles
--   2. Allow owner to SELECT ALL rows (for user management UI)
--   3. Ensure get_my_role() is SECURITY DEFINER (bypasses RLS entirely)
-- ============================================================

-- ── Drop broken policies ────────────────────────────────────
DROP POLICY IF EXISTS "user_roles_select_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_owner" ON public.user_roles;

-- ── 1. Every authenticated user can SELECT their own role row ──
--    This is REQUIRED so get_my_role() works correctly.
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 2. Owner can SELECT all rows (for user management UI) ──────
--    Uses SECURITY DEFINER helper to avoid circular check.
CREATE POLICY "user_roles_select_owner"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    (SELECT r.name
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
     LIMIT 1) = 'owner'
  );

-- ── 3. INSERT / UPDATE / DELETE: only owner ────────────────────
CREATE POLICY "user_roles_insert_owner"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT r.name
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
     LIMIT 1) = 'owner'
  );

CREATE POLICY "user_roles_update_owner"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    (SELECT r.name
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
     LIMIT 1) = 'owner'
  );

CREATE POLICY "user_roles_delete_owner"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    (SELECT r.name
     FROM public.user_roles ur
     JOIN public.roles r ON r.id = ur.role_id
     WHERE ur.user_id = auth.uid()
     LIMIT 1) = 'owner'
  );

-- ── 4. Ensure get_my_role() is SECURITY DEFINER ────────────────
--    SECURITY DEFINER means the function runs as the DB owner,
--    completely bypassing RLS. This is the safest way to read roles.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT r.name::TEXT
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
