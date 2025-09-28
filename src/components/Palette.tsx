import React from 'react'
import { ComponentType } from '../model'

export const Palette: React.FC<{ onAdd: (t: ComponentType) => void }> = ({ onAdd }) => {
  const items: ComponentType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'TOGGLE', 'CLOCK', 'LED']
  return (
    <div>
      <h3 className="font-semibold mb-2">Palette</h3>
      <div className="grid gap-2">
        {items.map((it) => (
          <button key={it} onClick={() => onAdd(it)} className="border rounded p-2 text-sm text-left">
            {it}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">Drag components onto the canvas (click to add at default pos).</p>
    </div>
  )
}
