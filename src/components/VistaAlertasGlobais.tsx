'use client'

import { AlertTriangle, Clock, X, Backpack } from 'lucide-react'
import { LoteAlerta } from '@/types'

type Props = {
  lotes: LoteAlerta[]
  tipo: 'vencidos' | 'a_vencer'
  onFechar: () => void
}

export default function VistaAlertasGlobais({ lotes, tipo, onFechar }: Props) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  type CatGrupo = { nome: string; icone: string | null; mochilas: Map<string, { nome: string; lotes: LoteAlerta[] }> }
  const grupos = new Map<string, CatGrupo>()

  for (const lote of lotes) {
    const med = lote.medicamentos
    if (!med?.mochilas) continue
    const catId = med.mochilas.categorias.id
    const mochId = med.mochila_id || 'sem-mochila'
    if (!grupos.has(catId)) {
      grupos.set(catId, { nome: med.mochilas.categorias.nome, icone: med.mochilas.categorias.icone, mochilas: new Map() })
    }
    const cg = grupos.get(catId)!
    if (!cg.mochilas.has(mochId)) cg.mochilas.set(mochId, { nome: med.mochilas.nome, lotes: [] })
    cg.mochilas.get(mochId)!.lotes.push(lote)
  }

  const totalMeds = new Set(lotes.map(l => l.medicamento_id)).size

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
          tipo === 'vencidos' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {tipo === 'vencidos'
            ? <><AlertTriangle size={14} /> Medicamentos vencidos</>
            : <><Clock size={14} /> A vencer em 10 dias</>
          }
        </div>
        <span className="text-sm text-gray-500">{totalMeds} medicamento{totalMeds !== 1 ? 's' : ''} afetado{totalMeds !== 1 ? 's' : ''}</span>
        <button
          onClick={onFechar}
          className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
        >
          <X size={12} /> Fechar filtro
        </button>
      </div>

      {/* Grupos */}
      {grupos.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm">Nenhum item encontrado.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(grupos.entries()).map(([catId, grupo]) => (
            <div key={catId}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                {grupo.icone} {grupo.nome}
              </p>
              <div className="space-y-2 ml-1">
                {Array.from(grupo.mochilas.entries()).map(([mochId, mg]) => {
                  const medsMap = new Map<string, LoteAlerta[]>()
                  for (const l of mg.lotes) {
                    if (!medsMap.has(l.medicamento_id)) medsMap.set(l.medicamento_id, [])
                    medsMap.get(l.medicamento_id)!.push(l)
                  }
                  return (
                    <div key={mochId} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="px-3 py-1.5 bg-gray-50 border-b flex items-center gap-2">
                        <Backpack size={11} className="text-blue-500" />
                        <span className="text-xs font-semibold text-gray-700">{mg.nome}</span>
                        <span className="ml-auto text-[10px] text-gray-400">{medsMap.size} item{medsMap.size !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Array.from(medsMap.entries()).map(([medId, loteMed]) => {
                          const med = loteMed[0].medicamentos!
                          return (
                            <div key={medId} className="px-3 py-2 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{med.nome}</p>
                                  {med.alto_risco && (
                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">ALTO RISCO</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {loteMed
                                    .sort((a, b) => (a.validade || '').localeCompare(b.validade || ''))
                                    .map(lote => {
                                      const vencido = lote.validade && new Date(lote.validade) < hoje
                                      const diffDias = lote.validade
                                        ? Math.ceil((new Date(lote.validade).getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000))
                                        : null
                                      return (
                                        <span
                                          key={lote.id}
                                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                            vencido
                                              ? 'bg-red-100 border-red-200 text-red-700'
                                              : 'bg-orange-100 border-orange-200 text-orange-700'
                                          }`}
                                        >
                                          {lote.numero_lote}
                                          {lote.validade && ` · ${new Date(lote.validade).toLocaleDateString('pt-BR')}`}
                                          {vencido ? ' · vencido' : diffDias !== null ? ` · ${diffDias}d` : ''}
                                        </span>
                                      )
                                    })}
                                </div>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{med.unidade}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
