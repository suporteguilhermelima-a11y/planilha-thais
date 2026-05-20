'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Categoria, Mochila, Medicamento } from '@/types'
import Sidebar from '@/components/Sidebar'
import MedicamentoRow from '@/components/MedicamentoRow'
import NovoMedicamentoModal from '@/components/NovoMedicamentoModal'
import { Plus, RefreshCw, Search, AlertTriangle, Package, Backpack } from 'lucide-react'

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [mochilasPorCategoria, setMochilasPorCategoria] = useState<Record<string, Mochila[]>>({})
  const [categoriaAtiva, setCategoriaAtiva] = useState<Categoria | null>(null)
  const [mochilaAtiva, setMochilaAtiva] = useState<Mochila | null>(null)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [filtroAlerta, setFiltroAlerta] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    carregarCategoriasEMochilas()
  }, [])

  useEffect(() => {
    if (mochilaAtiva) carregarMedicamentos(mochilaAtiva.id)
    else setMedicamentos([])
  }, [mochilaAtiva])

  useEffect(() => {
    if (!mochilaAtiva) return
    const mid = mochilaAtiva.id
    const channel = supabase
      .channel(`realtime-moc-${mid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medicamentos', filter: `mochila_id=eq.${mid}` }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => carregarMedicamentos(mid), 600)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => carregarMedicamentos(mid), 600)
      })
      .subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [mochilaAtiva])

  const carregarCategoriasEMochilas = async () => {
    const [cats, mochs] = await Promise.all([
      supabase.from('categorias').select('*').order('ordem'),
      supabase.from('mochilas').select('*').order('ordem'),
    ])

    if (cats.data) setCategorias(cats.data)
    if (mochs.data) {
      const agrupado: Record<string, Mochila[]> = {}
      for (const m of mochs.data) {
        if (!agrupado[m.categoria_id]) agrupado[m.categoria_id] = []
        agrupado[m.categoria_id].push(m)
      }
      setMochilasPorCategoria(agrupado)
    }
  }

  const carregarMedicamentos = useCallback(async (mochilaId: string) => {
    setCarregando(true)
    const { data } = await supabase
      .from('medicamentos')
      .select('*, lotes(*)')
      .eq('mochila_id', mochilaId)
      .eq('ativo', true)
      .order('ordem')
    if (data) setMedicamentos(data)
    setCarregando(false)
  }, [])

  const handleSelectCategoria = (cat: Categoria) => {
    setCategoriaAtiva(cat)
    setMochilaAtiva(null)
  }

  const handleSelectMochila = (m: Mochila) => {
    setMochilaAtiva(m)
  }

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

  const mochilasDaCategoria = categoriaAtiva ? (mochilasPorCategoria[categoriaAtiva.id] || []) : []

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        categorias={categorias}
        mochilasPorCategoria={mochilasPorCategoria}
        categoriaAtiva={categoriaAtiva}
        mochilaAtiva={mochilaAtiva}
        onSelectCategoria={handleSelectCategoria}
        onSelectMochila={handleSelectMochila}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <div className="flex-1 min-w-0 ml-10 md:ml-0">
            {mochilaAtiva ? (
              <>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{categoriaAtiva?.icone} {categoriaAtiva?.nome}</span>
                  <span>›</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 truncate flex items-center gap-2">
                  <Backpack size={20} className="text-blue-600" />
                  {mochilaAtiva.nome}
                  {mochilaAtiva.cor && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: corHex(mochilaAtiva.cor) }}
                    />
                  )}
                </h2>
                <p className="text-sm text-gray-500">{medicamentos.length} itens</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {categoriaAtiva?.icone} {categoriaAtiva?.nome || 'Selecione uma categoria'}
                </h2>
                <p className="text-sm text-gray-500">
                  {categoriaAtiva ? `${mochilasDaCategoria.length} mochilas` : 'Escolha no menu lateral'}
                </p>
              </>
            )}
          </div>

          {mochilaAtiva && totalVencidos > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
              <AlertTriangle size={12} />
              {totalVencidos} vencido{totalVencidos > 1 ? 's' : ''}
            </span>
          )}
          {mochilaAtiva && totalAlertas > 0 && (
            <span className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
              <AlertTriangle size={12} />
              {totalAlertas} expirando
            </span>
          )}

          {mochilaAtiva && (
            <>
              <button
                onClick={() => carregarMedicamentos(mochilaAtiva.id)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Atualizar"
              >
                <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setMostrarModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Novo Item
              </button>
            </>
          )}
        </header>

        {/* Filtros (só quando mochila selecionada) */}
        {mochilaAtiva && (
          <>
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
            <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-500 bg-white border-b border-gray-100">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-red-300 bg-red-50 inline-block" />Vencido</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-yellow-300 bg-yellow-50 inline-block" />Vence em 30 dias</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-gray-200 bg-white inline-block" />OK</span>
              <span className="ml-auto text-gray-400 hidden sm:block">Clique nos números (1–5) para definir qtd. de lotes</span>
            </div>
          </>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Sem categoria selecionada */}
          {!categoriaAtiva && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package size={48} className="mb-3" />
              <p>Selecione uma categoria no menu lateral</p>
            </div>
          )}

          {/* Categoria sem mochila: mostra grid de mochilas */}
          {categoriaAtiva && !mochilaAtiva && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Selecione uma mochila</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {mochilasDaCategoria.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full">Nenhuma mochila cadastrada nesta categoria.</p>
                )}
                {mochilasDaCategoria.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMochila(m)}
                    className="text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Backpack size={20} className="text-blue-600" />
                      {m.cor && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: corHex(m.cor) }}
                          />
                          {m.cor}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{m.nome}</p>
                    {m.numero && (
                      <p className="text-xs text-gray-500">N° {m.numero}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mochila selecionada: lista de medicamentos */}
          {mochilaAtiva && carregando && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={24} className="animate-spin mr-2" />
              Carregando...
            </div>
          )}
          {mochilaAtiva && !carregando && medicamentosFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Package size={32} className="mb-2" />
              <p className="text-sm">Nenhum item nesta mochila</p>
              <button onClick={() => setMostrarModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                + Adicionar primeiro item
              </button>
            </div>
          )}
          {mochilaAtiva && !carregando && medicamentosFiltrados.map((med) => (
            <MedicamentoRow
              key={med.id}
              medicamento={med}
              onUpdate={() => carregarMedicamentos(mochilaAtiva.id)}
            />
          ))}
        </div>
      </main>

      {mostrarModal && mochilaAtiva && categoriaAtiva && (
        <NovoMedicamentoModal
          categoriaId={categoriaAtiva.id}
          mochilaId={mochilaAtiva.id}
          onClose={() => setMostrarModal(false)}
          onSalvo={() => carregarMedicamentos(mochilaAtiva.id)}
        />
      )}
    </div>
  )
}

function corHex(cor: string): string {
  const map: Record<string, string> = {
    vermelho: '#ef4444', azul: '#3b82f6', verde: '#10b981',
    laranja: '#f97316', amarelo: '#eab308', branco: '#ffffff',
    preto: '#1f2937', rosa: '#ec4899',
  }
  return map[cor.toLowerCase()] || '#6b7280'
}
