'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Categoria, Medicamento } from '@/types'
import Sidebar from '@/components/Sidebar'
import MedicamentoRow from '@/components/MedicamentoRow'
import NovoMedicamentoModal from '@/components/NovoMedicamentoModal'
import { Plus, RefreshCw, Search, AlertTriangle, Package } from 'lucide-react'

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria | null>(null)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroAlerta, setFiltroAlerta] = useState(false)

  useEffect(() => {
    carregarCategorias()
  }, [])

  useEffect(() => {
    if (categoriaAtiva) carregarMedicamentos(categoriaAtiva.id)
  }, [categoriaAtiva])

  useEffect(() => {
    if (!categoriaAtiva) return
    const channel = supabase
      .channel('medicamentos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos' }, () => {
        carregarMedicamentos(categoriaAtiva.id)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes' }, () => {
        carregarMedicamentos(categoriaAtiva.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [categoriaAtiva])

  const carregarCategorias = async () => {
    const { data } = await supabase.from('categorias').select('*').order('ordem')
    if (data) {
      setCategorias(data)
      if (data.length > 0) setCategoriaAtiva(data[0])
    }
  }

  const carregarMedicamentos = useCallback(async (catId: string) => {
    setCarregando(true)
    const { data } = await supabase
      .from('medicamentos')
      .select('*, lotes(*)')
      .eq('categoria_id', catId)
      .eq('ativo', true)
      .order('ordem')
      .order('nome')
    if (data) setMedicamentos(data)
    setCarregando(false)
  }, [])

  const medicamentosFiltrados = medicamentos.filter((m) => {
    const matchBusca = m.nome.toLowerCase().includes(busca.toLowerCase())
    if (filtroAlerta) {
      const temAlerta = m.lotes?.some((l) => {
        if (!l.validade) return false
        const diff = new Date(l.validade).getTime() - Date.now()
        return diff < 30 * 24 * 60 * 60 * 1000
      })
      return matchBusca && temAlerta
    }
    return matchBusca
  })

  const totalVencidos = medicamentos.filter((m) =>
    m.lotes?.some((l) => l.validade && new Date(l.validade) < new Date())
  ).length

  const totalAlertas = medicamentos.filter((m) =>
    m.lotes?.some((l) => {
      if (!l.validade) return false
      const diff = new Date(l.validade).getTime() - Date.now()
      return diff >= 0 && diff < 30 * 24 * 60 * 60 * 1000
    })
  ).length

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar categorias={categorias} categoriaAtiva={categoriaAtiva} onSelect={setCategoriaAtiva} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0 ml-10 md:ml-0">
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {categoriaAtiva?.icone} {categoriaAtiva?.nome || 'Selecione uma categoria'}
            </h2>
            <p className="text-sm text-gray-500">{medicamentos.length} itens</p>
          </div>
          {totalVencidos > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              <AlertTriangle size={12} />
              {totalVencidos} vencido{totalVencidos > 1 ? 's' : ''}
            </span>
          )}
          {totalAlertas > 0 && (
            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
              <AlertTriangle size={12} />
              {totalAlertas} expirando
            </span>
          )}
          <button
            onClick={() => categoriaAtiva && carregarMedicamentos(categoriaAtiva.id)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Atualizar"
          >
            <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
          </button>
          {categoriaAtiva && (
            <button
              onClick={() => setMostrarModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Novo Item
            </button>
          )}
        </header>

        {/* Filtros */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar medicamento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button
            onClick={() => setFiltroAlerta(!filtroAlerta)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${
              filtroAlerta ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle size={14} />
            Só alertas
          </button>
        </div>

        {/* Legenda */}
        <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-500 bg-white border-b border-gray-100">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-300 bg-red-50 inline-block" />Vencido</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-yellow-300 bg-yellow-50 inline-block" />Vence em 30 dias</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-white inline-block" />OK</span>
          <span className="ml-auto text-gray-400 hidden sm:block">Clique nos números (1–5) para definir qtd. de lotes</span>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {!categoriaAtiva && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package size={48} className="mb-3" />
              <p>Selecione uma categoria no menu lateral</p>
            </div>
          )}
          {carregando && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={24} className="animate-spin mr-2" />
              Carregando...
            </div>
          )}
          {!carregando && medicamentosFiltrados.length === 0 && categoriaAtiva && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Package size={32} className="mb-2" />
              <p className="text-sm">Nenhum item encontrado</p>
              <button onClick={() => setMostrarModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                + Adicionar primeiro item
              </button>
            </div>
          )}
          {!carregando && medicamentosFiltrados.map((med) => (
            <MedicamentoRow
              key={med.id}
              medicamento={med}
              onUpdate={() => categoriaAtiva && carregarMedicamentos(categoriaAtiva.id)}
            />
          ))}
        </div>
      </main>

      {mostrarModal && categoriaAtiva && (
        <NovoMedicamentoModal
          categoriaId={categoriaAtiva.id}
          onClose={() => setMostrarModal(false)}
          onSalvo={() => carregarMedicamentos(categoriaAtiva.id)}
        />
      )}
    </div>
  )
}
