import React, { useState, useCallback, useEffect } from 'react'
import { Workspace } from './components/Workspace'
import { Palette } from './components/Palette'
import { CircuitModel, ComponentType } from './model'
import { evaluate } from './engine'

export default function App() {
  const [model, setModel] = useState<CircuitModel>(() => ({ components: [], wires: [] }))

  const reset = useCallback(() => setModel({ components: [], wires: [] }), [])
  const [signals, setSignals] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const id = setInterval(() => {
      setSignals(evaluate(model))
    }, 60)
    return () => clearInterval(id)
  }, [model])

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-gray-800 text-white p-3 flex items-center">
        <h1 className="font-semibold mr-4">Pulse — Digital Logic Sandbox</h1>
        <button onClick={reset} className="bg-red-500 px-3 py-1 rounded">New / Reset</button>
      </header>
      <div className="flex flex-1">
        <aside className="w-60 border-r p-3">
          <Palette onAdd={(type) => {
            // add new component at default location
            const id = 'c' + Math.random().toString(36).slice(2, 9)
            const comp = {
              id,
              type,
              x: 120,
              y: 120,
              props: {},
            }
            setModel((m) => ({ ...m, components: [...m.components, comp] }))
          }} />
          <div className="mt-4">
            <h4 className="text-sm font-semibold">Signals</h4>
            <div className="text-xs text-gray-600">
              {Object.entries(signals).slice(0,20).map(([k,v])=> (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className={`font-mono ${v? 'text-green-600':'text-gray-400'}`}>{v? '1':'0'}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 p-2">
          <Workspace model={model} setModel={setModel} signals={signals} />
        </main>
      </div>
    </div>
  )
}
