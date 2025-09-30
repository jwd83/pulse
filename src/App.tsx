import React, { useState, useCallback, useEffect } from 'react'
import { Workspace } from './components/Workspace'
import { Palette } from './components/Palette'
import { CircuitModel, ComponentType, CustomComponentDefinition } from './model'
import { evaluate } from './engine'
import { downloadDesign, loadDesign } from './utils/json'

export default function App() {
  const [model, setModel] = useState<CircuitModel>(() => ({ components: [], wires: [] }))
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const reset = useCallback(() => setModel({ components: [], wires: [] }), [])
  const [signals, setSignals] = useState<Record<string, boolean>>({})

  // Show status messages temporarily
  const showStatus = useCallback((message: string, duration = 3000) => {
    setStatusMessage(message)
    setTimeout(() => setStatusMessage(''), duration)
  }, [])

  const handleSave = useCallback(() => {
    try {
      if (model.components.length === 0 && model.wires.length === 0) {
        showStatus('Nothing to save - design is empty')
        return
      }
      
      const timestamp = new Date().toLocaleString().replace(/[/:,]/g, '-')
      const filename = `pulse-design-${timestamp}.json`
      downloadDesign(model, filename)
      showStatus('Design saved successfully!')
    } catch (error) {
      showStatus(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }, [model, showStatus])

  const handleLoad = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const result = await loadDesign()
      if (result.success) {
        setModel(result.model)
        const name = result.metadata.name ? ` "${result.metadata.name}"` : ''
        showStatus(`Design${name} loaded successfully!`)
      } else {
        if (result.error !== 'File selection cancelled') {
          showStatus(`Failed to load: ${result.error}`)
        }
      }
    } catch (error) {
      showStatus(`Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, showStatus])

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
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSave} 
            className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded transition-colors"
            disabled={isLoading}
          >
            Save Design
          </button>
          <button 
            onClick={handleLoad} 
            className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Design'}
          </button>
          <button 
            onClick={reset} 
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition-colors"
            disabled={isLoading}
          >
            New / Reset
          </button>
        </div>
        {statusMessage && (
          <div className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm">
            {statusMessage}
          </div>
        )}
      </header>
      <div className="flex flex-1">
        <aside className="w-60 border-r p-3">
          <Palette 
            onAdd={(type, customDef) => {
              // add new component at default location
              const id = 'c' + Math.random().toString(36).slice(2, 9)
              const comp = {
                id,
                type,
                x: 120,
                y: 120,
                props: {},
                ...(customDef ? { customDef } : {})
              }
              setModel((m) => ({ ...m, components: [...m.components, comp] }))
            }}
            onStatus={showStatus}
          />
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
