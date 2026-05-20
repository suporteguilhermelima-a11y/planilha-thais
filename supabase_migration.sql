-- =====================================================
-- PLANILHA DE CONTROLE DE MEDICAMENTOS E LOTES
-- Execute este script no SQL Editor do seu Supabase
-- =====================================================

-- Categorias (representam as abas da planilha)
CREATE TABLE IF NOT EXISTS categorias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  cor text DEFAULT '#3B82F6',
  icone text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Medicamentos / Itens por categoria
CREATE TABLE IF NOT EXISTS medicamentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id uuid REFERENCES categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  qtde_estoque integer DEFAULT 0,
  qtde_minima integer DEFAULT 0,
  unidade text DEFAULT 'amp',
  alto_risco boolean DEFAULT false,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Lotes de cada medicamento
CREATE TABLE IF NOT EXISTS lotes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  medicamento_id uuid REFERENCES medicamentos(id) ON DELETE CASCADE,
  numero_lote text NOT NULL,
  validade date,
  quantidade integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Histórico de conferências
CREATE TABLE IF NOT EXISTS conferencias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id uuid REFERENCES categorias(id),
  responsavel text,
  numero_coren text,
  data_conferencia timestamptz DEFAULT now(),
  numero_lacre text,
  cor_lacre text,
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Realtime nas tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE medicamentos;
ALTER PUBLICATION supabase_realtime ADD TABLE lotes;
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;

-- Desabilitar RLS para uso interno (sem autenticação)
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE medicamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE lotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE conferencias DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DADOS INICIAIS - Categorias das abas da planilha
-- =====================================================
INSERT INTO categorias (nome, cor, icone, ordem) VALUES
  ('Controle de Psico', '#8B5CF6', '💊', 1),
  ('Autarquia Med', '#EF4444', '🚑', 2),
  ('Aeromédico', '#3B82F6', '✈️', 3),
  ('Medicamentos', '#10B981', '💊', 4),
  ('Vias Aéreas', '#F59E0B', '😷', 5),
  ('Procedimentos', '#6366F1', '✂️', 6),
  ('Emergências', '#EF4444', '❤️', 7),
  ('Traumas', '#F97316', '🤕', 8),
  ('Maletas B.F', '#84CC16', '🩹', 9),
  ('Kit Dreno', '#06B6D4', '🔧', 10),
  ('Kit Parto SAV/SBV', '#EC4899', '🤱', 11),
  ('Kits Drogas Vasoativas', '#8B5CF6', '💉', 12),
  ('Kit Farmácia', '#14B8A6', '🏥', 13),
  ('Bolsas 03-B.F', '#F59E0B', '🩺', 14),
  ('SAV B11', '#3B82F6', '🚒', 15),
  ('SAV B12', '#3B82F6', '🚒', 16),
  ('SAV B13', '#3B82F6', '🚒', 17),
  ('SAV B14', '#3B82F6', '🚒', 18),
  ('Reservas - Barra Funda', '#6B7280', '📦', 19),
  ('SAV F11', '#10B981', '🚑', 20),
  ('SAV F12', '#10B981', '🚑', 21),
  ('Bolsas 05-B.F', '#F59E0B', '🩺', 22),
  ('Bolsas 06-B.F', '#F59E0B', '🩺', 23),
  ('Carrinho-B.F', '#6366F1', '🛒', 24),
  ('Bolsas 04-B.F', '#F59E0B', '🩺', 25)
ON CONFLICT DO NOTHING;
