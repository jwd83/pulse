import { CircuitModel, Component, Wire, ComponentType } from '../model'

export interface SerializedDesign {
  version: string
  name?: string
  description?: string
  timestamp: string
  model: CircuitModel
}

const CURRENT_VERSION = '1.0.0'

/**
 * Validates that a component has all required fields
 */
function isValidComponent(comp: any): comp is Component {
  return (
    comp &&
    typeof comp.id === 'string' &&
    typeof comp.type === 'string' &&
    typeof comp.x === 'number' &&
    typeof comp.y === 'number' &&
    typeof comp.props === 'object' &&
    comp.props !== null
  )
}

/**
 * Validates that a wire has all required fields
 */
function isValidWire(wire: any): wire is Wire {
  return (
    wire &&
    typeof wire.id === 'string' &&
    wire.from &&
    typeof wire.from.compId === 'string' &&
    typeof wire.from.port === 'string' &&
    wire.to &&
    typeof wire.to.compId === 'string' &&
    typeof wire.to.port === 'string'
  )
}

/**
 * Validates that a circuit model has all required fields and valid structure
 */
function isValidCircuitModel(model: any): model is CircuitModel {
  return (
    model &&
    Array.isArray(model.components) &&
    Array.isArray(model.wires) &&
    model.components.every(isValidComponent) &&
    model.wires.every(isValidWire)
  )
}

/**
 * Serializes a CircuitModel to a JSON-serializable object
 */
export function serializeDesign(
  model: CircuitModel,
  name?: string,
  description?: string
): SerializedDesign {
  return {
    version: CURRENT_VERSION,
    name,
    description,
    timestamp: new Date().toISOString(),
    model: {
      components: model.components.map(comp => ({ ...comp })), // shallow clone
      wires: model.wires.map(wire => ({ ...wire })) // shallow clone
    }
  }
}

/**
 * Deserializes a JSON object back to a CircuitModel
 */
export function deserializeDesign(data: any): {
  success: true
  model: CircuitModel
  metadata: { name?: string; description?: string; version: string; timestamp: string }
} | {
  success: false
  error: string
} {
  try {
    // Basic structure validation
    if (!data || typeof data !== 'object') {
      return { success: false, error: 'Invalid JSON structure' }
    }

    if (!data.version || typeof data.version !== 'string') {
      return { success: false, error: 'Missing or invalid version field' }
    }

    if (!data.timestamp || typeof data.timestamp !== 'string') {
      return { success: false, error: 'Missing or invalid timestamp field' }
    }

    if (!data.model) {
      return { success: false, error: 'Missing model field' }
    }

    // Validate the circuit model
    if (!isValidCircuitModel(data.model)) {
      return { success: false, error: 'Invalid circuit model structure' }
    }

    // Version compatibility check
    if (data.version !== CURRENT_VERSION) {
      console.warn(`Loading design with version ${data.version}, current version is ${CURRENT_VERSION}`)
    }

    return {
      success: true,
      model: data.model,
      metadata: {
        name: data.name,
        description: data.description,
        version: data.version,
        timestamp: data.timestamp
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to parse design: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Downloads a design as a JSON file
 */
export function downloadDesign(model: CircuitModel, filename?: string, name?: string, description?: string) {
  const design = serializeDesign(model, name, description)
  const jsonString = JSON.stringify(design, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename || `pulse-design-${Date.now()}.json`
  
  // Append to body temporarily for Firefox compatibility
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up the URL
  URL.revokeObjectURL(url)
}

/**
 * Triggers a file picker to load a design from JSON
 */
export function loadDesign(): Promise<{
  success: true
  model: CircuitModel
  metadata: { name?: string; description?: string; version: string; timestamp: string }
} | {
  success: false
  error: string
}> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve({ success: false, error: 'No file selected' })
        return
      }

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const result = deserializeDesign(data)
        resolve(result)
      } catch (error) {
        resolve({ 
          success: false, 
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}` 
        })
      }
    }

    input.oncancel = () => {
      resolve({ success: false, error: 'File selection cancelled' })
    }

    input.click()
  })
}