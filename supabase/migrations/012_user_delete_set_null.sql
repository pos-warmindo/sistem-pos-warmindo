-- Migration: 012_user_delete_set_null.sql
-- Purpose: Izinkan penghapusan akun user TANPA menghapus riwayat penjualan.
--
-- Saat sebuah user dihapus, baris di public.users ikut dihapus, tetapi baris
-- riwayat (shifts, orders, stock_movements) HARUS tetap ada. Kolom yang menunjuk
-- ke user cukup di-set NULL. Karena shifts.opened_by dan orders.cashier_id saat
-- ini NOT NULL, kita longgarkan dulu jadi nullable, lalu ubah semua FK ke
-- public.users menjadi ON DELETE SET NULL.

-- 1. Longgarkan kolom wajib menjadi nullable (agar SET NULL valid).
ALTER TABLE public.shifts ALTER COLUMN opened_by  DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN cashier_id DROP NOT NULL;

-- 2. shifts.opened_by  -> public.users(id)  ON DELETE SET NULL
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_opened_by_fkey;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_opened_by_fkey
  FOREIGN KEY (opened_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. shifts.closed_by  -> public.users(id)  ON DELETE SET NULL
ALTER TABLE public.shifts DROP CONSTRAINT IF EXISTS shifts_closed_by_fkey;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_closed_by_fkey
  FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 4. orders.cashier_id -> public.users(id)  ON DELETE SET NULL
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cashier_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_cashier_id_fkey
  FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. stock_movements.created_by -> public.users(id)  ON DELETE SET NULL
ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_created_by_fkey;
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
