'use client'

import { Categoria } from '@/types'
import { ChevronRight, Menu, X } from 'lucide-react'
import { useState } from 'react'

type Props = {
  categorias: Categoria[]
  categoriaAtiva: Categoria | null
  onSelect: (cat: Categoria) => void
}

export default function Sidebar({ categorias, categoriaAtiva, onSelect }: Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {/* Botão mobile */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-800 text-white p-2 rounded-lg"
        onClick={() => setAberto(!aberto)}
      >
        {aberto ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static top-0 left-0 h-full z-40
          w-64 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200
          ${aberto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-lg font-bold text-white">🏥 Controle VTR</h1>
          <p className="text-xs text-gray-400 mt-1">Medicamentos e Lotes</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                onSelect(cat)
                setAberto(false)
              }}
              className={`
                w-full text-left px-4 py-2.5 flex items-center gap-3
                hover:bg-gray-700 transition-colors text-sm
                ${categoriaAtiva?.id === cat.id ? 'bg-gray-700 border-r-2 border-blue-400' : ''}
              `}
            >
              <span className="text-base">{cat.icone || '📋'}</span>
              <span className="flex-1 truncate">{cat.nome}</span>
              {categoriaAtiva?.id === cat.id && (
                <ChevronRight size={14} className="text-blue-400" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
          {categorias.length} categorias
        </div>
      </aside>
    </>
  )
}
