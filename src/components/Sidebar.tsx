'use client'

import { Categoria, Mochila } from '@/types'
import { ChevronDown, ChevronRight, Menu, X, Backpack } from 'lucide-react'
import { useState } from 'react'

type Props = {
  categorias: Categoria[]
  mochilasPorCategoria: Record<string, Mochila[]>
  categoriaAtiva: Categoria | null
  mochilaAtiva: Mochila | null
  onSelectCategoria: (cat: Categoria) => void
  onSelectMochila: (mochila: Mochila) => void
}

export default function Sidebar({
  categorias,
  mochilasPorCategoria,
  categoriaAtiva,
  mochilaAtiva,
  onSelectCategoria,
  onSelectMochila,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const toggleExpand = (catId: string) => {
    const novo = new Set(expandidas)
    if (novo.has(catId)) novo.delete(catId)
    else novo.add(catId)
    setExpandidas(novo)
  }

  const handleCategoria = (cat: Categoria) => {
    onSelectCategoria(cat)
    setExpandidas(new Set([cat.id]))
  }

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-800 text-white p-2 rounded-lg"
        onClick={() => setAberto(!aberto)}
      >
        {aberto ? <X size={20} /> : <Menu size={20} />}
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setAberto(false)} />
      )}

      <aside
        className={`
          fixed md:static top-0 left-0 h-full z-40
          w-72 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200
          ${aberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">🏥 Controle VTR</h1>
          <p className="text-xs text-gray-400 mt-1">Medicamentos · Mochilas · Lotes</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {categorias.map((cat) => {
            const mochilas = mochilasPorCategoria[cat.id] || []
            const expandido = expandidas.has(cat.id)
            const ativo = categoriaAtiva?.id === cat.id

            return (
              <div key={cat.id}>
                <button
                  onClick={() => {
                    if (ativo) toggleExpand(cat.id)
                    else handleCategoria(cat)
                  }}
                  className={`
                    w-full text-left px-4 py-2.5 flex items-center gap-2
                    hover:bg-gray-700 transition-colors text-sm
                    ${ativo ? 'bg-gray-700' : ''}
                  `}
                >
                  <span className="text-base shrink-0">{cat.icone || '📋'}</span>
                  <span className="flex-1 truncate">{cat.nome}</span>
                  {mochilas.length > 0 && (
                    <span className="text-xs bg-gray-600 text-gray-200 px-1.5 py-0.5 rounded">
                      {mochilas.length}
                    </span>
                  )}
                  {mochilas.length > 0 && (
                    expandido
                      ? <ChevronDown size={14} className="text-gray-400" />
                      : <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>

                {expandido && mochilas.length > 0 && (
                  <div className="bg-gray-800/50 border-l-2 border-blue-500/30 ml-3">
                    {mochilas.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectMochila(m)
                          setAberto(false)
                        }}
                        className={`
                          w-full text-left pl-6 pr-4 py-2 flex items-center gap-2
                          hover:bg-gray-700/50 transition-colors text-xs
                          ${mochilaAtiva?.id === m.id ? 'bg-blue-900/40 text-blue-200' : 'text-gray-300'}
                        `}
                      >
                        <Backpack size={12} className="shrink-0 opacity-60" />
                        <span className="flex-1 truncate">{m.nome}</span>
                        {m.cor && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: corHex(m.cor) }}
                            title={m.cor}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
          {categorias.length} categorias
        </div>
      </aside>
    </>
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
