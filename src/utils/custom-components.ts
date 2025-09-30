import { CircuitModel, Component, CustomComponentDefinition } from '../model'
import { deserializeDesign } from './json'

/**
 * Creates a custom component definition from a loaded design
 */
export function createCustomComponentFromDesign(
  designData: any,
  filename: string
): {
  success: true
  definition: CustomComponentDefinition
} | {
  success: false
  error: string
} {
  // First deserialize the design
  const result = deserializeDesign(designData)
  if (!result.success) {
    return result
  }

  const model = result.model

  // Find all TOGGLE components (these become inputs)
  const toggles = model.components.filter(c => c.type === 'TOGGLE')
  
  // Find all LED components (these become outputs)  
  const leds = model.components.filter(c => c.type === 'LED')

  if (toggles.length === 0 && leds.length === 0) {
    return {
      success: false,
      error: 'Design must contain at least one TOGGLE (input) or LED (output) component'
    }
  }

  // Extract name from filename (remove .json extension)
  const name = filename.replace(/\.json$/i, '')

  const definition: CustomComponentDefinition = {
    name,
    inputPins: toggles.map(t => t.id),
    outputPins: leds.map(l => l.id),
    internalModel: model
  }

  return { success: true, definition }
}

/**
 * Loads a custom component from a file
 */
export function loadCustomComponent(): Promise<{
  success: true
  definition: CustomComponentDefinition
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
        const result = createCustomComponentFromDesign(data, file.name)
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

/**
 * Gets the input port names for a custom component (based on index)
 */
export function getCustomComponentInputPorts(definition: CustomComponentDefinition): string[] {
  return definition.inputPins.map((_, index) => `IN${index}`)
}

/**
 * Gets the output port names for a custom component (based on index)
 */
export function getCustomComponentOutputPorts(definition: CustomComponentDefinition): string[] {
  return definition.outputPins.map((_, index) => `OUT${index}`)
}

/**
 * Maps external input signals to internal TOGGLE component states
 */
export function mapInputsToToggles(
  definition: CustomComponentDefinition,
  externalInputs: Record<string, boolean>
): Component[] {
  return definition.internalModel.components.map(comp => {
    if (comp.type === 'TOGGLE') {
      const pinIndex = definition.inputPins.indexOf(comp.id)
      if (pinIndex !== -1) {
        const inputPort = `IN${pinIndex}`
        const inputValue = externalInputs[inputPort] || false
        return {
          ...comp,
          props: { ...comp.props, state: inputValue }
        }
      }
    }
    return comp
  })
}

/**
 * Extracts outputs from internal LED components
 */
export function extractOutputsFromLeds(
  definition: CustomComponentDefinition,
  internalSignals: Record<string, boolean>
): Record<string, boolean> {
  const outputs: Record<string, boolean> = {}
  
  definition.outputPins.forEach((ledId, index) => {
    const outputPort = `OUT${index}`
    // LEDs have their signal on the 'OUT' port (which is actually their input internally)
    outputs[outputPort] = internalSignals[ledId + ':OUT'] || false
  })

  return outputs
}