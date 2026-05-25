'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Trash2 } from 'lucide-react'
import { Mochila } from '@/types'

const CORES = ['azul', 'vermelho', 'verde', 'laranja', 'amarelo', 'rosa', 'preto', 'branco']
const COR_HEX: Record<string, string> = {
  vermelho: '#ef4444', azul: '#3b82f6', verde: '#10b981',
  laranja: '#f97316', amarelo: '#eab308', branco: '#ffffff',
  preto: '#1f2937', rosa: '#ec4899',
}

type Props = {
  mochila: Mochila
  categoriaNome: string
  onClose: () => void
  onSalvo: () => void
  onApagado: () => void
}

export default function EditarMochilaModal({ mochila, categoriaNome, onClose, onSalvo, onApagado }: Props) {
  const [nome, setNome] = useState(mochila.nome)
  const [numero, setNumero] = useState(mochila.numero ?? '')
  const [cor, setCor] = useState(mochila.cor ?? '')
  const [salvando, setSalvando] = useState(false)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)
  const [apagando, setApagando] = useState(false)

  const salvar = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    await supabase.from('mochilas').update({
      nome: nome.trim(),
      numero: numero.trim() || null,
      cor: cor || null,
    }).eq('id', mochila.id)
    setSalvando(false)
    onSalvo()
    onClose()
  }

  const apagar = async () => {
    setApagando(true)
    await supabase.from('mochilas').delete().eq('id', mochila.id)
    setApagando(false)
    onApagado()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        {confirmandoApagar ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-red-600">Apagar Mochila</h2>
              <button onClick={() => setConfirmandoApagar(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Tem certeza que deseja apagar <strong>{mochila.nome}</strong>?
            </p>
            <p className="text-xs text-red-500 mb-6">
              Todos os itens desta mochila também serão apagados.
            </p>
            <div className="flex gap-2">
              <button
                onClick={apagar}
                disabled={apagando}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {apagando && <Loader2 size={14} className="animate-spin" />}
                Sim, apagar
              </button>
              <button
                onClick={() => setConfirmandoApagar(false)}
                className="flex-1 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Editar Mochila</h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
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
                Salvar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => setConfirmandoApagar(true)}
                className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors border border-red-200"
                title="Apagar mochila"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
