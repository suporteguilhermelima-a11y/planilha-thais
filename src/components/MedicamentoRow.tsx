'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Medicamento, LoteInput } from '@/types'
import LoteFields from './LoteFields'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronUp, Save, AlertTriangle, Loader2, MoveRight } from 'lucide-react'

type OutraMochila = {
  id: string
  nome: string
  cor: string | null
  categoria_id: string
  catNome: string
}

type Props = {
  medicamento: Medicamento
  onUpdate: () => void
  outrasMovilas?: OutraMochila[]
  onMovido?: () => void
}

function corHex(cor: string): string {
  const map: Record<string, string> = {
    vermelho: '#ef4444', azul: '#3b82f6', verde: '#10b981',
    laranja: '#f97316', amarelo: '#eab308', branco: '#ffffff',
    preto: '#1f2937', rosa: '#ec4899',
  }
  return map[cor.toLowerCase()] || '#6b7280'
}

export default function MedicamentoRow({ medicamento, onUpdate, outrasMovilas = [], onMovido }: Props) {
  const [expandido, setExpandido] = useState(false)
  const [numLotes, setNumLotes] = useState<number | null>(null)
  const [lotes, setLotes] = useState<LoteInput[]>([])
  const [qtde, setQtde] = useState(medicamento.qtde_estoque)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [dropdownEditorAberto, setDropdownEditorAberto] = useState(false)
  const [moverAberto, setMoverAberto] = useState(false)
  const [movendo, setMovendo] = useState(false)
  const [buscaMover, setBuscaMover] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const dropdownEditorRef = useRef<HTMLDivElement>(null)
  const moverRef = useRef<HTMLDivElement>(null)
  const lotesRef = useRef(lotes)
  const qtdeRef = useRef(qtde)
  const expandidoRef = useRef(expandido)

  useEffect(() => { lotesRef.current = lotes }, [lotes])
  useEffect(() => { qtdeRef.current = qtde }, [qtde])
  useEffect(() => { expandidoRef.current = expandido }, [expandido])

  useEffect(() => {
    if (!dropdownAberto && !dropdownEditorAberto && !moverAberto) return
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
      if (dropdownEditorRef.current && !dropdownEditorRef.current.contains(e.target as Node)) {
        setDropdownEditorAberto(false)
      }
      if (moverRef.current && !moverRef.current.contains(e.target as Node)) {
        setMoverAberto(false)
        setBuscaMover('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [dropdownAberto, dropdownEditorAberto, moverAberto])

  const salvarSilencioso = useCallback(async () => {
    if (!expandidoRef.current) return
    const qtdeAtual = qtdeRef.current
    const lotesAtual = lotesRef.current
    const lotesParaSalvar = lotesAtual
      .filter((l) => l.numero_lote.trim() !== '')
      .map((l) => ({
        medicamento_id: medicamento.id,
        numero_lote: l.numero_lote.trim(),
        validade: l.validade || null,
        quantidade: l.quantidade,
      }))
    await supabase.from('medicamentos').update({ qtde_estoque: qtdeAtual }).eq('id', medicamento.id)
    await supabase.from('lotes').delete().eq('medicamento_id', medicamento.id)
    if (lotesParaSalvar.length > 0) {
      await supabase.from('lotes').insert(lotesParaSalvar)
    }
  }, [medicamento.id])

  // Auto-save ao trocar de aba do navegador
  useEffect(() => {
    const handle = () => { if (document.hidden) salvarSilencioso() }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [salvarSilencioso])

  // Auto-save ao desmontar (troca de mochila/categoria)
  useEffect(() => {
    return () => { salvarSilencioso() }
  }, [salvarSilencioso])

  const lotesAtuais = medicamento.lotes || []

  const abrirEdicao = (n: number) => {
    setNumLotes(n)
    setExpandido(true)
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
      await supabase.from('medicamentos').update({ qtde_estoque: qtde, updated_at: new Date().toISOString() }).eq('id', medicamento.id)
      await supabase.from('lotes').delete().eq('medicamento_id', medicamento.id)
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
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const moverPara = async (alvo: OutraMochila) => {
    setMovendo(true)
    await supabase
      .from('medicamentos')
      .update({ mochila_id: alvo.id, categoria_id: alvo.categoria_id })
      .eq('id', medicamento.id)
    setMovendo(false)
    setMoverAberto(false)
    setBuscaMover('')
    onMovido?.()
  }

  const mochilasFiltradas = outrasMovilas.filter(m =>
    m.nome.toLowerCase().includes(buscaMover.toLowerCase()) ||
    m.catNome.toLowerCase().includes(buscaMover.toLowerCase())
  )

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

        {(temVencido || temVencimento) && (
          <AlertTriangle
            size={16}
            className={temVencido ? 'text-red-500' : 'text-yellow-500'}
          />
        )}

        {medicamento.alto_risco && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium shrink-0">
            ALTO RISCO
          </span>
        )}

        {/* Botão Mover */}
        {!expandido && outrasMovilas.length > 0 && (
          <div className="relative shrink-0" ref={moverRef}>
            <button
              onClick={() => { setMoverAberto((v) => !v); setBuscaMover('') }}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Mover para outra mochila"
              disabled={movendo}
            >
              {movendo ? <Loader2 size={11} className="animate-spin" /> : <MoveRight size={11} />}
              Mover
            </button>
            {moverAberto && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-64">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    value={buscaMover}
                    onChange={(e) => setBuscaMover(e.target.value)}
                    placeholder="Buscar mochila..."
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {mochilasFiltradas.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Nenhuma mochila encontrada</p>
                  )}
                  {mochilasFiltradas.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => moverPara(m)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-900 block truncate">{m.nome}</span>
                        <span className="text-[10px] text-gray-400">{m.catNome}</span>
                      </span>
                      {m.cor && (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: corHex(m.cor) }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                key={lote.id || i}
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
            <span className="text-sm font-medium text-gray-700">Editando lotes</span>
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

          <LoteFields lotes={lotes} onChange={(novosLotes) => {
            setLotes(novosLotes)
            setQtde(novosLotes.reduce((acc, l) => acc + (l.quantidade || 0), 0))
          }} />

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
