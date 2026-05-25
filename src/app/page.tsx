'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Categoria, Mochila, Medicamento, LoteAlerta } from '@/types'
import Sidebar from '@/components/Sidebar'
import MedicamentoRow from '@/components/MedicamentoRow'
import NovoMedicamentoModal from '@/components/NovoMedicamentoModal'
import DashboardInicial from '@/components/DashboardInicial'
import VistaAlertasGlobais from '@/components/VistaAlertasGlobais'
import NovaMochilaModal from '@/components/NovaMochilaModal'
import EditarMochilaModal from '@/components/EditarMochilaModal'
import TransferirMochilaModal from '@/components/TransferirMochilaModal'
import LacreTag from '@/components/LacreTag'
import { Plus, RefreshCw, Search, AlertTriangle, Package, Backpack, Clock, X, Download, Printer, ArrowLeftRight, Pencil } from 'lucide-react'

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

  const [lotesAlerta, setLotesAlerta] = useState<LoteAlerta[]>([])
  const [semEstoqueCount, setSemEstoqueCount] = useState(0)
  const [carregandoAlertas, setCarregandoAlertas] = useState(false)
  const [filtroGlobal, setFiltroGlobal] = useState<'vencidos' | 'a_vencer' | null>(null)
  const [mostrarNovaMochila, setMostrarNovaMochila] = useState(false)
  const [mostrarTransferirMochila, setMostrarTransferirMochila] = useState(false)
  const [mochilaParaEditar, setMochilaParaEditar] = useState<Mochila | null>(null)

  useEffect(() => {
    carregarCategoriasEMochilas()
    carregarAlertasGlobais()
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
        debounceRef.current = setTimeout(() => {
          carregarMedicamentos(mid)
          carregarAlertasGlobais()
        }, 600)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lotes' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          carregarMedicamentos(mid)
          carregarAlertasGlobais()
        }, 600)
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

  const carregarAlertasGlobais = useCallback(async () => {
    setCarregandoAlertas(true)
    const in10days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const [{ data: lotes }, { count: semEstoque }] = await Promise.all([
      supabase
        .from('lotes')
        .select(`
          id, numero_lote, validade, quantidade, medicamento_id,
          medicamentos (
            id, nome, unidade, alto_risco, qtde_estoque, mochila_id,
            mochilas ( id, nome, categorias ( id, nome, icone ) )
          )
        `)
        .lte('validade', in10days)
        .not('validade', 'is', null),
      supabase
        .from('medicamentos')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .eq('qtde_estoque', 0),
    ])
    if (lotes) setLotesAlerta(lotes as unknown as LoteAlerta[])
    setSemEstoqueCount(semEstoque || 0)
    setCarregandoAlertas(false)
  }, [])

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

  const exportarCSVMochila = async (mochila: Mochila) => {
    const { data } = await supabase
      .from('medicamentos')
      .select('*, lotes(*)')
      .eq('mochila_id', mochila.id)
      .eq('ativo', true)
      .order('ordem')

    const cat = categorias.find(c => c.id === mochila.categoria_id)
    const titulo = [cat?.nome, mochila.nome, mochila.numero ? `Nº ${mochila.numero}` : ''].filter(Boolean).join(' - ')
    const hoje = new Date().toLocaleDateString('pt-BR')

    const formatarData = (v: string) =>
      new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')

    const csvLinhas: string[] = [
      `"${titulo}","","","LOTE"`,
      `"Data: ${hoje}","","",""`,
      '',
      '"Qtde Estoque","Descrição do Item","Lote","Validade"',
    ]

    for (const med of data || []) {
      const lotes = (med.lotes || []) as { numero_lote: string; validade?: string | null; quantidade: number }[]
      let lotesStr = ''
      let validadesStr = ''

      if (lotes.length === 0) {
        lotesStr = ''
        validadesStr = ''
      } else if (lotes.length === 1) {
        lotesStr = lotes[0].numero_lote
        validadesStr = lotes[0].validade ? formatarData(lotes[0].validade) : ''
      } else {
        lotesStr = lotes.map(l => `(${l.quantidade}) ${l.numero_lote}`).join(' | ')
        validadesStr = lotes.map(l => l.validade ? formatarData(l.validade) : '').join(' | ')
      }

      const nome = med.alto_risco ? `${med.nome} [ALTO RISCO]` : med.nome
      csvLinhas.push(`"${med.qtde_estoque}","${nome}","${lotesStr}","${validadesStr}"`)
    }

    const conteudo = '﻿' + csvLinhas.join('\n')
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const nomeArquivo = `${mochila.nome.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`
    a.download = nomeArquivo
    a.click()
    URL.revokeObjectURL(url)
  }

  const imprimirMochila = async (mochila: Mochila) => {
    const { data } = await supabase
      .from('medicamentos')
      .select('*, lotes(*)')
      .eq('mochila_id', mochila.id)
      .eq('ativo', true)
      .order('ordem')

    const cat = categorias.find(c => c.id === mochila.categoria_id)
    const titulo = [cat?.nome, mochila.nome, mochila.numero ? `Nº ${mochila.numero}` : ''].filter(Boolean).join(' - ')
    const hoje = new Date().toLocaleDateString('pt-BR')

    const formatarData = (v: string) =>
      new Date(v + 'T00:00:00').toLocaleDateString('pt-BR')

    const rows = (data || []).map(med => {
      const lotes = (med.lotes || []) as { numero_lote: string; validade?: string | null; quantidade: number }[]
      let lotesStr = ''
      let validadesStr = ''
      if (lotes.length === 0) {
        lotesStr = ''
        validadesStr = ''
      } else if (lotes.length === 1) {
        lotesStr = lotes[0].numero_lote
        validadesStr = lotes[0].validade ? formatarData(lotes[0].validade) : ''
      } else {
        lotesStr = lotes.map(l => `(${l.quantidade}) ${l.numero_lote}`).join(' | ')
        validadesStr = lotes.map(l => l.validade ? formatarData(l.validade) : '').join(' | ')
      }
      const nome = med.alto_risco ? `${med.nome} [ALTO RISCO]` : med.nome
      return `<tr>
        <td style="text-align:center;font-weight:bold">${med.qtde_estoque}</td>
        <td>${nome}</td>
        <td>${lotesStr}</td>
        <td>${validadesStr}</td>
      </tr>`
    }).join('')

    const itemCount = (data || []).length
    const fontSize = itemCount > 30 ? '7pt' : itemCount > 20 ? '8pt' : '9pt'

    const html = `<!DOCTYPE html><html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  @page { size: A4 portrait; margin: 8mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: ${fontSize}; }
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th, td { border: 1px solid #000; padding: 2px 4px; word-wrap: break-word; overflow-wrap: break-word; }
  .row-title th { background: #e8e8e8; }
  .row-date td { background: #f5f5f5; }
  .row-header th { background: #d0d0d0; font-weight: bold; text-align: center; }
  .col-qtde { width: 1px; white-space: nowrap; text-align: center; }
  .col-desc { }
  .col-lote { width: 28%; }
  .col-valid { width: 16%; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>
<table>
  <thead>
    <tr class="row-title">
      <th colspan="3" style="text-align:left;font-size:10pt">${titulo}</th>
      <th style="text-align:center">LOTE</th>
    </tr>
    <tr class="row-date">
      <td colspan="4">Data: ${hoje}</td>
    </tr>
    <tr class="row-header">
      <th class="col-qtde">Qtde Estoque</th>
      <th class="col-desc">Descri&ccedil;&atilde;o do Item</th>
      <th class="col-lote">Lote</th>
      <th class="col-valid">Validade</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=820,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
  }

  const irParaInicio = () => {
    setCategoriaAtiva(null)
    setMochilaAtiva(null)
    setFiltroGlobal(null)
  }

  const handleSelectCategoria = (cat: Categoria) => {
    setCategoriaAtiva(cat)
    setMochilaAtiva(null)
    setFiltroGlobal(null)
  }

  const handleSelectMochila = (m: Mochila) => {
    setMochilaAtiva(m)
    setFiltroGlobal(null)
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

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const limite10 = new Date(hoje.getTime() + 10 * 24 * 60 * 60 * 1000)
  const globalVencidos = lotesAlerta.filter(l => l.validade && new Date(l.validade) < hoje)
  const globalAVencer = lotesAlerta.filter(l => {
    if (!l.validade) return false
    const d = new Date(l.validade)
    return d >= hoje && d <= limite10
  })
  const contagemVencidos = new Set(globalVencidos.map(l => l.medicamento_id)).size
  const contagemAVencer = new Set(globalAVencer.map(l => l.medicamento_id)).size

  const salvarLacre = async (novoNumero: string, novaCor: string) => {
    if (!mochilaAtiva) return
    await supabase.from('mochilas').update({
      numero_lacre: novoNumero || null,
      cor_lacre: novaCor,
    }).eq('id', mochilaAtiva.id)
    setMochilaAtiva({ ...mochilaAtiva, numero_lacre: novoNumero || null, cor_lacre: novaCor })
  }

  const mochilasDaCategoria = categoriaAtiva ? (mochilasPorCategoria[categoriaAtiva.id] || []) : []
  const ordemProxima = mochilasDaCategoria.reduce((max, m) => Math.max(max, m.ordem), 0) + 1
  const outrasMovilas = mochilaAtiva
    ? categorias.flatMap(cat =>
        (mochilasPorCategoria[cat.id] || [])
          .filter(m => m.id !== mochilaAtiva.id)
          .map(m => ({ id: m.id, nome: m.nome, cor: m.cor, categoria_id: m.categoria_id, catNome: cat.nome }))
      )
    : []

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        categorias={categorias}
        mochilasPorCategoria={mochilasPorCategoria}
        categoriaAtiva={categoriaAtiva}
        mochilaAtiva={mochilaAtiva}
        onSelectCategoria={handleSelectCategoria}
        onSelectMochila={handleSelectMochila}
        onIrParaInicio={irParaInicio}
        onExportarMochila={exportarCSVMochila}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
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
                <LacreTag
                  key={mochilaAtiva.id}
                  numero={mochilaAtiva.numero_lacre ?? ''}
                  cor={(mochilaAtiva.cor_lacre as 'azul' | 'amarelo' | 'vermelho') || 'azul'}
                  onSave={salvarLacre}
                />
              </>
            ) : filtroGlobal ? (
              <>
                <h2 className="text-xl font-bold text-gray-900">
                  {filtroGlobal === 'vencidos' ? '🔴 Vencidos' : '🟠 A vencer em 10 dias'}
                </h2>
                <p className="text-sm text-gray-500">Filtro global — todas as mochilas</p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {categoriaAtiva?.icone} {categoriaAtiva?.nome || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500">
                  {categoriaAtiva ? `${mochilasDaCategoria.length} mochilas` : 'Visão geral crítica'}
                </p>
              </>
            )}
          </div>

          {/* Badges globais — sempre visíveis */}
          {contagemVencidos > 0 && (
            <button
              onClick={() => { setCategoriaAtiva(null); setMochilaAtiva(null); setFiltroGlobal('vencidos') }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-semibold transition-all border ${
                filtroGlobal === 'vencidos'
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
              }`}
            >
              <AlertTriangle size={11} />
              {contagemVencidos} vencido{contagemVencidos > 1 ? 's' : ''}
            </button>
          )}
          {contagemAVencer > 0 && (
            <button
              onClick={() => { setCategoriaAtiva(null); setMochilaAtiva(null); setFiltroGlobal('a_vencer') }}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full font-semibold transition-all border ${
                filtroGlobal === 'a_vencer'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200'
              }`}
            >
              <Clock size={11} />
              {contagemAVencer} a vencer
            </button>
          )}

          {/* Indicador local da mochila ativa */}
          {mochilaAtiva && totalVencidos > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-200">
              <AlertTriangle size={10} />
              {totalVencidos} aqui
            </span>
          )}
          {mochilaAtiva && totalAlertas > 0 && (
            <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full border border-yellow-200">
              <AlertTriangle size={10} />
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
                onClick={() => exportarCSVMochila(mochilaAtiva)}
                className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                title="Exportar CSV"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                onClick={() => imprimirMochila(mochilaAtiva)}
                className="flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                title="Imprimir em uma folha"
              >
                <Printer size={16} />
                Imprimir
              </button>
              <button
                onClick={() => setMostrarTransferirMochila(true)}
                className="flex items-center gap-2 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
                title="Transferir todos os itens para outra mochila"
              >
                <ArrowLeftRight size={16} />
                Transferir
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

          {filtroGlobal && (
            <button
              onClick={() => setFiltroGlobal(null)}
              className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
              title="Fechar filtro"
            >
              <X size={16} />
            </button>
          )}
        </header>

        {/* Filtros (só quando mochila selecionada e sem filtro global) */}
        {mochilaAtiva && !filtroGlobal && (
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
              <span className="ml-auto text-gray-400 hidden sm:block">Use o botão Lotes para registrar lotes por medicamento</span>
            </div>
          </>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Vista de alertas globais */}
          {filtroGlobal !== null && (
            <VistaAlertasGlobais
              lotes={filtroGlobal === 'vencidos' ? globalVencidos : globalAVencer}
              tipo={filtroGlobal}
              onFechar={() => setFiltroGlobal(null)}
            />
          )}

          {/* Dashboard inicial */}
          {filtroGlobal === null && !categoriaAtiva && (
            <DashboardInicial
              lotesAlerta={lotesAlerta}
              semEstoqueCount={semEstoqueCount}
              carregando={carregandoAlertas}
              onFiltrar={(tipo) => setFiltroGlobal(tipo)}
            />
          )}

          {/* Categoria sem mochila: grid de mochilas */}
          {filtroGlobal === null && categoriaAtiva && !mochilaAtiva && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Selecione uma mochila</h3>
                <button
                  onClick={() => setMostrarNovaMochila(true)}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus size={14} />
                  Nova Mochila
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {mochilasDaCategoria.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-full">Nenhuma mochila cadastrada nesta categoria.</p>
                )}
                {mochilasDaCategoria.map((m) => (
                  <div
                    key={m.id}
                    className="relative group bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all"
                  >
                    <button
                      onClick={() => handleSelectMochila(m)}
                      className="text-left w-full"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Backpack size={20} className="text-blue-600" />
                        {m.cor && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <span
                              className="w-3 h-3 rounded-full border border-black/10"
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
                    <button
                      onClick={(e) => { e.stopPropagation(); setMochilaParaEditar(m) }}
                      className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar mochila"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mochila selecionada: lista de medicamentos */}
          {filtroGlobal === null && mochilaAtiva && carregando && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw size={24} className="animate-spin mr-2" />
              Carregando...
            </div>
          )}
          {filtroGlobal === null && mochilaAtiva && !carregando && medicamentosFiltrados.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Package size={32} className="mb-2" />
              <p className="text-sm">Nenhum item nesta mochila</p>
              <button onClick={() => setMostrarModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                + Adicionar primeiro item
              </button>
            </div>
          )}
          {filtroGlobal === null && mochilaAtiva && !carregando && medicamentosFiltrados.map((med) => (
            <MedicamentoRow
              key={med.id}
              medicamento={med}
              onUpdate={() => carregarMedicamentos(mochilaAtiva.id)}
              outrasMovilas={outrasMovilas}
              onMovido={() => carregarMedicamentos(mochilaAtiva.id)}
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

      {mostrarNovaMochila && categoriaAtiva && (
        <NovaMochilaModal
          categoriaId={categoriaAtiva.id}
          categoriaNome={categoriaAtiva.nome}
          ordemProxima={ordemProxima}
          onClose={() => setMostrarNovaMochila(false)}
          onSalvo={carregarCategoriasEMochilas}
        />
      )}

      {mochilaParaEditar && categoriaAtiva && (
        <EditarMochilaModal
          mochila={mochilaParaEditar}
          categoriaNome={categoriaAtiva.nome}
          onClose={() => setMochilaParaEditar(null)}
          onSalvo={carregarCategoriasEMochilas}
          onApagado={carregarCategoriasEMochilas}
        />
      )}

      {mostrarTransferirMochila && mochilaAtiva && (
        <TransferirMochilaModal
          mochilaOrigem={mochilaAtiva}
          categorias={categorias}
          mochilasPorCategoria={mochilasPorCategoria}
          onClose={() => setMostrarTransferirMochila(false)}
          onTransferido={async () => {
            await carregarCategoriasEMochilas()
            await carregarMedicamentos(mochilaAtiva.id)
          }}
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
