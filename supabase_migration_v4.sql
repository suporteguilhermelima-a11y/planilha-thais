-- =====================================================
-- MIGRAÇÃO V4: Reset + Sync bidirecional Google Sheets
-- Execute no SQL Editor do Supabase
-- =====================================================

BEGIN;

-- 1. Reset de dados (mantém categorias)
DELETE FROM lotes;
DELETE FROM medicamentos;
DELETE FROM mochilas;
DELETE FROM conferencias;

-- 2. Mapping medicamento → célula no Google Sheets
-- Usado tanto pra push (DB→Sheets) quanto lookup ao receber edit (Sheets→DB)
CREATE TABLE IF NOT EXISTS sheet_mapping (
  medicamento_id uuid PRIMARY KEY REFERENCES medicamentos(id) ON DELETE CASCADE,
  sheet_name text NOT NULL,
  row_index integer NOT NULL,    -- 1-indexed conforme Sheets API
  qtde_col text DEFAULT 'A',
  desc_col text DEFAULT 'B',
  lote_col text DEFAULT 'C',
  validade_col text DEFAULT 'D',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sheet_mapping_sheet ON sheet_mapping(sheet_name);
CREATE INDEX IF NOT EXISTS idx_sheet_mapping_row ON sheet_mapping(sheet_name, row_index);
ALTER TABLE sheet_mapping DISABLE ROW LEVEL SECURITY;

-- 3. Log de sync pra loop prevention
-- Toda escrita registra origem; webhook checa antes de fazer echo
CREATE TABLE IF NOT EXISTS sync_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('web', 'sheets')),
  applied_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_lookup ON sync_log(table_name, record_id, applied_at DESC);
ALTER TABLE sync_log DISABLE ROW LEVEL SECURITY;

-- 4. Purga sync_log antigo (mantém só últimos 7 dias) — opcional cron
-- DELETE FROM sync_log WHERE applied_at < now() - interval '7 days';

COMMIT;
