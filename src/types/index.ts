export type Categoria = {
  id: string
  nome: string
  descricao: string | null
  cor: string | null
  icone: string | null
  ordem: number
  created_at: string
}

export type Medicamento = {
  id: string
  categoria_id: string
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
