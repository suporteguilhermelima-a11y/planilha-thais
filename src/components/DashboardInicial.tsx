'use client'

import { AlertTriangle, Package, Clock, ShieldAlert, Backpack, CalendarClock } from 'lucide-react'
import { LoteAlerta } from '@/types'

type Props = {
  lotesAlerta: LoteAlerta[]
  semEstoqueCount: number
  carregando: boolean
  onFiltrar: (tipo: 'vencidos' | 'a_vencer') => void
}

export default function DashboardInicial({ lotesAlerta, semEstoqueCount, carregando, onFiltrar }: Props) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite10 = new Date(hoje.getTime() + 10 * 24 * 60 * 60 * 1000)

  const lotesVencidos = lotesAlerta.filter(l => l.validade && new Date(l.validade) < hoje)
  const lotesAVencer = lotesAlerta.filter(l => {
    if (!l.validade) return false
    const d = new Date(l.validade)
    return d >= hoje && d <= limite10
  })

  const medsVencidosIds = new Set(lotesVencidos.map(l => l.medicamento_id))
  const medsAVencerIds = new Set(lotesAVencer.map(l => l.medicamento_id))

  const medsVencidos = lotesVencidos.filter((l, i, arr) => arr.findIndex(x => x.medicamento_id === l.medicamento_id) === i)
  const medsAVencer = lotesAVencer.filter((l, i, arr) => arr.findIndex(x => x.medicamento_id === l.medicamento_id) === i)

  const altoRiscoCount = [...medsVencidos, ...medsAVencer].filter((l, i, arr) =>
    arr.findIndex(x => x.medicamento_id === l.medicamento_id) === i && l.medicamentos?.alto_risco
  ).length

  const cards = [
    {
      label: 'Medicamentos vencidos',
      value: medsVencidos.length,
      icon: <AlertTriangle size={20} className="text-red-500" />,
      style: 'bg-red-50 border-red-200 hover:border-red-400',
      valueColor: 'text-red-600',
      labelColor: 'text-red-700',
      onClick: () => onFiltrar('vencidos'),
    },
    {
      label: 'A vencer em 10 dias',
      value: medsAVencer.length,
      icon: <Clock size={20} className="text-orange-500" />,
      style: 'bg-orange-50 border-orange-200 hover:border-orange-400',
      valueColor: 'text-orange-600',
      labelColor: 'text-orange-700',
      onClick: () => onFiltrar('a_vencer'),
    },
    {
      label: 'Sem estoque',
      value: semEstoqueCount,
      icon: <Package size={20} className="text-yellow-500" />,
      style: 'bg-yellow-50 border-yellow-200',
      valueColor: 'text-yellow-600',
      labelColor: 'text-yellow-700',
      onClick: undefined,
    },
    {
      label: 'Alto risco com alerta',
      value: altoRiscoCount,
      icon: <ShieldAlert size={20} className="text-purple-500" />,
      style: 'bg-purple-50 border-purple-200',
      valueColor: 'text-purple-600',
      labelColor: 'text-purple-700',
      onClick: undefined,
    },
  ]

  // Group all critical items by categoria → mochila
  type CatGrupo = { nome: string; icone: string | null; mochilas: Map<string, { nome: string; lotes: LoteAlerta[] }> }
  const grupos = new Map<string, CatGrupo>()
  const allCritical = [
    ...lotesVencidos,
    ...lotesAVencer.filter(l => !medsVencidosIds.has(l.medicamento_id)),
  ]
  for (const lote of allCritical) {
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

  // Próximas validades (top 8 nearest not-yet-expired)
  const proximasValidades = lotesAlerta
    .filter(l => l.validade && new Date(l.validade) >= hoje)
    .sort((a, b) => new Date(a.validade!).getTime() - new Date(b.validade!).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Dashboard Crítico</h2>
        <p className="text-sm text-gray-500 mt-0.5">Visão geral de alertas em todas as mochilas e categorias</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`border rounded-xl p-4 transition-all ${card.style} ${card.onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              {card.icon}
              {card.onClick && <span className="text-[10px] text-gray-400">ver todos →</span>}
            </div>
            <p className={`text-4xl font-bold ${card.valueColor}`}>{carregando ? '…' : card.value}</p>
            <p className={`text-xs font-medium mt-1 ${card.labelColor}`}>{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista crítica */}
        <div className="lg:col-span-2">
          {grupos.size > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                Itens críticos por categoria
              </h3>
              <div className="space-y-4">
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
                            </div>
                            <div className="divide-y divide-gray-50">
                              {Array.from(medsMap.entries()).map(([medId, lotes]) => {
                                const med = lotes[0].medicamentos!
                                return (
                                  <div key={medId} className="px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-xs font-semibold text-gray-900 flex-1 truncate">{med.nome}</p>
                                      {med.alto_risco && (
                                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full shrink-0">ALTO RISCO</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {lotes.map(lote => {
                                        const vencido = lote.validade && new Date(lote.validade) < hoje
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
                                            {vencido ? ' ✕' : ''}
                                          </span>
                                        )
                                      })}
                                    </div>
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
            </>
          ) : (
            !carregando && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-gray-200 rounded-xl">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Package size={24} className="text-green-500" />
                </div>
                <p className="text-base font-semibold text-green-700">Tudo em ordem!</p>
                <p className="text-xs text-gray-400 mt-1">Nenhum item vencido ou a vencer nos próximos 10 dias.</p>
              </div>
            )
          )}
        </div>

        {/* Próximas validades */}
        {proximasValidades.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <CalendarClock size={14} className="text-blue-500" />
              Próximas validades
            </h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {proximasValidades.map((lote, i) => {
                const med = lote.medicamentos
                const diffMs = new Date(lote.validade!).getTime() - hoje.getTime()
                const diffDias = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
                const urgente = diffDias <= 10
                return (
                  <div key={lote.id} className={`px-3 py-2 flex items-start gap-2 ${i < proximasValidades.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${urgente ? 'bg-orange-400' : 'bg-blue-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{med?.nome}</p>
                      <p className="text-[10px] text-gray-400">{med?.mochilas?.nome}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[10px] font-bold ${urgente ? 'text-orange-600' : 'text-blue-600'}`}>
                        {diffDias}d
                      </p>
                      <p className="text-[10px] text-gray-400">{new Date(lote.validade!).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
