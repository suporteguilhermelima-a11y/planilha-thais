'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Loader2, Search } from 'lucide-react'
import { Medicamento } from '@/types'

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

  const [todos, setTodos] = useState<Medicamento[]>([])
  const [sugestoes, setSugestoes] = useState<Medicamento[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase
      .from('medicamentos')
      .select('*')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => { if (data) setTodos(data) })
  }, [])

  useEffect(() => {
    if (!nome.trim()) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }
    const termo = nome.toLowerCase()
    const filtrados = todos.filter(m =>
      m.mochila_id !== mochilaId &&
      m.nome.toLowerCase().includes(termo)
    )
    setSugestoes(filtrados.slice(0, 8))
    setMostrarSugestoes(filtrados.length > 0)
  }, [nome, todos, mochilaId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listaRef.current && !listaRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setMostrarSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const aplicarSugestao = (med: Medicamento) => {
    setNome(med.nome)
    setUnidade(med.unidade)
    setAltoRisco(med.alto_risco)
    setQtde(0)
    setMostrarSugestoes(false)
    inputRef.current?.focus()
  }

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
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Descrição</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onFocus={() => sugestoes.length > 0 && setMostrarSugestoes(true)}
                placeholder="Ex: AMIODARONA 150MG/3ML"
                className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>

            {mostrarSugestoes && (
              <div
                ref={listaRef}
                className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto"
              >
                <p className="text-[10px] text-gray-400 px-3 pt-2 pb-1 border-b">
                  Clique para usar como base
                </p>
                {sugestoes.map((med) => (
                  <button
                    key={med.id}
                    type="button"
                    onMouseDown={() => aplicarSugestao(med)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 text-sm"
                  >
                    <span className="flex-1 truncate font-medium text-gray-900">{med.nome}</span>
                    <span className="text-xs text-gray-400 shrink-0">{med.unidade}</span>
                    {med.alto_risco && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded shrink-0">RISCO</span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
