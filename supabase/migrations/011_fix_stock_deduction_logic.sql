-- Migration: 011_fix_stock_deduction_logic.sql
-- Purpose: Perbaiki trigger/logika pengurangan stok bahan baku
-- Stok bahan baku hanya boleh dideduksi/dikurangi secara atomik ketika status pembayaran pesanan sudah berhasil diubah menjadi PAID.

-- Drop any existing triggers that might be firing incorrectly on INSERT
DROP TRIGGER IF EXISTS trg_deduct_stock_on_insert ON public.order_items;
DROP TRIGGER IF EXISTS trg_deduct_stock ON public.order_items;
DROP TRIGGER IF EXISTS trg_deduct_stock_on_insert ON public.orders;
DROP TRIGGER IF EXISTS trg_deduct_stock ON public.orders;
DROP TRIGGER IF EXISTS trg_deduct_stock_on_payment ON public.orders;

-- Perbaiki fungsi fn_deduct_stock
CREATE OR REPLACE FUNCTION public.fn_deduct_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Hanya jalankan jika status berubah menjadi PAID
  IF TG_OP = 'UPDATE' AND NEW.status = 'PAID' AND OLD.status != 'PAID' THEN
    
    -- 1. Kurangi stok untuk bahan baku produk utama
    UPDATE public.raw_materials rm
    SET 
      current_stock = rm.current_stock - (pm.quantity_needed * oi.quantity),
      updated_at = NOW()
    FROM public.product_materials pm
    JOIN public.order_items oi ON oi.product_id = pm.product_id
    WHERE oi.order_id = NEW.id
      AND rm.id = pm.material_id;

    -- 2. Kurangi stok untuk bahan baku topping/modifier
    UPDATE public.raw_materials rm
    SET 
      current_stock = rm.current_stock - (mml.quantity_needed * oi.quantity),
      updated_at = NOW()
    FROM public.modifier_material_links mml
    JOIN public.order_item_modifiers oim ON oim.modifier_id = mml.modifier_id
    JOIN public.order_items oi ON oi.id = oim.order_item_id
    WHERE oi.order_id = NEW.id
      AND rm.id = mml.material_id;

    -- 3. Catat stock_movements untuk produk utama
    INSERT INTO public.stock_movements (material_id, order_id, movement_type, quantity_change, notes)
    SELECT 
      pm.material_id, 
      NEW.id, 
      'SALE', 
      -(pm.quantity_needed * oi.quantity),
      'Penjualan POS: ' || oi.product_name
    FROM public.product_materials pm
    JOIN public.order_items oi ON oi.product_id = pm.product_id
    WHERE oi.order_id = NEW.id;

    -- 4. Catat stock_movements untuk topping/modifier
    INSERT INTO public.stock_movements (material_id, order_id, movement_type, quantity_change, notes)
    SELECT 
      mml.material_id, 
      NEW.id, 
      'SALE', 
      -(mml.quantity_needed * oi.quantity),
      'Penjualan POS Topping: ' || oim.modifier_name
    FROM public.modifier_material_links mml
    JOIN public.order_item_modifiers oim ON oim.modifier_id = mml.modifier_id
    JOIN public.order_items oi ON oi.id = oim.order_item_id
    WHERE oi.order_id = NEW.id;

  END IF;

  RETURN NEW;
END;
$$;

-- Buat trigger baru di tabel orders
CREATE TRIGGER trg_deduct_stock_on_payment
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'PAID' AND OLD.status != 'PAID')
EXECUTE FUNCTION public.fn_deduct_stock();
