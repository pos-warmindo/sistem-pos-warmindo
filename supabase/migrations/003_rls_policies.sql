-- ============================================================
-- RLS POLICIES — Warmindo WP 2 POS
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────
-- Enable RLS on all tables (if not already)
-- ─────────────────────────────────────────────
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_material_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments       ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- Helper function: get current user's role
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- ROLES table — everyone can read (needed for joins)
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "roles_select_all" ON public.roles;
CREATE POLICY "roles_select_all"
  ON public.roles FOR SELECT
  USING (true);

-- ─────────────────────────────────────────────
-- USER_ROLES table — users can read their OWN role
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can read all user_roles
DROP POLICY IF EXISTS "user_roles_select_owner" ON public.user_roles;
CREATE POLICY "user_roles_select_owner"
  ON public.user_roles FOR SELECT
  USING (public.get_my_role() = 'owner');

-- ─────────────────────────────────────────────
-- USERS table
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_select_owner" ON public.users;
CREATE POLICY "users_select_owner"
  ON public.users FOR SELECT
  USING (public.get_my_role() = 'owner');

-- ─────────────────────────────────────────────
-- SHIFTS table
-- ─────────────────────────────────────────────
-- Cashier: see only own shifts
DROP POLICY IF EXISTS "shifts_select_own" ON public.shifts;
CREATE POLICY "shifts_select_own"
  ON public.shifts FOR SELECT
  USING (auth.uid() = opened_by);

-- Owner: see all shifts
DROP POLICY IF EXISTS "shifts_select_owner" ON public.shifts;
CREATE POLICY "shifts_select_owner"
  ON public.shifts FOR SELECT
  USING (public.get_my_role() = 'owner');

-- Cashier/Owner: insert own shift
DROP POLICY IF EXISTS "shifts_insert_own" ON public.shifts;
CREATE POLICY "shifts_insert_own"
  ON public.shifts FOR INSERT
  WITH CHECK (auth.uid() = opened_by);

-- Cashier/Owner: update own shift (close it)
DROP POLICY IF EXISTS "shifts_update_own" ON public.shifts;
CREATE POLICY "shifts_update_own"
  ON public.shifts FOR UPDATE
  USING (auth.uid() = opened_by);

-- ─────────────────────────────────────────────
-- RAW_MATERIALS table — read for all authenticated
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "raw_materials_select_authenticated" ON public.raw_materials;
CREATE POLICY "raw_materials_select_authenticated"
  ON public.raw_materials FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Owner only: insert/update/delete
DROP POLICY IF EXISTS "raw_materials_write_owner" ON public.raw_materials;
CREATE POLICY "raw_materials_write_owner"
  ON public.raw_materials FOR ALL
  USING (public.get_my_role() = 'owner');

-- ─────────────────────────────────────────────
-- STOCK_MOVEMENTS — read for all authenticated
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "stock_movements_select_authenticated" ON public.stock_movements;
CREATE POLICY "stock_movements_select_authenticated"
  ON public.stock_movements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert via trigger only (SECURITY DEFINER), so no INSERT policy needed for users

-- ─────────────────────────────────────────────
-- CATEGORIES, PRODUCTS, MODIFIERS, RECIPES
-- Read: all authenticated; Write: owner only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
CREATE POLICY "categories_select_authenticated"
  ON public.categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
CREATE POLICY "products_select_authenticated"
  ON public.products FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "product_modifiers_select_authenticated" ON public.product_modifiers;
CREATE POLICY "product_modifiers_select_authenticated"
  ON public.product_modifiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "product_recipes_select_authenticated" ON public.product_recipes;
CREATE POLICY "product_recipes_select_authenticated"
  ON public.product_recipes FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "modifier_material_links_select_authenticated" ON public.modifier_material_links;
CREATE POLICY "modifier_material_links_select_authenticated"
  ON public.modifier_material_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- ORDERS table
-- ─────────────────────────────────────────────
-- Cashier: see own orders
DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own"
  ON public.orders FOR SELECT
  USING (auth.uid() = cashier_id);

-- Owner: see all orders
DROP POLICY IF EXISTS "orders_select_owner" ON public.orders;
CREATE POLICY "orders_select_owner"
  ON public.orders FOR SELECT
  USING (public.get_my_role() = 'owner');

-- Cashier/Owner: insert order
DROP POLICY IF EXISTS "orders_insert_own" ON public.orders;
CREATE POLICY "orders_insert_own"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = cashier_id);

-- Cashier/Owner: update own order (void/pay)
DROP POLICY IF EXISTS "orders_update_own" ON public.orders;
CREATE POLICY "orders_update_own"
  ON public.orders FOR UPDATE
  USING (auth.uid() = cashier_id);

-- ─────────────────────────────────────────────
-- ORDER_ITEMS & ORDER_ITEM_MODIFIERS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select_own" ON public.order_items;
CREATE POLICY "order_items_select_own"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_items_select_owner" ON public.order_items;
CREATE POLICY "order_items_select_owner"
  ON public.order_items FOR SELECT
  USING (public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "order_items_insert_own" ON public.order_items;
CREATE POLICY "order_items_insert_own"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_item_modifiers_select_own" ON public.order_item_modifiers;
CREATE POLICY "order_item_modifiers_select_own"
  ON public.order_item_modifiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id AND o.cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "order_item_modifiers_select_owner" ON public.order_item_modifiers;
CREATE POLICY "order_item_modifiers_select_owner"
  ON public.order_item_modifiers FOR SELECT
  USING (public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "order_item_modifiers_insert_own" ON public.order_item_modifiers;
CREATE POLICY "order_item_modifiers_insert_own"
  ON public.order_item_modifiers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_id AND o.cashier_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- PAYMENTS table
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.cashier_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_select_owner" ON public.payments;
CREATE POLICY "payments_select_owner"
  ON public.payments FOR SELECT
  USING (public.get_my_role() = 'owner');

DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
CREATE POLICY "payments_insert_own"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.cashier_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- VERIFICATION QUERY
-- Run after applying policies to verify your role is readable:
-- ─────────────────────────────────────────────
-- SELECT public.get_my_role();
-- SELECT ur.user_id, r.name FROM public.user_roles ur JOIN public.roles r ON r.id = ur.role_id;
