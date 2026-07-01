-- ============================================================
-- RLS Policies: categories table (Section 8B.2)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable RLS (idempotent)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (safe re-run)
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_owner"         ON public.categories;
DROP POLICY IF EXISTS "categories_update_owner"         ON public.categories;
DROP POLICY IF EXISTS "categories_delete_owner"         ON public.categories;

-- SELECT: semua user terautentikasi (cashier & owner) bisa membaca
CREATE POLICY "categories_select_authenticated"
  ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: hanya owner
CREATE POLICY "categories_insert_owner"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'owner'
    )
  );

-- UPDATE: hanya owner
CREATE POLICY "categories_update_owner"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'owner'
    )
  );

-- DELETE: hanya owner
CREATE POLICY "categories_delete_owner"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'owner'
    )
  );
