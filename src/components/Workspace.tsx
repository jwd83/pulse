import React, { useRef, useEffect, useState } from 'react'
import { CircuitModel, Wire } from '../model'
import { GateView, PortEvent } from './gate/GateView'

export const Workspace: React.FC<{ model: CircuitModel; setModel: (m: CircuitModel) => void; signals?: Record<string, boolean> }> = ({ model, setModel, signals = {} }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const latestModelRef = useRef<CircuitModel>(model)
  const [connecting, setConnecting] = useState<{ from?: { compId: string; port: string; x: number; y: number }; to?: { x: number; y: number } }>(() => ({}))
  const [hoveredWire, setHoveredWire] = useState<string | null>(null)

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
    if (pe.portType !== 'out') return;
    const rect = ref.current?.getBoundingClientRect();
    const x = rect ? pe.x - rect.left : pe.x;
    const y = rect ? pe.y - rect.top : pe.y;
    setConnecting({ from: { compId: pe.comp.id, port: pe.portName, x, y }, to: { x, y } })
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

  const deleteWire = (wireId: string) => {
    setModel({ ...model, wires: model.wires.filter(w => w.id !== wireId) })
    setHoveredWire(null)
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


  // simple clock driver: toggle CLOCK components once per second
  useEffect(() => {
    latestModelRef.current = model
  }, [model])

  // simple clock driver: toggle CLOCK components once per second
  useEffect(() => {
    const id = setInterval(() => {
      const m = latestModelRef.current
      const comps = m.components.map((c) => {
        if (c.type === 'CLOCK') {
          return { ...c, props: { ...c.props, state: !c.props.state } }
        }
        return c
      })
      setModel({ ...m, components: comps })
    }, 1000)
    return () => clearInterval(id)
  }, [setModel])

  return (
    <div ref={ref} onPointerMove={onPointerMove} className="relative bg-white h-full border rounded" style={{ minHeight: 400 }}>
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
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
          // color wire based on the signal carried by the source component's output port
          const sig = signals[from.id + ':' + w.from.port]
          const isHovered = hoveredWire === w.id
          const color = sig ? 'red' : 'black'
          const strokeWidth = isHovered ? 4 : 2
          const opacity = isHovered ? 0.8 : 1
          const pathElement = renderWirePath(fx, fy, tx, ty)
          
          return (
            <g key={w.id}>
              {/* Invisible thicker path for easier clicking */}
              <path
                d={pathElement}
                stroke="transparent"
                strokeWidth={12}
                fill="none"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredWire(w.id)}
                onMouseLeave={() => setHoveredWire(null)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  deleteWire(w.id)
                }}
              />
              {/* Visible wire */}
              <path
                d={pathElement}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                opacity={opacity}
                style={{ pointerEvents: 'none' }}
              />
            </g>
          )
        })}

        {connecting.from && connecting.to && (() => {
          const fromComp = model.components.find((c) => c.id === connecting.from!.compId)
          const sig = fromComp ? signals[fromComp.id + ':' + connecting.from!.port] : false
          const color = sig ? 'red' : 'black'
          return (
            <path
              d={renderWirePath(connecting.from.x, connecting.from.y, connecting.to.x, connecting.to.y)}
              stroke={color}
              strokeWidth={2}
              fill="none"
              strokeDasharray="6 4"
            />
          )
        })()}
      </svg>
      {/** derive a UI-level signals map that includes input port signals copied from the source output signals */}
      {(() => {
        const uiSignals: Record<string, boolean> = { ...signals }
        for (const w of model.wires) {
          const fromKey = w.from.compId + ':' + w.from.port
          const toKey = w.to.compId + ':' + w.to.port
          uiSignals[toKey] = !!signals[fromKey]
        }
        return model.components.map((c) => (
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
          signals={uiSignals}
          onPortDown={startConnection}
          onPortUp={endConnection}
        />
        ))
      })()}
    </div>
  )
}
