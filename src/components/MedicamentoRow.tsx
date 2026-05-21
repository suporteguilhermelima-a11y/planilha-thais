'use client'

import { useState, useRef, useEffect } from 'react'
import { Medicamento, LoteInput } from '@/types'
import LoteFields from './LoteFields'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Save, AlertTriangle, Loader2 } from 'lucide-react'

type Props = {
  medicamento: Medicamento
  onUpdate: () => void
}

export default function MedicamentoRow({ medicamento, onUpdate }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [numLotes, setNumLotes] = useState<number | null>(null)
  const [lotes, setLotes] = useState<LoteInput[]>([])
  const [qtde, setQtde] = useState(medicamento.qtde_estoque)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [dropdownEditorAberto, setDropdownEditorAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownEditorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownAberto && !dropdownEditorAberto) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
      if (dropdownEditorRef.current && !dropdownEditorRef.current.contains(e.target as Node)) {
        setDropdownEditorAberto(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dropdownAberto, dropdownEditorAberto])

  const lotesAtuais = medicamento.lotes || []

  const abrirEdicao = (n: number) => {
    setNumLotes(n)
    setExpandido(true)
    // Preenche com lotes existentes ou vazios
    const existentes: LoteInput[] = lotesAtuais.slice(0, n).map((l) => ({
      id: l.id,
      numero_lote: l.numero_lote,
      validade: l.validade ? l.validade.split('T')[0] : '',
      quantidade: l.quantidade,
    }))
    while (existentes.length < n) {
      existentes.push({ numero_lote: '', validade: '', quantidade: 1 })
    }
    setLotes(existentes)
  }

  const salvar = async () => {
    setSalvando(true)
    setErro(null)
    try {
      // Atualiza qtde_estoque
      await supabase.from('medicamentos').update({ qtde_estoque: qtde, updated_at: new Date().toISOString() }).eq('id', medicamento.id)

      // Remove lotes antigos
      await supabase.from('lotes').delete().eq('medicamento_id', medicamento.id)

      // Insere novos lotes
      if (lotes.length > 0) {
        const lotesParaSalvar = lotes
          .filter((l) => l.numero_lote.trim() !== '')
          .map((l) => ({
            medicamento_id: medicamento.id,
            numero_lote: l.numero_lote.trim(),
            validade: l.validade || null,
            quantidade: l.quantidade,
          }))
        if (lotesParaSalvar.length > 0) {
          await supabase.from('lotes').insert(lotesParaSalvar)
        }
      }

      setExpandido(false)
      setNumLotes(null)
      onUpdate()
    } catch (e) {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const temVencimento = lotesAtuais.some((l) => {
    if (!l.validade) return false
    const diff = new Date(l.validade).getTime() - Date.now()
    return diff < 30 * 24 * 60 * 60 * 1000
  })

  const temVencido = lotesAtuais.some((l) => {
    if (!l.validade) return false
    return new Date(l.validade) < new Date()
  })

  return (
    <div className={`border rounded-lg mb-2 overflow-hidden ${
      temVencido ? 'border-red-300 bg-red-50/30' :
      temVencimento ? 'border-yellow-300 bg-yellow-50/30' :
      'border-gray-200 bg-white'
    }`}>
      {/* Linha principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Qtde estoque */}
        {expandido ? (
          <input
            type="number"
            min={0}
            value={qtde}
            onChange={(e) => setQtde(parseInt(e.target.value) || 0)}
            className="w-14 text-center border border-blue-300 rounded px-1 py-0.5 text-sm font-bold focus:outline-none focus:border-blue-500"
          />
        ) : (
          <span className={`w-14 text-center text-sm font-bold px-2 py-1 rounded ${
            qtde === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {medicamento.qtde_estoque}
          </span>
        )}

        {/* Nome */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{medicamento.nome}</p>
          <p className="text-xs text-gray-500">{medicamento.unidade}</p>
        </div>

        {/* Alerta vencimento */}
        {(temVencido || temVencimento) && (
          <AlertTriangle
            size={16}
            className={temVencido ? 'text-red-500' : 'text-yellow-500'}
          />
        )}

        {/* Alto risco badge */}
        {medicamento.alto_risco && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium shrink-0">
            ALTO RISCO
          </span>
        )}

        {/* Botão Lotes com dropdown */}
        {!expandido && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownAberto((v) => !v)}
              className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded border font-medium transition-colors ${
                lotesAtuais.length > 0
                  ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Lotes{lotesAtuais.length > 0 && <span className="bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{lotesAtuais.length}</span>}
              <ChevronDown size={12} className={`transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
            </button>
            {dropdownAberto && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => { abrirEdicao(n); setDropdownAberto(false) }}
                    className={`w-full text-left px-4 py-1.5 text-xs hover:bg-blue-50 transition-colors ${
                      lotesAtuais.length === n ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                    }`}
                  >
                    {n} lote{n > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Toggle expandir */}
        <button
          onClick={() => {
            if (expandido) {
              setExpandido(false)
              setNumLotes(null)
            } else {
              abrirEdicao(lotesAtuais.length || 1)
            }
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Lotes atuais (visualização) */}
      {!expandido && lotesAtuais.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {lotesAtuais.map((lote, i) => {
            const vencido = lote.validade && new Date(lote.validade) < new Date()
            const alerta = lote.validade && !vencido && (new Date(lote.validade).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000
            return (
              <span
                key={lote.id}
                className={`text-xs px-2 py-1 rounded border ${
                  vencido ? 'bg-red-100 border-red-300 text-red-700' :
                  alerta ? 'bg-yellow-100 border-yellow-300 text-yellow-700' :
                  'bg-gray-100 border-gray-200 text-gray-600'
                }`}
              >
                ({lote.quantidade}) {lote.numero_lote}
                {lote.validade && ` — ${new Date(lote.validade).toLocaleDateString('pt-BR')}`}
              </span>
            )
          })}
        </div>
      )}

      {/* Editor de lotes */}
      {expandido && numLotes !== null && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">
              Editando lotes
            </span>
            <div className="relative" ref={dropdownEditorRef}>
              <button
                onClick={() => setDropdownEditorAberto((v) => !v)}
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
              >
                {numLotes} lote{numLotes > 1 ? 's' : ''}
                <ChevronDown size={12} className={`transition-transform ${dropdownEditorAberto ? 'rotate-180' : ''}`} />
              </button>
              {dropdownEditorAberto && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => { abrirEdicao(n); setDropdownEditorAberto(false) }}
                      className={`w-full text-left px-4 py-1.5 text-xs hover:bg-blue-50 transition-colors ${
                        numLotes === n ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'
                      }`}
                    >
                      {n} lote{n > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <LoteFields lotes={lotes} onChange={setLotes} />

          {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}

          <div className="flex gap-2 mt-3">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
            <button
              onClick={() => { setExpandido(false); setNumLotes(null) }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
