-- ============================================================
-- RLS Policies: user_roles table (Section 8C.1)
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_owner" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_owner" ON public.user_roles;

-- Helper: check if current user is owner
-- SELECT: hanya owner yang bisa melihat semua user roles
CREATE POLICY "user_roles_select_owner"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- INSERT: hanya owner
CREATE POLICY "user_roles_insert_owner"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- UPDATE: hanya owner
CREATE POLICY "user_roles_update_owner"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- DELETE: hanya owner
CREATE POLICY "user_roles_delete_owner"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- ── users table RLS ──────────────────────────────────────────
-- Owner dapat melihat semua user profiles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_owner"       ON public.users;
DROP POLICY IF EXISTS "users_select_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_update_owner"       ON public.users;

-- User bisa baca profil sendiri
CREATE POLICY "users_select_own_profile"
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Owner bisa baca semua profil
CREATE POLICY "users_select_owner"
  ON public.users FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- User bisa update profil sendiri
CREATE POLICY "users_update_own_profile"
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Owner bisa update semua profil
CREATE POLICY "users_update_owner"
  ON public.users FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );
