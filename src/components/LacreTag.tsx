'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const FILTRO: Record<Cor, string> = {
  vermelho: 'none',
  amarelo:  'hue-rotate(58deg) saturate(1.1)',
  azul:     'hue-rotate(222deg) saturate(0.95) brightness(1.08)',
}

// Cor que cobre o número original da foto (aproxima a superfície da tag filtrada)
const OVERLAY_COR: Record<Cor, string> = {
  vermelho: 'rgba(178, 22, 22, 0.92)',
  amarelo:  'rgba(185, 135, 0, 0.92)',
  azul:     'rgba(18, 52, 168, 0.92)',
}

const COR_DOT: Record<Cor, string> = {
  vermelho: '#d42020',
  amarelo:  '#f0c000',
  azul:     '#2060d8',
}

// Imagem 1536×1024 → renderizada 300×200px
// Área do número na foto: ~left=5%, top=58%, width=54%, height=30%
const NUM = { left: '5%', top: '58%', width: '54%', height: '30%' }

type Props = {
  numero: string
  cor: Cor
  onSave: (numero: string, cor: Cor) => void
}

export default function LacreTag({ numero, cor, onSave }: Props) {
  const [val, setVal] = useState(numero)
  const [corAtual, setCorAtual] = useState<Cor>(cor)
  const [dropdown, setDropdown] = useState(false)

  const handleBlur = () => onSave(val, corAtual)
  const handleCorChange = (novaCor: Cor) => {
    setCorAtual(novaCor)
    setDropdown(false)
    onSave(val, novaCor)
  }

  return (
    <div className="flex items-center gap-3 mt-1" style={{ userSelect: 'none' }}>

      {/* Container com dimensões explícitas para o position:absolute funcionar */}
      <div style={{ position: 'relative', width: 300, height: 200, flexShrink: 0 }}>

        {/* Foto do lacre com filtro de cor */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/lacre.png"
          alt="lacre"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            filter: FILTRO[corAtual],
            transition: 'filter 0.25s ease',
          }}
        />

        {/* Retângulo que apaga o número original da foto */}
        <div style={{
          position: 'absolute',
          left: NUM.left, top: NUM.top, width: NUM.width, height: NUM.height,
          background: OVERLAY_COR[corAtual],
          borderRadius: 6,
          transition: 'background 0.25s ease',
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
            color: 'rgba(255,255,255,0.90)',
            fontSize: '18px',
            fontWeight: '800',
            fontFamily: '"Trebuchet MS", system-ui, sans-serif',
            letterSpacing: '4px',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
            caretColor: 'white',
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
    </div>
  )
}
