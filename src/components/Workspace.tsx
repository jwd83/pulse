import React, { useRef, useEffect, useState } from 'react'
import { CircuitModel, Component, Wire } from '../model'
import { GateView, PortEvent } from './gate/GateView'

export const Workspace: React.FC<{ model: CircuitModel; setModel: (m: CircuitModel) => void; signals?: Record<string, boolean> }> = ({ model, setModel, signals = {} }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [connecting, setConnecting] = useState<{ from?: { compId: string; port: string; x: number; y: number }; to?: { x: number; y: number } }>(() => ({}))

  useEffect(() => {
    // keep components within bounds
    const n = model.components.map((c) => ({ ...c }))
    let changed = false
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      for (const c of n) {
        const w = 80
        const h = 48
        const nx = Math.max(0, Math.min(c.x, rect.width - w))
        const ny = Math.max(0, Math.min(c.y, rect.height - h))
        if (nx !== c.x || ny !== c.y) {
          c.x = nx
          c.y = ny
          changed = true
        }
      }
    }
    if (changed) setModel({ ...model, components: n })
  }, [model, setModel])

  const startConnection = (pe: PortEvent) => {
    if (pe.portType !== 'out') return
    console.log('Starting connection from:', pe);
    setConnecting({ from: { compId: pe.comp.id, port: pe.portName, x: pe.x, y: pe.y }, to: { x: pe.x, y: pe.y } })
  }

  const endConnection = (pe?: PortEvent) => {
    if (!connecting.from) return setConnecting({})
    // if ended on an input port, create wire
    if (pe && pe.portType === 'in') {
      // avoid duplicates
      const exists = model.wires.find((w) => w.from.compId === connecting.from!.compId && w.from.port === connecting.from!.port && w.to.compId === pe.comp.id && w.to.port === pe.portName)
      if (!exists) {
        const id = 'w' + Math.random().toString(36).slice(2, 9)
        const w: Wire = { id, from: { compId: connecting.from.compId, port: connecting.from.port }, to: { compId: pe.comp.id, port: pe.portName } }
        setModel({ ...model, wires: [...model.wires, w] })
      }
    }
    setConnecting({})
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!connecting.from) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return

    // Update connecting.to with clamped coordinates to ensure it stays within bounds
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

    setConnecting((c) => ({ from: c.from, to: { x, y } }))
  }

  // wire rendering: simple Manhattan routing between port positions (absolute within workspace)
  const renderWirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const mx1 = x1 + (x2 - x1) * 0.25 // First control point
    const mx2 = x1 + (x2 - x1) * 0.75 // Second control point
    return `M ${x1} ${y1} C ${mx1} ${y1}, ${mx2} ${y2}, ${x2} ${y2}` // Smooth cubic Bezier curve
  }

  useEffect(() => {
    if (connecting.from && connecting.to) {
      console.log('Dragging wire:', connecting);
    }
  }, [connecting]);

  return (
    <div ref={ref} onPointerMove={onPointerMove} className="relative bg-white h-full border rounded" style={{ minHeight: 400 }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {model.wires.map((w) => {
          // resolve port positions from components
          const from = model.components.find((c) => c.id === w.from.compId)
          const to = model.components.find((c) => c.id === w.to.compId)
          if (!from || !to) return null
          // calculate port positions
          const fx = from.x + 80 // output always on right
          const fy = from.y + 24 // vertical center
          const tx = to.x
          let ty = to.y + 24 // default to center for NOT and LED
          if (to.type !== 'NOT' && to.type !== 'LED') {
            // two inputs: top and bottom third
            ty = w.to.port === 'A' ? to.y + 12 : to.y + 36
          }
          return <path key={w.id} d={renderWirePath(fx, fy, tx, ty)} stroke="#111" strokeWidth={2} fill="none" />
        })}

        {connecting.from && connecting.to && (
          <path
            d={renderWirePath(connecting.from.x, connecting.from.y, connecting.to.x, connecting.to.y)}
            stroke="#0077ff"
            strokeWidth={2}
            fill="none"
            strokeDasharray="6 4"
          />
        )}
      </svg>

      {model.components.map((c) => (
        <GateView key={c.id} comp={c}
          onMove={(dx, dy) => {
            // clamp while moving inside container
            const rect = ref.current?.getBoundingClientRect()
            let nx = c.x + dx
            let ny = c.y + dy
            if (rect) {
              nx = Math.max(0, Math.min(nx, rect.width - 80))
              ny = Math.max(0, Math.min(ny, rect.height - 48))
            }
            setModel({ ...model, components: model.components.map((cc) => cc.id === c.id ? { ...cc, x: nx, y: ny } : cc) })
          }}
          onDelete={() => setModel({ ...model, components: model.components.filter((cc) => cc.id !== c.id) })}
          onUpdate={(patch) => setModel({ ...model, components: model.components.map((cc) => cc.id === c.id ? { ...cc, ...patch } : cc) })}
          signals={signals}
          onPortDown={startConnection}
          onPortUp={endConnection}
        />
      ))}
    </div>
  )
}
