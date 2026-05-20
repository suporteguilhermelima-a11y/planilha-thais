'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2 } from 'lucide-react'

type Props = {
  categoriaId: string
  mochilaId: string
  onClose: () => void
  onSalvo: () => void
}

export default function NovoMedicamentoModal({ categoriaId, mochilaId, onClose, onSalvo }: Props) {
  const [nome, setNome] = useState('')
  const [qtde, setQtde] = useState(0)
  const [unidade, setUnidade] = useState('amp')
  const [altoRisco, setAltoRisco] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    if (!nome.trim()) return
    setSalvando(true)
    await supabase.from('medicamentos').insert({
      categoria_id: categoriaId,
      mochila_id: mochilaId,
      nome: nome.trim(),
      qtde_estoque: qtde,
      unidade,
      alto_risco: altoRisco,
    })
    setSalvando(false)
    onSalvo()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Novo Medicamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Descrição</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: AMIODARONA 150MG/3ML"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Qtde. Estoque</label>
              <input
                type="number"
                min={0}
                value={qtde}
                onChange={(e) => setQtde(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="amp">amp</option>
                <option value="cp">cp</option>
                <option value="fr">fr</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
                <option value="pct">pct</option>
                <option value="cps">cps</option>
                <option value="blister">blister</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="alto_risco"
              checked={altoRisco}
              onChange={(e) => setAltoRisco(e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <label htmlFor="alto_risco" className="text-sm text-gray-700">
              Medicamento de <span className="text-red-600 font-medium">alto risco</span>
            </label>
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
            className="flex-1 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
