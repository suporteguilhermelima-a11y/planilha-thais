'use client'

import { LoteInput } from '@/types'
import { CalendarDays, Hash, Trash2 } from 'lucide-react'

type Props = {
  lotes: LoteInput[]
  onChange: (lotes: LoteInput[]) => void
  readonly?: boolean
}

function getValidadeStatus(validade: string): 'vencido' | 'alerta' | 'ok' | 'sem_validade' {
  if (!validade) return 'sem_validade'
  const hoje = new Date()
  const dataValidade = new Date(validade)
  const diffDias = Math.ceil((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return 'vencido'
  if (diffDias <= 30) return 'alerta'
  return 'ok'
}

const statusClasses = {
  vencido: 'border-red-400 bg-red-50 text-red-700',
  alerta: 'border-yellow-400 bg-yellow-50 text-yellow-700',
  ok: 'border-green-400 bg-green-50 text-green-700',
  sem_validade: 'border-gray-300 bg-white text-gray-700',
}

export default function LoteFields({ lotes, onChange, readonly = false }: Props) {
  const update = (idx: number, field: keyof LoteInput, value: string | number) => {
    const updated = lotes.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    onChange(updated)
  }

  const remove = (idx: number) => {
    onChange(lotes.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      {lotes.map((lote, idx) => {
        const status = getValidadeStatus(lote.validade)
        return (
          <div
            key={idx}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${statusClasses[status]}`}
          >
            <span className="text-xs font-medium text-gray-500 w-5">{idx + 1}</span>

            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Hash size={12} className="shrink-0 text-gray-400" />
              <input
                type="text"
                placeholder="Número do lote"
                value={lote.numero_lote}
                disabled={readonly}
                onChange={(e) => update(idx, 'numero_lote', e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-1">
              <CalendarDays size={12} className="shrink-0 text-gray-400" />
              <input
                type="date"
                value={lote.validade}
                disabled={readonly}
                onChange={(e) => update(idx, 'validade', e.target.value)}
                className="bg-transparent text-sm outline-none w-32"
              />
            </div>

            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                value={lote.quantidade}
                disabled={readonly}
                onChange={(e) => update(idx, 'quantidade', parseInt(e.target.value) || 1)}
                className="bg-transparent text-sm outline-none w-10 text-center"
              />
              <span className="text-xs text-gray-500">un</span>
            </div>

            {!readonly && (
              <button
                onClick={() => remove(idx)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}

            {status === 'vencido' && (
              <span className="text-xs font-bold text-red-600 shrink-0">VENCIDO</span>
            )}
            {status === 'alerta' && (
              <span className="text-xs font-bold text-yellow-600 shrink-0">⚠️ 30d</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
