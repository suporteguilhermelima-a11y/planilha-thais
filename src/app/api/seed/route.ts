import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseAllSheets } from '@/lib/sheet-parser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: Request) {
  const supabase = getSupabase()
  const { searchParams } = new URL(request.url)
  const reset = searchParams.get('reset') === 'true'

  try {
    if (reset) {
      await supabase.from('sheet_mapping').delete().neq('medicamento_id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('lotes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('medicamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('mochilas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }

    // 1. Parse Google Sheets (todas as 25 abas)
    const data = await parseAllSheets()

    // 2. Categorias (busca por nome)
    const { data: categorias, error: catError } = await supabase
      .from('categorias').select('id, nome')
    if (catError || !categorias) {
      return NextResponse.json({ error: 'Erro categorias', detail: catError }, { status: 500 })
    }
    const catMap: Record<string, string> = {}
    for (const cat of categorias) catMap[cat.nome] = cat.id

    // 3. Mochilas únicas
    type MochilaRow = { categoria_id: string; nome: string; numero: string | null; cor: string | null; ordem: number }
    const mochilasUnicas = new Map<string, MochilaRow>()
    for (const item of data) {
      const catId = catMap[item.categoria]
      if (!catId) continue
      const key = `${catId}|${item.mochilaNome}`
      if (!mochilasUnicas.has(key)) {
        mochilasUnicas.set(key, {
          categoria_id: catId,
          nome: item.mochilaNome,
          numero: item.mochilaNumero,
          cor: item.mochilaCor,
          ordem: item.mochilaOrdem,
        })
      }
    }

    const mochilasArray = Array.from(mochilasUnicas.values())
    const { data: insertedMochilas, error: mochError } = await supabase
      .from('mochilas').insert(mochilasArray).select('id, nome, categoria_id')
    if (mochError || !insertedMochilas) {
      return NextResponse.json({ error: 'Erro mochilas', detail: mochError }, { status: 500 })
    }

    const mochMap: Record<string, string> = {}
    for (const m of insertedMochilas) mochMap[`${m.categoria_id}|${m.nome}`] = m.id

    // 4. Medicamentos + lotes + sheet_mapping em batches
    let medCount = 0
    let loteCount = 0
    let mappingCount = 0
    const BATCH = 50

    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH)

      // Gera UUID client-side pra garantir match item↔mapping↔lote
      const pairs = chunk.map(item => {
        const catId = catMap[item.categoria]
        const mochId = mochMap[`${catId}|${item.mochilaNome}`]
        if (!catId) return null
        return {
          id: crypto.randomUUID(),
          item,
          row: {
            id: '',
            categoria_id: catId,
            mochila_id: mochId || null,
            nome: item.nome,
            qtde_estoque: item.qtde,
            alto_risco: item.altoRisco,
            ativo: true,
            ordem: item.ordem,
          },
        }
      }).filter((p): p is NonNullable<typeof p> => p !== null)

      if (pairs.length === 0) continue

      // Atribui ids gerados aos rows
      const medRows = pairs.map(p => ({ ...p.row, id: p.id }))

      const { error: medErr } = await supabase.from('medicamentos').insert(medRows)
      if (medErr) {
        console.error('[seed] erro insert medicamentos:', medErr)
        continue
      }
      medCount += medRows.length

      // Mapping e lotes usam os ids gerados — match perfeito
      const mappingRows = pairs.map(p => ({
        medicamento_id: p.id,
        sheet_name: p.item.sheetName,
        row_index: p.item.rowIndex,
      }))

      const loteRows: { medicamento_id: string; numero_lote: string; quantidade: number; validade: string | null }[] = []
      for (const p of pairs) {
        for (const lote of p.item.lotes) {
          if (lote.numero) {
            loteRows.push({
              medicamento_id: p.id,
              numero_lote: lote.numero,
              quantidade: lote.quantidade,
              validade: lote.validade,
            })
          }
        }
      }

      const { error: mapError } = await supabase.from('sheet_mapping').insert(mappingRows)
      if (mapError) console.error('[seed] erro insert sheet_mapping:', mapError)
      else mappingCount += mappingRows.length

      if (loteRows.length > 0) {
        const { error: loteError } = await supabase.from('lotes').insert(loteRows)
        if (loteError) console.error('[seed] erro insert lotes:', loteError)
        else loteCount += loteRows.length
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Importação concluída',
      mochilas: insertedMochilas.length,
      medicamentos: medCount,
      lotes: loteCount,
      mappings: mappingCount,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err), stack: err instanceof Error ? err.stack : undefined }, { status: 500 })
  }
}
