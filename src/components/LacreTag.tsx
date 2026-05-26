'use client'

import { useState, useRef } from 'react'
import { Save, Loader2, Check, AlertCircle } from 'lucide-react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR_DOT: Record<Cor, string> = {
  vermelho: '#FF2C2C',
  amarelo:  '#f0c000',
  azul:     '#2060D8',
}

// PNGs pre-tingidos via PIL (HSV remap) — cores exatas, sem filtro CSS
const IMG_SRC: Record<Cor, string> = {
  amarelo:  '/lacre.png',
  vermelho: '/lacre-vermelho.png',
  azul:     '/lacre-azul.png',
}

// Cor do recesso (amostrada no centro de cada PNG tingido) — bate com o entorno
const OVERLAY: Record<Cor, string> = {
  amarelo:  'rgb(251, 235, 80)',
  vermelho: 'rgb(254, 44, 44)',
  azul:     'rgb(32, 95, 216)',
}

// Imagem 1320×661 → renderizada 240px de largura (≈ 120px de altura)
// Bbox real do "123456" na foto: x=[25.2%, 43.3%], y=[58.2%, 66.4%]
// Adiciona margem pequena pra cobrir kerning/antialiasing
const NUM = { left: '23.5%', top: '56%', width: '21%', height: '12%' }

type Props = {
  numero: string
  cor: Cor
  onSave: (numero: string, cor: Cor) => Promise<void>
}

export default function LacreTag({ numero, cor, onSave }: Props) {
  const [val, setVal] = useState(numero)
  const [corAtual, setCorAtual] = useState<Cor>(cor)
  const [dropdown, setDropdown] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(false)
  const salvoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const executarSave = async (v: string, c: Cor) => {
    if (salvando) return
    setSalvando(true)
    setSalvo(false)
    setErro(false)
    try {
      await onSave(v, c)
      setSalvo(true)
      if (salvoTimer.current) clearTimeout(salvoTimer.current)
      salvoTimer.current = setTimeout(() => setSalvo(false), 2000)
    } catch {
      setErro(true)
      if (salvoTimer.current) clearTimeout(salvoTimer.current)
      salvoTimer.current = setTimeout(() => setErro(false), 3000)
    } finally {
      setSalvando(false)
    }
  }

  const handleBlur = () => executarSave(val, corAtual)

  const handleCorChange = (novaCor: Cor) => {
    setCorAtual(novaCor)
    setDropdown(false)
    executarSave(val, novaCor)
  }

  return (
    <div className="flex items-center gap-3 mt-1" style={{ userSelect: 'none' }}>

      {/* Container: inline-block + relative abraça a altura natural da imagem */}
      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0, flexShrink: 0 }}>

        {/* Foto em fluxo normal — define a altura real do container */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={IMG_SRC[corAtual]}
          alt="lacre"
          width={240}
          style={{ display: 'block' }}
        />

        {/* Retângulo que apaga o número original da foto */}
        <div style={{
          position: 'absolute',
          left: NUM.left, top: NUM.top, width: NUM.width, height: NUM.height,
          background: OVERLAY[corAtual],
          borderRadius: 4,
        }}/>

        {/* Input sobreposto exatamente onde estão os números */}
        <input
          type="text"
          inputMode="numeric"
          maxLength={7}
          value={val}
          onChange={e => setVal(e.target.value.replace(/\D/g, '').slice(0, 7))}
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          placeholder="0000000"
          style={{
            position: 'absolute',
            left: NUM.left, top: NUM.top, width: NUM.width, height: NUM.height,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            textAlign: 'center',
            color: '#000',
            fontSize: '11px',
            fontWeight: '700',
            fontFamily: 'system-ui, "Segoe UI", sans-serif',
            letterSpacing: '0px',
            caretColor: '#000',
            cursor: 'text',
          }}
        />
      </div>

      {/* Seletor de cor */}
      <div className="relative">
        <button
          onClick={() => setDropdown(d => !d)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_DOT[corAtual] }}/>
          {corAtual.charAt(0).toUpperCase() + corAtual.slice(1)}
          <span className="text-gray-400 text-[10px]">▾</span>
        </button>
        {dropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden min-w-[110px]">
            {(['vermelho', 'amarelo', 'azul'] as Cor[]).map(op => (
              <button key={op} onClick={() => handleCorChange(op)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${corAtual === op ? 'font-semibold bg-gray-50' : ''}`}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_DOT[op] }}/>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botão salvar */}
      <button
        onMouseDown={e => e.preventDefault()}
        onClick={() => executarSave(val, corAtual)}
        disabled={salvando}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border shadow-sm transition-colors disabled:opacity-50 ${
          salvo
            ? 'border-green-300 bg-green-50 text-green-700'
            : erro
            ? 'border-red-300 bg-red-50 text-red-700'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        {salvando
          ? <Loader2 size={13} className="animate-spin" />
          : salvo
          ? <Check size={13} />
          : erro
          ? <AlertCircle size={13} />
          : <Save size={13} />}
        {salvando ? 'Salvando…' : salvo ? 'Salvo!' : erro ? 'Erro!' : 'Salvar'}
      </button>
    </div>
  )
}
