import { getSheetValues, listSheetTabs } from './google-sheets'

// Filtros de nome inválido (linhas-cabeçalho ou rodapé)
export const INVALID_NAMES = [
  'DESCRIÇÃO DO ITEM', 'DESCRICAO DO ITEM', 'N° AT:', 'N° ATEND',
  'QTDE. UTILIZADA', 'LOTE', 'VALIDADE', 'ITEM',
]

export function isValidName(name: string): boolean {
  const u = name.toUpperCase().trim()
  if (u.length < 5) return false
  return !INVALID_NAMES.some(k => u.startsWith(k) || u === k)
}

// Regex pra detectar linha-cabeçalho de mochila/kit/bolsa
const MOCHILA_HEADER_RE = /(MOCHILA|KIT|BOLSA|MALETA|CARRINHO|RESERVAS)\b/i

// Normaliza nome de aba pra match com categorias hardcoded (uppercase, remove emoji, trim)
export function normalizeSheetName(name: string): string {
  return name
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Mapping manual: nome de aba na planilha → nome de categoria no DB
// Ajustar conforme necessário após inspeção das categorias atuais
export const SHEET_TO_CATEGORY: Record<string, string> = {
  'CONTROLE DE PSICO': 'Controle de Psico',
  'AUTARQUIA MED': 'Autarquia Med',
  'AEROMÉDICO': 'Aeromédico',
  'AEROMEDICO': 'Aeromédico',
  'MEDICAMENTOS': 'Medicamentos',
  'VIAS AEREAS': 'Vias Aéreas',
  'PROCEDIMENTOS': 'Procedimentos',
  'EMERGÊNCIAS': 'Emergências',
  'EMERGENCIAS': 'Emergências',
  'TRAUMAS': 'Traumas',
  'MALETAS B.F': 'Maletas B.F',
  'KIT DRENO': 'Kit Dreno',
  'KIT PARTO SAV SBV': 'Kit Parto SAV/SBV',
  'KITS DROGASVASOATIVAS - BF': 'Kits Drogas Vasoativas',
  'KIT FARMACIA': 'Kit Farmácia',
  'BOLSAS 03-B.F': 'Bolsas 03-B.F',
  'SAVB11.': 'SAV B11',
  'SAVB11': 'SAV B11',
  'SAVB12': 'SAV B12',
  'SAV B13': 'SAV B13',
  'SAV B14': 'SAV B14',
  'RESERVAS - BARRA FUNDA': 'Reservas - Barra Funda',
  'SAV F11': 'SAV F11',
  'SAV F12': 'SAV F12',
  'BOLSAS 05-B.F': 'Bolsas 05-B.F',
  'BOLSAS 06-B.F': 'Bolsas 06-B.F',
  'CARRINHO-B.F': 'Carrinho-B.F',
  'BOLSAS 04-B.F': 'Bolsas 04-B.F',
}

export function mapSheetToCategory(sheetName: string): string | null {
  const norm = normalizeSheetName(sheetName)
  return SHEET_TO_CATEGORY[norm] || null
}

// Extrai número/cor de uma linha-cabeçalho de mochila
// Ex: "MOCHILA DE VIAS AEREAS COR:AZUL-Nº 01 DESCRIÇAO DO ITEM "
function parseMochilaHeader(text: string, defaultOrdem: number): {
  nome: string; numero: string | null; cor: string | null
} {
  const corMatch = text.match(/COR[:\s]+([A-ZÀ-Ú]+)/i)
  const numMatch = text.match(/N[º°.]?\s*(\d+)/i)

  // Nome = primeira parte antes de "COR:" ou "Nº"
  let nome = text.split(/COR[:\s]|N[º°.]/i)[0].trim()
  nome = nome.replace(/\bDESCRI[ÇC]AO DO ITEM\b/i, '').trim()
  if (!nome) nome = `Mochila ${defaultOrdem}`

  return {
    nome,
    numero: numMatch ? numMatch[1] : null,
    cor: corMatch ? corMatch[1].toLowerCase() : null,
  }
}

// Split de lote/validade quando empilhados na mesma célula
// Ex: "(2) 50025872  (1) 50024235" / "31/03/2027  31/01/2027"
export function splitMultiLotes(loteStr: string, validadeStr: string): {
  numero: string; quantidade: number; validade: string | null
}[] {
  if (!loteStr || !loteStr.trim()) return []

  const lotes = loteStr.split(/\s{2,}|\n/).filter(Boolean)
  const validades = validadeStr ? validadeStr.split(/\s{2,}|\n/).filter(Boolean) : []

  return lotes.map((l, i) => {
    const qtdMatch = l.match(/^\((\d+)\)\s*(.+)/)
    return {
      numero: qtdMatch ? qtdMatch[2].trim() : l.trim(),
      quantidade: qtdMatch ? parseInt(qtdMatch[1], 10) : 1,
      validade: normalizeDate(validades[i] || validades[0] || ''),
    }
  })
}

// Normaliza data DD/MM/YYYY → ISO YYYY-MM-DD. Loga warning se ambíguo.
export function normalizeDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null
  const s = raw.trim()

  // Formato DD/MM/YYYY ou DD/M/YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
  if (!m) return null

  const [, d, mo, y] = m
  const dn = parseInt(d, 10)
  const mn = parseInt(mo, 10)

  // Edge: se primeiro número > 12, é dia. Se segundo número > 12, formato é MM/DD
  if (mn > 12 && dn <= 12) {
    console.warn(`[normalizeDate] formato ambíguo (MM/DD?): ${s}`)
    return `${y}-${d.padStart(2, '0')}-${mo.padStart(2, '0')}`
  }

  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// Estrutura intermediária (mantém compat com SeedItem antigo)
export type ParsedItem = {
  categoria: string
  mochilaNome: string
  mochilaNumero: string | null
  mochilaCor: string | null
  mochilaOrdem: number
  nome: string
  qtde: number
  ordem: number
  altoRisco: boolean
  sheetName: string
  rowIndex: number       // 1-indexed pra Sheets API
  lotes: { numero: string; quantidade: number; validade: string | null }[]
}

// Parser principal: lê todas as abas e retorna itens estruturados
export async function parseAllSheets(): Promise<ParsedItem[]> {
  const tabs = await listSheetTabs()
  const out: ParsedItem[] = []

  for (const tab of tabs) {
    const categoria = mapSheetToCategory(tab.title)
    if (!categoria) {
      console.warn(`[parser] aba sem mapeamento: "${tab.title}"`)
      continue
    }

    const rows = await getSheetValues(tab.title)
    let mochilaAtual: { nome: string; numero: string | null; cor: string | null; ordem: number } | null = null
    let mochilaOrdem = 0
    let itemOrdem = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const cellA = (row[0] || '').toString().trim()
      const cellB = (row[1] || '').toString().trim()
      const cellC = (row[2] || '').toString().trim()
      const cellD = (row[3] || '').toString().trim()

      // Linha-cabeçalho de mochila: detecta na cellB sem qtde válida
      if (cellB && MOCHILA_HEADER_RE.test(cellB) && !cellA.match(/^\d+$/)) {
        mochilaOrdem++
        mochilaAtual = { ...parseMochilaHeader(cellB, mochilaOrdem), ordem: mochilaOrdem }
        itemOrdem = 0
        continue
      }

      // Linha de item: qtde numérica na cellA + descrição válida na cellB
      const qtde = parseInt(cellA, 10)
      if (isNaN(qtde) || !isValidName(cellB)) continue
      if (!mochilaAtual) {
        // Item sem mochila: cria mochila padrão pra essa aba
        mochilaOrdem++
        mochilaAtual = { nome: categoria, numero: null, cor: null, ordem: mochilaOrdem }
      }

      itemOrdem++
      const altoRisco = /ALTO\s*RISCO/i.test(cellB)
      const lotes = splitMultiLotes(cellC, cellD)

      out.push({
        categoria,
        mochilaNome: mochilaAtual.nome,
        mochilaNumero: mochilaAtual.numero,
        mochilaCor: mochilaAtual.cor,
        mochilaOrdem: mochilaAtual.ordem,
        nome: cellB.replace(/\s+ALTO\s*RISCO\s*$/i, '').trim(),
        qtde,
        ordem: itemOrdem,
        altoRisco,
        sheetName: tab.title,
        rowIndex: i + 1,           // Sheets API é 1-indexed
        lotes,
      })
    }
  }

  return out
}
