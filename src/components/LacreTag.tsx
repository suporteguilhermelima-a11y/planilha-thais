'use client'

import { useState } from 'react'

type Cor = 'azul' | 'amarelo' | 'vermelho'

const COR_HEX: Record<Cor, string> = {
  azul: '#2060d8',
  amarelo: '#d49200',
  vermelho: '#d42020',
}

type Props = {
  numero: string
  cor: Cor
  onSave: (numero: string, cor: Cor) => void
}

export default function LacreTag({ numero, cor, onSave }: Props) {
  const [val, setVal] = useState(numero)
  const [corAtual, setCorAtual] = useState<Cor>(cor)

  const handleBlur = () => onSave(val, corAtual)
  const handleCorChange = (novaCor: Cor) => {
    setCorAtual(novaCor)
    onSave(val, novaCor)
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-gray-500 font-medium shrink-0">Lacre</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={7}
        value={val}
        onChange={e => setVal(e.target.value.replace(/\D/g, '').slice(0, 7))}
        onBlur={handleBlur}
        onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        placeholder="0000000"
        className="border border-gray-200 rounded-lg px-2.5 py-1 text-sm font-mono w-28 focus:outline-none focus:border-blue-400 bg-white"
      />
      <div className="flex items-center gap-1">
        {(['vermelho', 'azul', 'amarelo'] as Cor[]).map(op => (
          <button
            key={op}
            onClick={() => handleCorChange(op)}
            title={op.charAt(0).toUpperCase() + op.slice(1)}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              corAtual === op ? 'border-gray-600 scale-110' : 'border-transparent opacity-60'
            }`}
            style={{ background: COR_HEX[op] }}
          />
        ))}
      </div>
    </div>
  )
}
