import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import seedData from './data.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type SeedItem = {
  c: string  // categoria
  n: string  // nome
  q: number  // qtde_estoque
  ar: boolean // alto_risco
  l: { n: string; q: number; v: string | null }[] // lotes
}

export async function GET() {
  try {
    // Busca todas as categorias
    const { data: categorias, error: catError } = await supabase
      .from('categorias')
      .select('id, nome')

    if (catError || !categorias) {
      return NextResponse.json({ error: 'Erro ao buscar categorias', detail: catError }, { status: 500 })
    }

    const catMap: Record<string, string> = {}
    for (const cat of categorias) {
      catMap[cat.nome] = cat.id
    }

    const data = seedData as SeedItem[]
    let medCount = 0
    let loteCount = 0
    const BATCH = 50

    for (let i = 0; i < data.length; i += BATCH) {
      const chunk = data.slice(i, i + BATCH)

      // Insere medicamentos em batch
      const medRows = chunk.map((item, idx) => ({
        categoria_id: catMap[item.c],
        nome: item.n,
        qtde_estoque: item.q,
        alto_risco: item.ar,
        ativo: true,
        ordem: i + idx,
      })).filter(r => r.categoria_id)

      if (medRows.length === 0) continue

      const { data: insertedMeds, error: medError } = await supabase
        .from('medicamentos')
        .insert(medRows)
        .select('id, nome, categoria_id')

      if (medError || !insertedMeds) continue
      medCount += insertedMeds.length

      // Insere lotes correspondentes
      const loteRows: {
        medicamento_id: string
        numero_lote: string
        quantidade: number
        validade: string | null
      }[] = []

      for (let j = 0; j < insertedMeds.length; j++) {
        const med = insertedMeds[j]
        const original = chunk.find(c => c.n === med.nome && catMap[c.c] === med.categoria_id)
        if (!original) continue
        for (const lote of original.l) {
          if (lote.n && lote.n !== '') {
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
      message: `✅ Importação concluída!`,
      medicamentos: medCount,
      lotes: loteCount,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
