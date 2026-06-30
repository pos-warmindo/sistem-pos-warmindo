-- ============================================================
-- RLS Policies: product_modifiers table (Section 8B.4)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable RLS
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "product_modifiers_select_authenticated" ON public.product_modifiers;
DROP POLICY IF EXISTS "product_modifiers_insert_owner"         ON public.product_modifiers;
DROP POLICY IF EXISTS "product_modifiers_update_owner"         ON public.product_modifiers;
DROP POLICY IF EXISTS "product_modifiers_delete_owner"         ON public.product_modifiers;

-- SELECT: semua authenticated (cashier & owner)
CREATE POLICY "product_modifiers_select_authenticated"
  ON public.product_modifiers
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: hanya owner
CREATE POLICY "product_modifiers_insert_owner"
  ON public.product_modifiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- UPDATE: hanya owner
CREATE POLICY "product_modifiers_update_owner"
  ON public.product_modifiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- DELETE: hanya owner
CREATE POLICY "product_modifiers_delete_owner"
  ON public.product_modifiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );
