-- =====================================================
-- MIGRAÇÃO V3: Lacre nas mochilas
-- Execute no SQL Editor do Supabase
-- =====================================================

ALTER TABLE mochilas
  ADD COLUMN IF NOT EXISTS numero_lacre varchar(7),
  ADD COLUMN IF NOT EXISTS cor_lacre text DEFAULT 'azul';
