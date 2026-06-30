-- ============================================================
-- RLS Policies: products table (Section 8B.3)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "products_insert_owner"         ON public.products;
DROP POLICY IF EXISTS "products_update_owner"         ON public.products;
DROP POLICY IF EXISTS "products_delete_owner"         ON public.products;

-- SELECT: semua authenticated (cashier & owner)
CREATE POLICY "products_select_authenticated"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: hanya owner
CREATE POLICY "products_insert_owner"
  ON public.products
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
CREATE POLICY "products_update_owner"
  ON public.products
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
CREATE POLICY "products_delete_owner"
  ON public.products
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

-- ============================================================
-- Supabase Storage: product-images bucket
-- Run these separately in SQL Editor (Storage API)
-- ============================================================
-- NOTE: Create bucket via Supabase Dashboard → Storage → New Bucket:
--   Name: product-images
--   Public: true (allow public read)
--
-- Then run the storage RLS policies below:

-- Allow public read on product-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- DROP existing storage policies (safe re-run)
DROP POLICY IF EXISTS "product_images_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_insert"   ON storage.objects;
DROP POLICY IF EXISTS "product_images_owner_delete"   ON storage.objects;

-- Public read: anyone can view product images
CREATE POLICY "product_images_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- INSERT: hanya owner
CREATE POLICY "product_images_owner_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- DELETE: hanya owner
CREATE POLICY "product_images_owner_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'owner'
    )
  );
