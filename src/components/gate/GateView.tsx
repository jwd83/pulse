import React, { useState, useRef, useEffect } from 'react'
import { Component } from '../../model'
import { getCustomComponentInputPorts, getCustomComponentOutputPorts } from '../../utils/custom-components'
import { getPortPosition } from '../../utils/port-positions'

export type PortEvent = { comp: Component; portName: string; portType: 'in' | 'out'; x: number; y: number }

export const GateView: React.FC<{ comp: Component; onMove: (dx: number, dy: number) => void; onDelete: () => void; onPortDown?: (pe: PortEvent) => void; onPortUp?: (pe?: PortEvent) => void; onUpdate?: (patch: Partial<Component>) => void; signals?: Record<string, boolean> }> = ({ comp, onMove, onDelete, onPortDown, onPortUp, onUpdate, signals = {} }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{x:number,y:number}|null>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true)
    start.current = { x: e.clientX, y: e.clientY }
    e.stopPropagation()
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !start.current) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    start.current = { x: e.clientX, y: e.clientY }
    onMove(dx, dy)
  }

  const onMouseUp = () => {
    setDragging(false)
    start.current = null
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onLeave = () => setDragging(false)
    el.addEventListener('mouseleave', onLeave)
    return () => el.removeEventListener('mouseleave', onLeave)
  }, [])

  const emitPort = (name: string, type: 'in'|'out', ev: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;

    // Use the actual port position calculation for consistency
    const portPos = getPortPosition(comp, name, type === 'in' ? 'input' : 'output')
    
    const pe: PortEvent = {
      comp,
      portName: name,
      portType: type,
      x: portPos.x,
      y: portPos.y,
    };

    if (type === 'out') onPortDown?.(pe);
    else onPortUp?.(pe);
  }

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ left: comp.x, top: comp.y }}
      className="absolute w-20 h-12 bg-gray-100 border rounded shadow flex items-center justify-center cursor-move select-none">
      <div className="text-sm font-medium">
        {comp.type === 'CUSTOM' && comp.customDef ? comp.customDef.name : comp.type}
      </div>
      {comp.type === 'LED' && (
        <div className={`absolute left-1/2 -translate-x-1/2 bottom-0 w-3 h-3 rounded-full ${signals[comp.id+':OUT'] ? 'bg-red-600' : 'bg-black'}`} />
      )}
      {comp.type === 'TOGGLE' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newState = !comp.props.state;
            onUpdate?.({ props: { ...comp.props, state: newState } });
          }}
          className="absolute left-1/2 -translate-x-1/2 bottom-0 text-xs bg-yellow-300 px-1 rounded"
        >
          Flip
        </button>
      )}
      <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-400 text-white rounded-full text-xs w-5 h-5">×</button>

      {/* Input ports */}
      {comp.type === 'CUSTOM' && comp.customDef ? (
        // Custom component inputs
        getCustomComponentInputPorts(comp.customDef).map((portName, index) => {
          const portPos = getPortPosition(comp, portName, 'input')
          // Convert absolute position to relative position within component
          const relativeTop = portPos.y - comp.y - 6 // Adjust for port visual center (6px = half of 12px port height)
          
          return (
            <div
              key={portName}
              onMouseDown={(e)=>{ e.stopPropagation(); emitPort(portName,'in',e)}}
              className="absolute left-0 w-3 h-3 rounded-full"
              style={{ 
                top: relativeTop,
                background: signals[comp.id + ':' + portName] ? 'red' : 'black' 
              }}
            />
          )
        })
      ) : comp.type === 'LED' ? (
        // LED has single centered input
        (() => {
          const portPos = getPortPosition(comp, 'IN', 'input')
          const relativeTop = portPos.y - comp.y - 6
          return (
            <div
              onMouseDown={(e)=>{ e.stopPropagation(); emitPort('IN','in',e)}}
              className="absolute left-0 w-3 h-3 rounded-full"
              style={{ 
                top: relativeTop,
                background: signals[comp.id+':IN'] ? 'red' : 'black' 
              }}
            />
          )
        })()
      ) : !['TOGGLE', 'CLOCK'].includes(comp.type) && (
        // Standard logic gates
        <>
          {(() => {
            const portPos = getPortPosition(comp, 'A', 'input')
            const relativeTop = portPos.y - comp.y - 6
            return (
              <div
                onMouseDown={(e)=>{ e.stopPropagation(); emitPort('A','in',e)}}
                className="absolute left-0 w-3 h-3 rounded-full"
                style={{ 
                  top: relativeTop,
                  background: signals[comp.id+':A'] ? 'red' : 'black' 
                }}
              />
            )
          })()
          }
          {comp.type !== 'NOT' && (() => {
            const portPos = getPortPosition(comp, 'B', 'input')
            const relativeTop = portPos.y - comp.y - 6
            return (
              <div
                onMouseDown={(e)=>{ e.stopPropagation(); emitPort('B','in',e)}}
                className="absolute left-0 w-3 h-3 rounded-full"
                style={{ 
                  top: relativeTop,
                  background: signals[comp.id+':B'] ? 'red' : 'black' 
                }}
              />
            )
          })()}
        </>
      )}

      {/* Output port - all components except LED have this */}
      {comp.type === 'CUSTOM' && comp.customDef ? (
        // Custom component outputs
        getCustomComponentOutputPorts(comp.customDef).map((portName, index) => {
          const portPos = getPortPosition(comp, portName, 'output')
          const relativeTop = portPos.y - comp.y - 6
          
          return (
            <div
              key={portName}
              onMouseDown={(e) => {
                e.stopPropagation();
                emitPort(portName, 'out', e);
              }}
              className="absolute right-0 w-3 h-3 rounded-full"
              style={{ 
                top: relativeTop,
                background: signals[comp.id + ':' + portName] ? 'red' : 'black' 
              }}
            />
          )
        })
      ) : comp.type !== 'LED' && (() => {
        // Standard single output
        const portPos = getPortPosition(comp, 'OUT', 'output')
        const relativeTop = portPos.y - comp.y - 6
        return (
          <div
            onMouseDown={(e) => {
              e.stopPropagation();
              emitPort('OUT', 'out', e);
            }}
            className="absolute right-0 w-3 h-3 rounded-full"
            style={{ 
              top: relativeTop,
              background: signals[comp.id+':OUT'] ? 'red' : 'black' 
            }}
          />
        )
      })()}
    </div>
  )
}
