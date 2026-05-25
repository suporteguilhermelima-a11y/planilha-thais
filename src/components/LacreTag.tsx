'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR: Record<Cor, { base: string; light: string; dark: string; deeper: string; numColor: string }> = {
  azul: {
    base: '#2060d8', light: '#6090f8', dark: '#0e2e90', deeper: '#081c5c',
    numColor: 'rgba(170, 210, 255, 0.88)',
  },
  amarelo: {
    base: '#f0c000', light: '#ffe050', dark: '#b08800', deeper: '#705500',
    numColor: 'rgba(255, 248, 160, 0.88)',
  },
  vermelho: {
    base: '#d42020', light: '#f06060', dark: '#9a1010', deeper: '#5e0808',
    numColor: 'rgba(255, 168, 168, 0.88)',
  },
}

type Props = {
  numero: string
  cor: Cor
  onSave: (numero: string, cor: Cor) => void
}

export default function LacreTag({ numero, cor, onSave }: Props) {
  const [val, setVal] = useState(numero)
  const [corAtual, setCorAtual] = useState<Cor>(cor)
  const [dropdown, setDropdown] = useState(false)
  const c = COR[corAtual]

  const handleBlur = () => onSave(val, corAtual)
  const handleCorChange = (novaCor: Cor) => {
    setCorAtual(novaCor)
    setDropdown(false)
    onSave(val, novaCor)
  }

  // ── Proporções fiéis à foto ────────────────────────────────
  // viewBox 340 × 195
  // Tag ocupa ~56% da largura, argola ~29%

  const TX = 5, TY = 118, TW = 192, TH = 56, TR = 22
  const TCY = TY + TH / 2  // 146

  // Rebite: extremo direito da tag
  const RCX = 182, RCY = TCY, RR = 9

  // Argola: circular, superior direita — diâmetro ≈ 2× altura da tag
  const LCX = 260, LCY = 58, LR = 45, LSW = 12

  // Painel rebaixado para o número
  const PX = TX + 14, PY = TY + 10, PW = TW - 52, PH = TH - 20, PR = 7

  // Fita conectora: sai do rebite, sobe até o fundo da argola
  const STRAP = `M 175 138 C 186 116, 208 104, 224 100
                 L 230 110 C 214 116, 194 132, 184 150 Z`

  return (
    <div className="flex items-center gap-3 mt-1" style={{ userSelect: 'none' }}>
      <div style={{ lineHeight: 0 }}>
        <svg width="280" height="160" viewBox="0 0 340 195" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`tg-${corAtual}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.light} stopOpacity="0.38" />
              <stop offset="28%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            <linearGradient id={`lg-${corAtual}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="45%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            <radialGradient id={`rg-${corAtual}`} cx="36%" cy="30%" r="72%">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="100%" stopColor={c.deeper} />
            </radialGradient>
            <filter id="ts" x="-10%" y="-20%" width="130%" height="158%">
              <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#000" floodOpacity="0.25"/>
            </filter>
            <filter id="ls" x="-25%" y="-25%" width="155%" height="155%">
              <feDropShadow dx="1" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.22"/>
            </filter>
          </defs>

          {/* ── Argola (atrás de tudo) ──────────────────────── */}
          <g filter="url(#ls)">
            {/* Corpo principal da argola */}
            <circle cx={LCX} cy={LCY} r={LR}
              fill="none" stroke={`url(#lg-${corAtual})`} strokeWidth={LSW}/>
            {/* Dentes serrilhados — borda externa */}
            <circle cx={LCX} cy={LCY} r={LR + 7}
              fill="none" stroke={c.dark} strokeWidth="3.5"
              strokeDasharray="5 4" strokeLinecap="butt" opacity="0.42"/>
            {/* Dentes serrilhados — borda interna */}
            <circle cx={LCX} cy={LCY} r={LR - 7}
              fill="none" stroke={c.dark} strokeWidth="3"
              strokeDasharray="5 4" strokeLinecap="butt" opacity="0.30"/>
            {/* Sombra interna */}
            <circle cx={LCX} cy={LCY} r={LR - 5}
              fill="none" stroke={c.deeper} strokeWidth="2" opacity="0.20"/>
            {/* Brilho superior */}
            <circle cx={LCX} cy={LCY} r={LR}
              fill="none" stroke="white" strokeWidth="3.5" opacity="0.14"
              strokeDasharray={`${LR * 1.9} 9999`}
              strokeDashoffset={`${-LR * 0.28}`}/>
          </g>

          {/* ── Fita conectora ────────────────────────────────── */}
          <path d={STRAP} fill={c.base}/>
          <path d="M 175 138 C 186 116, 208 104, 224 100"
            fill="none" stroke={c.dark} strokeWidth="2.5" opacity="0.35"/>
          <path d="M 184 150 C 194 132, 214 116, 230 110"
            fill="none" stroke={c.light} strokeWidth="1.5" opacity="0.18"/>
          {[0, 1, 2].map(i => (
            <line key={i}
              x1={181 + i * 13} y1={133 - i * 11}
              x2={183 + i * 13} y2={126 - i * 11}
              stroke={c.deeper} strokeWidth="2" opacity="0.28"/>
          ))}

          {/* ── Corpo da tag ──────────────────────────────────── */}
          <g filter="url(#ts)">
            <rect x={TX} y={TY} width={TW} height={TH} rx={TR}
              fill={`url(#tg-${corAtual})`}/>
          </g>
          {/* Reflexo superior */}
          <rect x={TX + TR} y={TY + 6} width={TW - TR * 2} height={4} rx="2"
            fill="white" opacity="0.12"/>

          {/* ── Painel rebaixado ──────────────────────────────── */}
          <rect x={PX} y={PY} width={PW} height={PH} rx={PR}
            fill={c.dark} opacity="0.16"/>
          <rect x={PX} y={PY} width={PW} height={PH} rx={PR}
            fill="none" stroke={c.deeper} strokeWidth="1.5" opacity="0.32"/>
          <rect x={PX + 1.5} y={PY + 1.5} width={PW - 3} height={PH - 3} rx={PR - 1}
            fill="none" stroke={c.light} strokeWidth="1" opacity="0.16"/>

          {/* ── Input do número ───────────────────────────────── */}
          <foreignObject x={PX + 4} y={PY + 1} width={PW - 8} height={PH - 2}>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <div xmlns="http://www.w3.org/1999/xhtml"
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  background: 'transparent', border: 'none', outline: 'none',
                  width: '100%', textAlign: 'center',
                  color: c.numColor,
                  fontSize: '17px', fontWeight: '700',
                  fontFamily: '"Trebuchet MS", system-ui, sans-serif',
                  letterSpacing: '3px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.45)',
                  caretColor: 'white', cursor: 'text',
                }}
              />
            </div>
          </foreignObject>

          {/* ── Rebite ────────────────────────────────────────── */}
          <circle cx={RCX} cy={RCY} r={RR + 6} fill={c.deeper} opacity="0.25"/>
          <circle cx={RCX} cy={RCY} r={RR} fill={`url(#rg-${corAtual})`}/>
          <circle cx={RCX - 3} cy={RCY - 3} r={3} fill="white" opacity="0.24"/>
        </svg>
      </div>

      {/* ── Seletor de cor ─────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setDropdown(d => !d)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.base }}/>
          {corAtual.charAt(0).toUpperCase() + corAtual.slice(1)}
          <span className="text-gray-400 text-[10px]">▾</span>
        </button>
        {dropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden min-w-[100px]">
            {(['azul', 'amarelo', 'vermelho'] as Cor[]).map(op => (
              <button key={op} onClick={() => handleCorChange(op)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${corAtual === op ? 'font-semibold bg-gray-50' : ''}`}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR[op].base }}/>
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
