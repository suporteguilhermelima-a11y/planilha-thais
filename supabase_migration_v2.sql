-- =====================================================
-- MIGRAÇÃO V2: Adicionar tabela de Mochilas
-- Execute no SQL Editor do Supabase
-- =====================================================

-- Limpa dados antigos
DELETE FROM lotes;
DELETE FROM medicamentos;

-- Cria tabela de mochilas
CREATE TABLE IF NOT EXISTS mochilas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id uuid REFERENCES categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  numero text,
  cor text,
  descricao text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Adiciona mochila_id em medicamentos
ALTER TABLE medicamentos
  ADD COLUMN IF NOT EXISTS mochila_id uuid REFERENCES mochilas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_medicamentos_mochila ON medicamentos(mochila_id);
CREATE INDEX IF NOT EXISTS idx_mochilas_categoria ON mochilas(categoria_id);

-- Habilita realtime
ALTER PUBLICATION supabase_realtime ADD TABLE mochilas;

-- Desabilita RLS
ALTER TABLE mochilas DISABLE ROW LEVEL SECURITY;
