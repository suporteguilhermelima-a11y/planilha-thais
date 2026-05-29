export type Categoria = {
  id: string
  nome: string
  descricao: string | null
  cor: string | null
  icone: string | null
  ordem: number
  created_at: string
}

export type Mochila = {
  id: string
  categoria_id: string
  nome: string
  numero: string | null
  cor: string | null
  descricao: string | null
  ordem: number
  created_at: string
  total_itens?: number
  numero_lacre: string | null
  cor_lacre: string | null
}

export type Medicamento = {
  id: string
  categoria_id: string
  mochila_id: string | null
  nome: string
  qtde_estoque: number
  qtde_minima: number
  unidade: string
  alto_risco: boolean
  ativo: boolean
  ordem: number
  created_at: string
  updated_at: string
  lotes?: Lote[]
}

export type Lote = {
  id: string
  medicamento_id: string
  numero_lote: string
  validade: string | null
  quantidade: number
  created_at: string
  updated_at: string
}

export type LoteInput = {
  id?: string
  numero_lote: string
  validade: string
  quantidade: number
}

export type LoteAlerta = {
  id: string
  numero_lote: string
  validade: string | null
  quantidade: number
  medicamento_id: string
  medicamentos: {
    id: string
    nome: string
    unidade: string
    alto_risco: boolean
    qtde_estoque: number
    mochila_id: string | null
    mochilas: {
      id: string
      nome: string
      categorias: {
        id: string
        nome: string
        icone: string | null
      }
    } | null
  } | null
}

export type Conferencia = {
  id: string
  categoria_id: string
  responsavel: string | null
  numero_coren: string | null
  data_conferencia: string
  numero_lacre: string | null
  cor_lacre: string | null
  observacao: string | null
  created_at: string
}

export type SheetMapping = {
  medicamento_id: string
  sheet_name: string
  row_index: number
  qtde_col: string
  desc_col: string
  lote_col: string
  validade_col: string
  updated_at: string
}

export type SyncLogEntry = {
  id: number
  table_name: string
  record_id: string
  source: 'web' | 'sheets'
  applied_at: string
}
