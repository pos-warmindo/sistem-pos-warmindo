-- ============================================================
-- RLS Policies: raw_materials & stock_movements (Section 8B.5)
-- RPC Function: restock_raw_material
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── raw_materials RLS ────────────────────────────────────────
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raw_materials_select_authenticated" ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_insert_owner"         ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_update_owner"         ON public.raw_materials;
DROP POLICY IF EXISTS "raw_materials_delete_owner"         ON public.raw_materials;

-- SELECT: semua authenticated (cashier & owner — cashier butuh untuk cek stok realtime)
CREATE POLICY "raw_materials_select_authenticated"
  ON public.raw_materials FOR SELECT TO authenticated USING (true);

-- INSERT / UPDATE / DELETE: hanya owner
CREATE POLICY "raw_materials_insert_owner"
  ON public.raw_materials FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'owner'
  ));

CREATE POLICY "raw_materials_update_owner"
  ON public.raw_materials FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'owner'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'owner'
  ));

CREATE POLICY "raw_materials_delete_owner"
  ON public.raw_materials FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'owner'
  ));

-- ── stock_movements RLS ──────────────────────────────────────
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select_authenticated" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_insert_owner"         ON public.stock_movements;

-- SELECT: semua authenticated
CREATE POLICY "stock_movements_select_authenticated"
  ON public.stock_movements FOR SELECT TO authenticated USING (true);

-- INSERT: owner (manual restock/adjustment) — trigger fn_deduct_stock uses SECURITY DEFINER
CREATE POLICY "stock_movements_insert_owner"
  ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'owner'
  ));

-- ── RPC: restock_raw_material ────────────────────────────────
-- Atomically updates current_stock and logs to stock_movements.
-- SECURITY DEFINER so it bypasses RLS within the function.
CREATE OR REPLACE FUNCTION public.restock_raw_material(
  p_material_id   UUID,
  p_quantity      NUMERIC,
  p_cost_per_unit NUMERIC DEFAULT NULL,
  p_owner_id      UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_material      public.raw_materials%ROWTYPE;
  v_stock_before  NUMERIC;
  v_stock_after   NUMERIC;
BEGIN
  -- Validate quantity
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Jumlah restock harus lebih dari 0.'
      USING ERRCODE = 'P0003';
  END IF;

  -- Lock the row to prevent race conditions
  SELECT * INTO v_material
  FROM public.raw_materials
  WHERE id = p_material_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bahan baku dengan ID % tidak ditemukan.', p_material_id
      USING ERRCODE = 'P0004';
  END IF;

  v_stock_before := v_material.current_stock;
  v_stock_after  := v_stock_before + p_quantity;

  -- Update current_stock (and cost_per_unit if provided)
  UPDATE public.raw_materials
  SET
    current_stock = v_stock_after,
    cost_per_unit = COALESCE(p_cost_per_unit, cost_per_unit),
    updated_at    = NOW()
  WHERE id = p_material_id;

  -- Log to stock_movements
  INSERT INTO public.stock_movements (
    material_id,
    order_id,
    movement_type,
    quantity_change,
    quantity_before,
    quantity_after,
    notes,
    created_by
  ) VALUES (
    p_material_id,
    NULL,
    'RESTOCK',
    p_quantity,
    v_stock_before,
    v_stock_after,
    'Restock manual oleh owner',
    COALESCE(p_owner_id, auth.uid())
  );

  RETURN jsonb_build_object(
    'material_id',    p_material_id,
    'material_name',  v_material.name,
    'stock_before',   v_stock_before,
    'stock_after',    v_stock_after,
    'quantity_added', p_quantity
  );
END;
$$;

-- Grant execute to authenticated users (RLS check is inside the function)
GRANT EXECUTE ON FUNCTION public.restock_raw_material(UUID, NUMERIC, NUMERIC, UUID)
  TO authenticated;
