-- ============================================================
-- Performance Indexes for Report Queries (Section 8B.6)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Index untuk query laporan orders (filter status + rentang tanggal)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at
  ON public.orders (status, created_at DESC);

-- Index untuk query payments (filter tanggal + metode pembayaran)
CREATE INDEX IF NOT EXISTS idx_payments_created_at_method
  ON public.payments (confirmed_at DESC, method);
