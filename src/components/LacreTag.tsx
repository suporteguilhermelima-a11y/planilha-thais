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

  // ── Layout (viewBox 380 × 228) ─────────────────────────────
  // Tag: horizontal left
  const TX = 8, TY = 140, TW = 208, TH = 62, TR = 28
  const TCY = TY + TH / 2            // 171

  // Rivet: right end of tag
  const RCX = 200, RCY = TCY, RR = 12

  // Loop: large oval upper-right
  const LCX = 298, LCY = 72, LRX = 66, LRY = 72, LSW = 20

  // Recessed number panel
  const PX = TX + 16, PY = TY + 12, PW = TW - 58, PH = TH - 24, PR = 8

  // Strap band from rivet up to loop
  const STRAP = `M 190 162 C 212 136, 246 118, 268 110
                 L 280 124 C 254 134, 220 156, 204 180 Z`

  return (
    <div className="flex items-center gap-3 mt-1" style={{ userSelect: 'none' }}>
      <div style={{ lineHeight: 0 }}>
        <svg width="300" height="184" viewBox="0 0 380 228" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`tg-${corAtual}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.light} stopOpacity="0.40" />
              <stop offset="30%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            <linearGradient id={`lg-${corAtual}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="46%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            <radialGradient id={`rg-${corAtual}`} cx="36%" cy="30%" r="72%">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="100%" stopColor={c.deeper} />
            </radialGradient>
            <filter id="tag-shadow" x="-10%" y="-18%" width="128%" height="150%">
              <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000" floodOpacity="0.26"/>
            </filter>
            <filter id="loop-shadow" x="-22%" y="-22%" width="148%" height="148%">
              <feDropShadow dx="2" dy="6" stdDeviation="7" floodColor="#000" floodOpacity="0.24"/>
            </filter>
          </defs>

          {/* ── Loop ─────────────────────────────────────────── */}
          <g filter="url(#loop-shadow)">
            {/* Outer serrated teeth */}
            <ellipse cx={LCX} cy={LCY} rx={LRX + 12} ry={LRY + 12}
              fill="none" stroke={c.dark} strokeWidth="7"
              strokeDasharray="6 5" strokeLinecap="butt" opacity="0.52"/>
            {/* Main loop body */}
            <ellipse cx={LCX} cy={LCY} rx={LRX} ry={LRY}
              fill="none" stroke={`url(#lg-${corAtual})`} strokeWidth={LSW}/>
            {/* Inner serrated teeth */}
            <ellipse cx={LCX} cy={LCY} rx={LRX - 12} ry={LRY - 12}
              fill="none" stroke={c.dark} strokeWidth="6"
              strokeDasharray="6 5" strokeLinecap="butt" opacity="0.38"/>
            {/* Inner wall shadow */}
            <ellipse cx={LCX} cy={LCY} rx={LRX - 9} ry={LRY - 9}
              fill="none" stroke={c.deeper} strokeWidth="2.5" opacity="0.22"/>
            {/* Top highlight */}
            <ellipse cx={LCX} cy={LCY} rx={LRX} ry={LRY}
              fill="none" stroke="white" strokeWidth="4" opacity="0.15"
              strokeDasharray={`${LRX * 2.0} 9999`}
              strokeDashoffset={`${-LRX * 0.28}`}/>
          </g>

          {/* ── Strap connector ───────────────────────────────── */}
          <path d={STRAP} fill={c.base}/>
          <path d="M 190 162 C 212 136, 246 118, 268 110"
            fill="none" stroke={c.dark} strokeWidth="3" opacity="0.36"/>
          <path d="M 204 180 C 220 156, 254 134, 280 124"
            fill="none" stroke={c.light} strokeWidth="2" opacity="0.18"/>
          {[0, 1, 2, 3].map(i => (
            <line key={i}
              x1={196 + i * 14} y1={153 - i * 12}
              x2={198 + i * 14} y2={145 - i * 12}
              stroke={c.deeper} strokeWidth="2.5" opacity="0.32"/>
          ))}

          {/* ── Tag body ──────────────────────────────────────── */}
          <g filter="url(#tag-shadow)">
            <rect x={TX} y={TY} width={TW} height={TH} rx={TR}
              fill={`url(#tg-${corAtual})`}/>
          </g>
          {/* Top face sheen */}
          <rect x={TX + TR} y={TY + 6} width={TW - TR * 2} height={5} rx="2"
            fill="white" opacity="0.13"/>

          {/* ── Recessed number panel ─────────────────────────── */}
          <rect x={PX} y={PY} width={PW} height={PH} rx={PR}
            fill={c.dark} opacity="0.18"/>
          {/* Shadow border */}
          <rect x={PX} y={PY} width={PW} height={PH} rx={PR}
            fill="none" stroke={c.deeper} strokeWidth="1.5" opacity="0.35"/>
          {/* Inner highlight edge (bottom-right) */}
          <rect x={PX + 1.5} y={PY + 1.5} width={PW - 3} height={PH - 3} rx={PR - 1}
            fill="none" stroke={c.light} strokeWidth="1" opacity="0.18"/>

          {/* ── Number input ──────────────────────────────────── */}
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
                  fontSize: '18px', fontWeight: '700',
                  fontFamily: '"Trebuchet MS", system-ui, sans-serif',
                  letterSpacing: '3px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.45)',
                  caretColor: 'white', cursor: 'text',
                }}
              />
            </div>
          </foreignObject>

          {/* ── Rivet ─────────────────────────────────────────── */}
          <circle cx={RCX} cy={RCY} r={RR + 7} fill={c.deeper} opacity="0.28"/>
          <circle cx={RCX} cy={RCY} r={RR} fill={`url(#rg-${corAtual})`}/>
          <circle cx={RCX - 4} cy={RCY - 4} r={4} fill="white" opacity="0.26"/>
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
