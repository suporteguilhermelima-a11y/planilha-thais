import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import seedData from './data.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SeedItem = {
  c: string  // categoria
  m: string  // mochila nome
  mn: string | null // mochila numero
  mc: string | null // mochila cor
  mo: number // mochila ordem
  n: string  // nome
  q: number  // qtde_estoque
  o: number  // ordem
  ar: boolean // alto_risco
  l: { n: string; q: number; v: string | null }[]
}

const INVALID_NAMES = ['DESCRIÇÃO DO ITEM','DESCRICAO DO ITEM','N° AT:','N° ATEND','QTDE. UTILIZADA','LOTE','VALIDADE','ITEM']
function isValidName(name: string) {
  const u = name.toUpperCase().trim()
  if (u.length < 5) return false
  return !INVALID_NAMES.some(k => u.startsWith(k) || u === k)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const reset = searchParams.get('reset') === 'true'

  try {
    // Reset opcional
    if (reset) {
      await supabase.from('lotes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('medicamentos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('mochilas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }

    // Busca categorias
    const { data: categorias, error: catError } = await supabase
      .from('categorias').select('id, nome')

    if (catError || !categorias) {
      return NextResponse.json({ error: 'Erro categorias', detail: catError }, { status: 500 })
    }

    const catMap: Record<string, string> = {}
    for (const cat of categorias) catMap[cat.nome] = cat.id

    const data = (seedData as SeedItem[]).filter(item => isValidName(item.n))

    // Cria mochilas únicas
    const mochilasUnicas = new Map<string, { categoria_id: string; nome: string; numero: string | null; cor: string | null; ordem: number }>()
    for (const item of data) {
      const key = `${item.c}|${item.m}`
      if (!mochilasUnicas.has(key) && catMap[item.c]) {
        mochilasUnicas.set(key, {
          categoria_id: catMap[item.c],
          nome: item.m,
          numero: item.mn,
          cor: item.mc,
          ordem: item.mo,
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

    // Insere medicamentos em batches
    let medCount = 0
    let loteCount = 0
    const BATCH = 50

    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH)

      const medRows = chunk.map((item) => {
        const catId = catMap[item.c]
        const mochId = mochMap[`${catId}|${item.m}`]
        return {
          categoria_id: catId,
          mochila_id: mochId || null,
          nome: item.n,
          qtde_estoque: item.q,
          alto_risco: item.ar,
          ativo: true,
          ordem: item.o,
        }
      }).filter(r => r.categoria_id && isValidName(r.nome))

      if (medRows.length === 0) continue

      const { data: insertedMeds } = await supabase
        .from('medicamentos').insert(medRows).select('id, nome, categoria_id, mochila_id, ordem')

      if (!insertedMeds) continue
      medCount += insertedMeds.length

      // Vincula lotes
      const loteRows: { medicamento_id: string; numero_lote: string; quantidade: number; validade: string | null }[] = []
      for (const med of insertedMeds) {
        const original = chunk.find(c =>
          c.n === med.nome &&
          catMap[c.c] === med.categoria_id &&
          (mochMap[`${med.categoria_id}|${c.m}`] || null) === med.mochila_id &&
          c.o === med.ordem
        )
        if (!original) continue
        for (const lote of original.l) {
          if (lote.n) {
            loteRows.push({
              medicamento_id: med.id,
              numero_lote: lote.n,
              quantidade: lote.q,
              validade: lote.v,
            })
          }
        }
      }

      if (loteRows.length > 0) {
        const { error: loteError } = await supabase.from('lotes').insert(loteRows)
        if (!loteError) loteCount += loteRows.length
      }
    }

    return NextResponse.json({
      ok: true,
      message: '✅ Importação concluída!',
      mochilas: insertedMochilas.length,
      medicamentos: medCount,
      lotes: loteCount,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
