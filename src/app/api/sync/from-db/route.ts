import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { updateRange } from '@/lib/google-sheets'
import { recordSync, wasRecentlyFromSource } from '@/lib/sync-log'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SECRET = process.env.SYNC_WEBHOOK_SECRET!

type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'medicamentos' | 'lotes' | 'mochilas'
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}

export async function POST(request: Request) {
  // 1. Auth
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { type, table, record, old_record } = payload
  const targetRecord = record || old_record
  if (!targetRecord) return NextResponse.json({ ok: true, skipped: 'no_record' })

  const recordId = targetRecord.id as string
  if (!recordId) return NextResponse.json({ ok: true, skipped: 'no_id' })

  // 2. Loop prevention: se essa mesma linha foi tocada via sheets há < 5s, skip
  // Tabela alvo é sempre `medicamentos` no sync_log (lotes pertencem ao medicamento)
  const medIdForCheck = table === 'lotes'
    ? (targetRecord.medicamento_id as string)
    : recordId
  if (await wasRecentlyFromSource('medicamentos', medIdForCheck, 'sheets')) {
    return NextResponse.json({ ok: true, skipped: 'echo_from_sheets' })
  }

  // 3. Resolve medicamento_id e lookup sheet_mapping
  const medId = table === 'medicamentos' ? recordId : (targetRecord.medicamento_id as string)
  if (!medId) return NextResponse.json({ ok: true, skipped: 'no_med_id' })

  const { data: mapping } = await supabase
    .from('sheet_mapping')
    .select('sheet_name, row_index')
    .eq('medicamento_id', medId)
    .maybeSingle()

  if (!mapping) {
    return NextResponse.json({ ok: true, skipped: 'no_mapping', medId })
  }

  // 4. Busca estado atual completo do medicamento + lotes
  const { data: med } = await supabase
    .from('medicamentos')
    .select('nome, qtde_estoque, alto_risco, ativo, lotes(numero_lote, quantidade, validade)')
    .eq('id', medId)
    .maybeSingle()

  if (!med || !med.ativo) {
    // Medicamento removido ou inativo: limpa a linha no Sheets
    await updateRange(mapping.sheet_name, `A${mapping.row_index}:D${mapping.row_index}`, [['', '', '', '']])
    await recordSync('medicamentos', medId, 'web')
    return NextResponse.json({ ok: true, action: 'cleared_row' })
  }

  // 5. Monta valores da linha (cols A-D = qtde, nome, lote, validade)
  const nomeOut = med.alto_risco ? `${med.nome} ALTO RISCO` : med.nome
  const lotes = (med.lotes || []) as { numero_lote: string; quantidade: number; validade: string | null }[]

  let loteStr = ''
  let validadeStr = ''
  if (lotes.length === 1) {
    loteStr = lotes[0].numero_lote
    validadeStr = formatDate(lotes[0].validade)
  } else if (lotes.length > 1) {
    loteStr = lotes.map(l => `(${l.quantidade}) ${l.numero_lote}`).join('   ')
    validadeStr = lotes.map(l => formatDate(l.validade)).join('   ')
  }

  await updateRange(
    mapping.sheet_name,
    `A${mapping.row_index}:D${mapping.row_index}`,
    [[String(med.qtde_estoque ?? ''), nomeOut, loteStr, validadeStr]]
  )

  await recordSync('medicamentos', medId, 'web')

  return NextResponse.json({
    ok: true,
    sheet: mapping.sheet_name,
    row: mapping.row_index,
    type,
    table,
  })
}

// ISO YYYY-MM-DD → DD/MM/YYYY
function formatDate(iso: string | null): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  return `${m[3]}/${m[2]}/${m[1]}`
}
