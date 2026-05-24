'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Backpack, ArrowRight } from 'lucide-react'
import { Mochila, Categoria } from '@/types'

type MochilaPlana = {
  id: string
  nome: string
  cor: string | null
  categoria_id: string
  catNome: string
}

type Props = {
  mochilaOrigem: Mochila
  categorias: Categoria[]
  mochilasPorCategoria: Record<string, Mochila[]>
  onClose: () => void
  onTransferido: () => void
}

function corHex(cor: string): string {
  const map: Record<string, string> = {
    vermelho: '#ef4444', azul: '#3b82f6', verde: '#10b981',
    laranja: '#f97316', amarelo: '#eab308', branco: '#ffffff',
    preto: '#1f2937', rosa: '#ec4899',
  }
  return map[cor.toLowerCase()] || '#6b7280'
}

export default function TransferirMochilaModal({ mochilaOrigem, categorias, mochilasPorCategoria, onClose, onTransferido }: Props) {
  const [alvo, setAlvo] = useState<MochilaPlana | null>(null)
  const [transferindo, setTransferindo] = useState(false)
  const [busca, setBusca] = useState('')

  const todasMochilas: MochilaPlana[] = categorias.flatMap(cat =>
    (mochilasPorCategoria[cat.id] || [])
      .filter(m => m.id !== mochilaOrigem.id)
      .map(m => ({ id: m.id, nome: m.nome, cor: m.cor, categoria_id: m.categoria_id, catNome: cat.nome }))
  )

  const filtradas = todasMochilas.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    m.catNome.toLowerCase().includes(busca.toLowerCase())
  )

  const transferir = async () => {
    if (!alvo) return
    setTransferindo(true)
    await supabase
      .from('medicamentos')
      .update({ mochila_id: alvo.id, categoria_id: alvo.categoria_id })
      .eq('mochila_id', mochilaOrigem.id)
      .eq('ativo', true)
    setTransferindo(false)
    onTransferido()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Transferir Mochila</h2>
            <p className="text-xs text-gray-500">Mover todos os itens para outra mochila</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Backpack size={14} className="text-blue-600 shrink-0" />
            <span className="truncate font-medium text-gray-800">{mochilaOrigem.nome}</span>
          </div>
          <ArrowRight size={16} className="text-gray-400 shrink-0" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Backpack size={14} className={alvo ? 'text-green-600' : 'text-gray-400'} />
            <span className={`truncate font-medium ${alvo ? 'text-green-700' : 'text-gray-400'}`}>
              {alvo ? alvo.nome : 'Selecione abaixo'}
            </span>
          </div>
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar mochila de destino..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 mb-2"
          autoFocus
        />

        <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
          {filtradas.length === 0 && (
            <p className="text-sm text-gray-400 p-4 text-center">Nenhuma mochila encontrada</p>
          )}
          {filtradas.map((m) => (
            <button
              key={m.id}
              onClick={() => setAlvo(m)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                alvo?.id === m.id ? 'bg-blue-50' : ''
              }`}
            >
              <Backpack size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 block truncate">{m.nome}</span>
                <span className="text-xs text-gray-500">{m.catNome}</span>
              </span>
              {m.cor && (
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: corHex(m.cor) }} />
              )}
              {alvo?.id === m.id && (
                <span className="text-xs text-blue-600 font-bold shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={transferir}
            disabled={!alvo || transferindo}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {transferindo && <Loader2 size={14} className="animate-spin" />}
            Transferir Todos os Itens
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
