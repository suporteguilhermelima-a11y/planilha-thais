import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordSync } from '@/lib/sync-log'
import { normalizeDate, splitMultiLotes } from '@/lib/sheet-parser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Payload = {
  sheet: string
  row: number
  col: number              // 1-indexed
  value: string
  all_row: string[]        // todos os valores da linha (0-indexed array)
}

export async function POST(request: Request) {
  const supabase = getSupabase()
  const SECRET = process.env.SYNC_WEBHOOK_SECRET!

  // 1. Auth
  const auth = request.headers.get('authorization') || ''
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let payload: Payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { sheet, row, all_row } = payload

  // 2. Lookup sheet_mapping
  const { data: mapping } = await supabase
    .from('sheet_mapping')
    .select('medicamento_id, qtde_col, desc_col, lote_col, validade_col')
    .eq('sheet_name', sheet)
    .eq('row_index', row)
    .maybeSingle()

  if (!mapping) {
    // Row sem mapping: pode ser cabeçalho/footer/nova linha. Ignora por ora.
    // TODO: detectar item novo e criar medicamento + mapping
    return NextResponse.json({ ok: true, skipped: 'no_mapping', sheet, row })
  }

  const medId = mapping.medicamento_id
  const qtdeRaw = (all_row[0] || '').toString().trim()
  const nomeRaw = (all_row[1] || '').toString().trim()
  const loteRaw = (all_row[2] || '').toString().trim()
  const validadeRaw = (all_row[3] || '').toString().trim()

  const qtde = parseInt(qtdeRaw, 10)
  const updates: Record<string, string | number | boolean> = {
    updated_at: new Date().toISOString(),
  }
  if (!isNaN(qtde)) updates.qtde_estoque = qtde
  if (nomeRaw) {
    updates.nome = nomeRaw.replace(/\s+ALTO\s*RISCO\s*$/i, '').trim()
    updates.alto_risco = /ALTO\s*RISCO/i.test(nomeRaw)
  }

  // 3. Update medicamento
  const { error: medErr } = await supabase
    .from('medicamentos')
    .update(updates)
    .eq('id', medId)
  if (medErr) {
    return NextResponse.json({ error: 'medicamento update failed', detail: medErr }, { status: 500 })
  }

  // 4. Substitui lotes (delete + insert) se lote ou validade mudou
  if (loteRaw || validadeRaw) {
    await supabase.from('lotes').delete().eq('medicamento_id', medId)
    const novosLotes = splitMultiLotes(loteRaw, validadeRaw)
    if (novosLotes.length > 0) {
      await supabase.from('lotes').insert(
        novosLotes.map(l => ({
          medicamento_id: medId,
          numero_lote: l.numero,
          quantidade: l.quantidade,
          validade: l.validade ?? normalizeDate(validadeRaw),
        }))
      )
    }
  }

  // 5. Registra origem pra loop prevention
  await recordSync('medicamentos', medId, 'sheets')

  return NextResponse.json({ ok: true, medicamento_id: medId, updated: Object.keys(updates) })
}
