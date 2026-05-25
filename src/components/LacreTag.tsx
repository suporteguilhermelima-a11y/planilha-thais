'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR: Record<Cor, { base: string; light: string; dark: string; deeper: string; numColor: string }> = {
  azul: {
    base: '#2060d8', light: '#5090f8', dark: '#133aa0', deeper: '#0b2468',
    numColor: 'rgba(190, 220, 255, 0.90)',
  },
  amarelo: {
    base: '#d49200', light: '#f0b830', dark: '#9b6a00', deeper: '#604000',
    numColor: 'rgba(255, 248, 185, 0.90)',
  },
  vermelho: {
    base: '#d42020', light: '#f05555', dark: '#9b1515', deeper: '#5e0d0d',
    numColor: 'rgba(255, 205, 205, 0.90)',
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

  // ── Layout (viewBox 310 × 190) ─────────────────────────────
  // Tag: y=128..186, cx=5..203, rx=24
  const TX = 5, TY = 128, TW = 198, TH = 58, TR = 24
  const TCY = TY + TH / 2        // 157
  // Rivet: right end of tag
  const RCX = 196, RCY = TCY, RR = 11
  // Loop ellipse (above tag)
  const LCX = 254, LCY = 55, LRX = 47, LRY = 56, LSW = 14
  // ── Strap band: filled path from rivet up to loop ──────────
  // Left edge:  exits tag at (187,146) → curves to (224,104)
  // Right edge: exits tag at (197,148) → curves to (233,112)
  const STRAP =
    `M 187 146 C 196 122, 216 110, 224 104
     L 232 112 C 223 118, 205 132, 197 150 Z`

  return (
    <div className="flex items-center gap-3 mt-1" style={{ userSelect: 'none' }}>
      <div style={{ lineHeight: 0 }}>
        <svg width="290" height="178" viewBox="0 0 310 190" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Tag gradient (flat with subtle top-light) */}
            <linearGradient id={`tg-${corAtual}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.light}  stopOpacity="0.55" />
              <stop offset="25%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            {/* Rivet radial */}
            <radialGradient id={`rg-${corAtual}`} cx="35%" cy="30%" r="70%">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="100%" stopColor={c.deeper} />
            </radialGradient>
            {/* Loop gradient (left lighter, right darker) */}
            <linearGradient id={`lg-${corAtual}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="50%"  stopColor={c.base} />
              <stop offset="100%" stopColor={c.dark} />
            </linearGradient>
            {/* Drop shadows */}
            <filter id="ts" x="-10%" y="-20%" width="130%" height="160%">
              <feDropShadow dx="1" dy="6" stdDeviation="7" floodColor="#000" floodOpacity="0.38"/>
            </filter>
            <filter id="ls" x="-25%" y="-25%" width="155%" height="155%">
              <feDropShadow dx="2" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.32"/>
            </filter>
          </defs>

          {/* ── Loop (drawn first → behind tag) ─────────────── */}
          <g filter="url(#ls)">
            {/* Outer serrated ring (dark shadow base) */}
            <ellipse cx={LCX} cy={LCY} rx={LRX + 10} ry={LRY + 10}
              fill="none" stroke={c.deeper} strokeWidth="5"
              strokeDasharray="6 5" strokeLinecap="round" opacity="0.55"/>
            {/* Main loop stroke */}
            <ellipse cx={LCX} cy={LCY} rx={LRX} ry={LRY}
              fill="none" stroke={`url(#lg-${corAtual})`} strokeWidth={LSW}/>
            {/* Inner shadow line */}
            <ellipse cx={LCX} cy={LCY} rx={LRX - 7} ry={LRY - 7}
              fill="none" stroke={c.deeper} strokeWidth="3" opacity="0.40"/>
            {/* Outer ribbed texture */}
            <ellipse cx={LCX} cy={LCY} rx={LRX + 8} ry={LRY + 8}
              fill="none" stroke={c.dark} strokeWidth="3"
              strokeDasharray="5 6" strokeLinecap="round" opacity="0.55"/>
            {/* Top highlight arc */}
            <ellipse cx={LCX} cy={LCY} rx={LRX} ry={LRY}
              fill="none" stroke="white" strokeWidth="4" opacity="0.20"
              strokeDasharray={`${LRX * 2.2} 9999`}
              strokeDashoffset={`${-LRX * 0.2}`}/>
          </g>

          {/* ── Strap connector (behind tag, above loop) ─────── */}
          <path d={STRAP} fill={c.base}/>
          {/* Strap edges / shadow */}
          <path d={`M 187 146 C 196 122, 216 110, 224 104`}
            fill="none" stroke={c.dark} strokeWidth="2.5" opacity="0.45"/>
          <path d={`M 197 150 C 205 132, 223 118, 232 112`}
            fill="none" stroke={c.light} strokeWidth="1.5" opacity="0.30"/>
          {/* Strap ribbed lines (simulating serrations on visible section) */}
          {[0,1,2].map(i => (
            <line key={i}
              x1={191 + i * 3} y1={135 + i * 4}
              x2={193 + i * 3} y2={127 + i * 4}
              stroke={c.deeper} strokeWidth="1.5" opacity="0.40"/>
          ))}

          {/* ── Tag body (covers lower part of strap/loop) ───── */}
          <g filter="url(#ts)">
            <rect x={TX} y={TY} width={TW} height={TH} rx={TR}
              fill={`url(#tg-${corAtual})`}/>
          </g>
          {/* Top highlight sheen */}
          <rect x={TX + TR} y={TY + 7} width={TW - TR * 2} height={7} rx="3"
            fill="white" opacity="0.20"/>
          {/* Bottom shadow strip */}
          <rect x={TX + TR} y={TY + TH - 10} width={TW - TR * 2} height={5} rx="2"
            fill={c.deeper} opacity="0.28"/>

          {/* ── Rivet ─────────────────────────────────────────── */}
          <circle cx={RCX} cy={RCY} r={RR + 5} fill={c.deeper} opacity="0.40"/>
          <circle cx={RCX} cy={RCY} r={RR} fill={`url(#rg-${corAtual})`}/>
          <circle cx={RCX - 3} cy={RCY - 3} r={4} fill="white" opacity="0.28"/>

          {/* ── Number input ────────────────────────────────────── */}
          <foreignObject x={TX + 14} y={TY + 10} width={TW - 60} height={TH - 20}>
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
                  fontSize: '20px', fontWeight: '800',
                  fontFamily: 'ui-monospace, "Courier New", monospace',
                  letterSpacing: '4px',
                  textShadow: '0 2px 5px rgba(0,0,0,0.50)',
                  caretColor: 'white', cursor: 'text',
                }}
              />
            </div>
          </foreignObject>
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
