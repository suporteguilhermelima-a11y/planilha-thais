'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR: Record<Cor, { light: string; base: string; dark: string; deeper: string }> = {
  azul:     { light: '#90c4ff', base: '#2563eb', dark: '#1740a8', deeper: '#0f2872' },
  amarelo:  { light: '#ffe97a', base: '#e8a800', dark: '#a86e00', deeper: '#6b4400' },
  vermelho: { light: '#ff7070', base: '#dc2020', dark: '#9b1515', deeper: '#660d0d' },
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

  /* Proporcões do SVG total: 340 x 130 */
  /* Tag: x=0..215, cy=65 (altura 74), pill rx=37 */
  /* Rivet em x≈207 */
  /* Alça: elipse centrada em cx=290 cy=65, rx=46 ry=58 */

  const TAG_W = 215
  const TAG_H = 74
  const TAG_RX = 37
  const TAG_Y  = (130 - TAG_H) / 2          // 28
  const TAG_CY = TAG_Y + TAG_H / 2          // 65

  const RIVET_CX = TAG_W - 8
  const RIVET_CY = TAG_CY
  const RIVET_R  = 13

  const LOOP_CX = 290
  const LOOP_CY = 65
  const LOOP_RX = 46
  const LOOP_RY = 58
  const LOOP_SW = 13  // stroke-width da alça

  return (
    <div className="flex items-center gap-3 mt-1">
      {/* ── Lacre SVG ── */}
      <div className="relative" style={{ lineHeight: 0 }}>
        <svg
          width="340"
          height="130"
          viewBox="0 0 340 130"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente corpo da tag */}
            <linearGradient id={`tagGrad-${corAtual}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={c.light}  stopOpacity="1" />
              <stop offset="40%"  stopColor={c.base}   stopOpacity="1" />
              <stop offset="100%" stopColor={c.deeper}  stopOpacity="1" />
            </linearGradient>
            {/* Gradiente rivet */}
            <radialGradient id={`rivetGrad-${corAtual}`} cx="35%" cy="30%" r="65%">
              <stop offset="0%"   stopColor={c.light} />
              <stop offset="100%" stopColor={c.deeper} />
            </radialGradient>
            {/* Sombra da tag */}
            <filter id="tagShadow" x="-8%" y="-15%" width="120%" height="140%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
            </filter>
            {/* Sombra da alça */}
            <filter id="loopShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* ── Alça (strap loop) ── */}
          <g filter="url(#loopShadow)">
            {/* Alça base — preenchimento sólido */}
            <ellipse
              cx={LOOP_CX} cy={LOOP_CY}
              rx={LOOP_RX} ry={LOOP_RY}
              fill="none"
              stroke={c.base}
              strokeWidth={LOOP_SW + 4}
            />
            {/* Alça principal com gradiente simulado */}
            <ellipse
              cx={LOOP_CX} cy={LOOP_CY}
              rx={LOOP_RX} ry={LOOP_RY}
              fill="none"
              stroke={c.dark}
              strokeWidth={LOOP_SW}
            />
            {/* Realce lateral esquerdo da alça */}
            <ellipse
              cx={LOOP_CX} cy={LOOP_CY}
              rx={LOOP_RX} ry={LOOP_RY}
              fill="none"
              stroke={c.light}
              strokeWidth="3"
              strokeOpacity="0.4"
              strokeDasharray="6 8"
            />
            {/* Brilho topo da alça */}
            <ellipse
              cx={LOOP_CX} cy={LOOP_CY - LOOP_RY + 10}
              rx={LOOP_RX * 0.55} ry="6"
              fill={c.light}
              opacity="0.35"
            />
          </g>

          {/* Conector tag → alça */}
          <rect
            x={TAG_W - 14} y={TAG_CY - 10}
            width={LOOP_CX - LOOP_RX - (TAG_W - 14) + 4}
            height={20} rx="4"
            fill={c.dark}
          />

          {/* ── Corpo da tag ── */}
          <g filter="url(#tagShadow)">
            <rect
              x="2" y={TAG_Y}
              width={TAG_W} height={TAG_H}
              rx={TAG_RX}
              fill={`url(#tagGrad-${corAtual})`}
            />
          </g>

          {/* Realce superior (brilho plástico) */}
          <rect
            x={TAG_RX} y={TAG_Y + 7}
            width={TAG_W - TAG_RX * 2} height="8"
            rx="4"
            fill="white" opacity="0.32"
          />

          {/* Rivet */}
          <circle
            cx={RIVET_CX} cy={RIVET_CY} r={RIVET_R + 3}
            fill={c.deeper} opacity="0.6"
          />
          <circle
            cx={RIVET_CX} cy={RIVET_CY} r={RIVET_R}
            fill={`url(#rivetGrad-${corAtual})`}
          />
          <circle
            cx={RIVET_CX - 3} cy={RIVET_CY - 3} r="4"
            fill="white" opacity="0.35"
          />

          {/* ── Input via foreignObject ── */}
          <foreignObject
            x="16" y={TAG_Y + 8}
            width={TAG_W - 48} height={TAG_H - 16}
          >
            <div
              /* @ts-expect-error xmlns needed for foreignObject */
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <input
                type="text"
                inputMode="numeric"
                maxLength={7}
                value={val}
                onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 7))}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                placeholder="0000000"
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.93)',
                  fontSize: '22px',
                  fontWeight: '800',
                  fontFamily: 'ui-monospace, "Courier New", monospace',
                  letterSpacing: '5px',
                  textShadow: '0 2px 6px rgba(0,0,0,0.55), 0 -1px 0 rgba(255,255,255,0.15)',
                  caretColor: 'white',
                  cursor: 'text',
                }}
              />
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* ── Seletor de cor ── */}
      <div className="relative">
        <button
          onClick={() => setDropdown((d) => !d)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.base }} />
          {corAtual.charAt(0).toUpperCase() + corAtual.slice(1)}
          <span className="text-gray-400 text-[10px]">▾</span>
        </button>
        {dropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden min-w-[100px]">
            {(['azul', 'amarelo', 'vermelho'] as Cor[]).map((op) => (
              <button
                key={op}
                onClick={() => handleCorChange(op)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${corAtual === op ? 'font-semibold bg-gray-50' : ''}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR[op].base }} />
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
