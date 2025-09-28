import React, { useState, useRef, useEffect } from 'react'
import { Component } from '../../model'

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

    // Calculate port position relative to the canvas
    const x = type === 'out' ? r.right : r.left;
    const y = r.top + (type === 'out' ? r.height / 2 : ev.clientY - r.top);

    const pe: PortEvent = {
      comp,
      portName: name,
      portType: type,
      x: x - (document.querySelector('#root')?.getBoundingClientRect().left || 0),
      y: y - (document.querySelector('#root')?.getBoundingClientRect().top || 0),
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
      <div className="text-sm font-medium">{comp.type}</div>
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
      <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="absolute -top-2 -right-2 bg-red-400 text-white rounded-full text-xs w-5 h-5">×</button>

      {/* Input ports */}
      {/* LED has single centered input, gates have one or two inputs */}
      {comp.type === 'LED' ? (
        <div
          onMouseDown={(e)=>{ e.stopPropagation(); emitPort('IN','in',e)}}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{ background: signals[comp.id+':IN'] ? 'red' : 'black' }}
        />
      ) : !['TOGGLE', 'CLOCK'].includes(comp.type) && (
        <>
          <div
            onMouseDown={(e)=>{ e.stopPropagation(); emitPort('A','in',e)}}
            className={`absolute left-0 w-3 h-3 rounded-full ${comp.type === 'NOT' ? 'top-1/2 -translate-y-1/2' : 'top-3'}`}
            style={{ background: signals[comp.id+':A'] ? 'red' : 'black' }}
          />
          {comp.type !== 'NOT' && (
            <div
              onMouseDown={(e)=>{ e.stopPropagation(); emitPort('B','in',e)}}
              className="absolute left-0 bottom-3 w-3 h-3 rounded-full"
              style={{ background: signals[comp.id+':B'] ? 'red' : 'black' }}
            />
          )}
        </>
      )}

      {/* Output port - all components except LED have this */}
      {comp.type !== 'LED' && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            emitPort('OUT', 'out', e);
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
          style={{ background: signals[comp.id+':OUT'] ? 'red' : 'black' }}
        />
      )}
    </div>
  )
}
