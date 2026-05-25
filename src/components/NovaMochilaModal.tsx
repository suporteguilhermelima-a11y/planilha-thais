'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react'

const CORES = ['azul', 'vermelho', 'verde', 'laranja', 'amarelo', 'rosa', 'preto', 'branco']
const COR_HEX: Record<string, string> = {
  vermelho: '#ef4444', azul: '#3b82f6', verde: '#10b981',
  laranja: '#f97316', amarelo: '#eab308', branco: '#ffffff',
  preto: '#1f2937', rosa: '#ec4899',
}

type Props = {
  categoriaId: string
  categoriaNome: string
  ordemProxima: number
  onClose: () => void
  onSalvo: () => void
}

export default function NovaMochilaModal({ categoriaId, categoriaNome, ordemProxima, onClose, onSalvo }: Props) {
  const [nome, setNome] = useState('')
  const [numero, setNumero] = useState('')
  const [cor, setCor] = useState('')
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    await supabase.from('mochilas').insert({
      categoria_id: categoriaId,
      nome: nome.trim(),
      numero: numero.trim() || null,
      cor: cor || null,
      ordem: ordemProxima,
    })
    setSalvando(false)
    onSalvo()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Nova Mochila</h2>
            <p className="text-xs text-gray-500">{categoriaNome}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Mochila SAMU 01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && salvar()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número (opcional)</label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex: 001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor (opcional)</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCor('')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  cor === '' ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="w-3 h-3 rounded-full border border-gray-300 bg-white" />
                sem cor
              </button>
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                    cor === c ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/10"
                    style={{ backgroundColor: COR_HEX[c] }}
                  />
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={salvar}
            disabled={salvando || !nome.trim()}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando && <Loader2 size={14} className="animate-spin" />}
            Criar Mochila
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
