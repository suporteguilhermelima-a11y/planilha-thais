'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR: Record<Cor, { bg: string; mid: string; dark: string; text: string }> = {
  azul:     { bg: '#93c5fd', mid: '#3b82f6', dark: '#1d4ed8', text: '#1e3a8a' },
  amarelo:  { bg: '#fde68a', mid: '#f59e0b', dark: '#b45309', text: '#78350f' },
  vermelho: { bg: '#fca5a5', mid: '#ef4444', dark: '#b91c1c', text: '#7f1d1d' },
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

  const display = val.padStart(7, '0')

  return (
    <div className="flex items-center gap-3 mt-1">
      {/* Lacre visual */}
      <div className="flex items-center select-none" title="Clique no número para editar">
        {/* Tag body */}
        <div
          className="relative flex items-center justify-center rounded-xl shadow-md px-4 py-2"
          style={{
            background: `linear-gradient(160deg, ${c.bg} 0%, ${c.mid} 55%, ${c.dark} 100%)`,
            minWidth: '108px',
            height: '44px',
          }}
        >
          {/* Brilho plástico */}
          <div
            className="absolute top-1.5 left-3 rounded-full opacity-40"
            style={{ width: '44px', height: '6px', background: 'white' }}
          />
          {/* Número editável */}
          <input
            type="text"
            inputMode="numeric"
            maxLength={7}
            value={val}
            onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 7))}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="0000000"
            className="w-full bg-transparent border-none outline-none text-center font-mono font-bold tracking-widest cursor-text z-10"
            style={{ color: c.text, fontSize: '15px', textShadow: '0 1px 1px rgba(255,255,255,0.3)' }}
          />
        </div>

        {/* Conector */}
        <div
          className="h-3 w-4 shrink-0"
          style={{ background: `linear-gradient(to right, ${c.dark}, ${c.mid})` }}
        />

        {/* Loop / argola */}
        <div
          className="rounded-full shrink-0"
          style={{
            width: '32px',
            height: '32px',
            border: `8px solid ${c.dark}`,
            background: 'transparent',
            boxShadow: `inset 0 2px 3px rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.3)`,
          }}
        />
      </div>

      {/* Seletor de cor */}
      <div className="relative">
        <button
          onClick={() => setDropdown((d) => !d)}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.mid }} />
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
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COR[op].mid }} />
                {op.charAt(0).toUpperCase() + op.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
