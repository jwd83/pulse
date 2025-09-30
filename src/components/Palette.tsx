import React, { useState, useCallback } from 'react'
import { ComponentType, CustomComponentDefinition } from '../model'
import { loadCustomComponent } from '../utils/custom-components'

export const Palette: React.FC<{ 
  onAdd: (t: ComponentType, customDef?: CustomComponentDefinition) => void
  onStatus?: (message: string) => void
}> = ({ onAdd, onStatus }) => {
  const [customComponents, setCustomComponents] = useState<CustomComponentDefinition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const items: ComponentType[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'TOGGLE', 'CLOCK', 'LED']
  
  const handleLoadCustomComponent = useCallback(async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      const result = await loadCustomComponent()
      if (result.success) {
        // Check if component with same name already exists
        const existingIndex = customComponents.findIndex(c => c.name === result.definition.name)
        
        let updatedComponents: CustomComponentDefinition[]
        if (existingIndex !== -1) {
          // Replace existing component
          updatedComponents = [...customComponents]
          updatedComponents[existingIndex] = result.definition
          onStatus?.(`Updated custom component "${result.definition.name}"`)
        } else {
          // Add new component
          updatedComponents = [...customComponents, result.definition]
          onStatus?.(`Added custom component "${result.definition.name}"`)
        }
        
        setCustomComponents(updatedComponents)
      } else {
        if (result.error !== 'File selection cancelled') {
          onStatus?.(`Failed to load custom component: ${result.error}`)
        }
      }
    } catch (error) {
      onStatus?.(`Failed to load custom component: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }, [customComponents, isLoading, onStatus])
  
  return (
    <div>
      <h3 className="font-semibold mb-2">Palette</h3>
      
      {/* Standard Components */}
      <div className="grid gap-2 mb-4">
        {items.map((it) => (
          <button key={it} onClick={() => onAdd(it)} className="border rounded p-2 text-sm text-left hover:bg-gray-50">
            {it}
          </button>
        ))}
      </div>
      
      {/* Custom Components Section */}
      <div className="border-t pt-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Custom Parts</h4>
          <button
            onClick={handleLoadCustomComponent}
            disabled={isLoading}
            className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load Part'}
          </button>
        </div>
        
        {customComponents.length > 0 ? (
          <div className="grid gap-2 mb-2">
            {customComponents.map((customDef) => (
              <button 
                key={customDef.name} 
                onClick={() => onAdd('CUSTOM', customDef)}
                className="border rounded p-2 text-sm text-left bg-purple-50 hover:bg-purple-100 border-purple-200"
                title={`Inputs: ${customDef.inputPins.length}, Outputs: ${customDef.outputPins.length}`}
              >
                <div className="font-medium">{customDef.name}</div>
                <div className="text-xs text-gray-600">
                  {customDef.inputPins.length}→{customDef.outputPins.length}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-2">No custom parts loaded</p>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-3">Click components to add to canvas. Load JSON files as custom parts.</p>
    </div>
  )
}
