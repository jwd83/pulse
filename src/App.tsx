import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Workspace } from './components/Workspace'
import { Palette } from './components/Palette'
import { CircuitModel, ComponentType, CustomComponentDefinition } from './model'
import { evaluate, updateStatefulComponents } from './engine'
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

  const prevSignalsRef = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const id = setInterval(() => {
      setModel(currentModel => {
        // Store signals BEFORE any updates to get true previous state
        const previousSignals = evaluate(currentModel);
        
        // First, update clocks based on time (they don't depend on signals)
        const clockUpdatedModel = {
          ...currentModel,
          components: currentModel.components.map(c => {
            if (c.type === 'CLOCK') {
              // Apply clock update logic inline
              const now = Date.now();
              const period = 500;
              const halfPeriod = period / 2;
              const timeInCycle = now % period;
              const shouldBeHigh = timeInCycle < halfPeriod;
              
              if (!!c.props.state !== shouldBeHigh) {
                console.log(`Clock ${c.id}: Toggle from ${c.props.state} to ${shouldBeHigh} (time=${timeInCycle})`);
                return { ...c, props: { ...c.props, state: shouldBeHigh } };
              }
            }
            return c;
          })
        };
        
        // Evaluate signals with updated clocks
        const currentSignals = evaluate(clockUpdatedModel)
        
        // Update registers based on signal transitions
        const finalModel = {
          ...clockUpdatedModel,
          components: clockUpdatedModel.components.map(c => {
            if (c.type === 'REGISTER') {
              const clkWire = clockUpdatedModel.wires.find(w => w.to.compId === c.id && w.to.port === 'CLK');
              const enWire = clockUpdatedModel.wires.find(w => w.to.compId === c.id && w.to.port === 'EN');
              const dWire = clockUpdatedModel.wires.find(w => w.to.compId === c.id && w.to.port === 'D');
              
              const clkId = clkWire ? clkWire.from.compId + ':' + clkWire.from.port : undefined;
              const enId = enWire ? enWire.from.compId + ':' + enWire.from.port : undefined;
              const dId = dWire ? dWire.from.compId + ':' + dWire.from.port : undefined;
              
              const clk = clkId ? currentSignals[clkId] : false;
              const prevClk = clkId ? previousSignals[clkId] : false;
              const en = enId ? currentSignals[enId] : true;
              const d = dId ? currentSignals[dId] : false;
              
              console.log(`Register ${c.id}: Clock signal ${clkId}: current=${clk}, previous=${prevClk}`);
              
              // Capture data on rising edge (when clock goes from low to high)
              if (clk && !prevClk && en) {
                console.log(`Register ${c.id}: Rising edge! D=${d} -> Setting state from ${c.props.state} to ${d}`);
                return { ...c, props: { ...c.props, state: d } };
              }
              console.log(`Register ${c.id}: No trigger. CLK=${clk}/${prevClk} (rising_edge=${clk && !prevClk}), EN=${en}, D=${d}, currentState=${c.props.state}`);
            }
            return c;
          })
        };
        
        // Re-evaluate signals with final model (to show register Q outputs)
        const finalSignals = evaluate(finalModel);
        
        // Update the ref with current signals for next cycle
        prevSignalsRef.current = currentSignals
        setSignals(finalSignals)
        return finalModel
      })
    }, 60)
    return () => clearInterval(id)
  }, [])

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
              
              // Initialize props based on component type
              let props: Record<string, any> = {}
              if (type === 'TOGGLE' || type === 'CLOCK') {
                props.state = false // Initialize toggles and clocks to false
              } else if (type === 'REGISTER') {
                props.state = false // Initialize register to false (Q output starts at 0)
              }
              
              const comp = {
                id,
                type,
                x: 120,
                y: 120,
                props,
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
