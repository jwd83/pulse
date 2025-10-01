import { Component } from '../model'
import { getCustomComponentInputPorts, getCustomComponentOutputPorts } from './custom-components'

/**
 * Calculates the exact position of a port on a component
 */
export function getPortPosition(component: Component, portName: string, portType: 'input' | 'output'): { x: number, y: number } {
  const baseX = component.x
  const baseY = component.y
  const componentWidth = 80
  const componentHeight = 48

  if (portType === 'output') {
    // Output ports are always on the right side
    const outputX = baseX + componentWidth

    if (component.type === 'CUSTOM' && component.customDef) {
      // Custom component outputs
      const outputPorts = getCustomComponentOutputPorts(component.customDef)
      const portIndex = outputPorts.indexOf(portName)
      
      if (portIndex !== -1) {
        const totalOutputs = outputPorts.length
        if (totalOutputs === 1) {
          return { x: outputX, y: baseY + componentHeight / 2 } // Center
        } else {
          // Distribute outputs vertically
          const spacing = (componentHeight - 12) / (totalOutputs - 1)
          const outputY = baseY + 6 + (portIndex * spacing)
          return { x: outputX, y: outputY }
        }
      }
    } else if (component.type !== 'LED') {
      // Standard components have single output on the right center
      return { x: outputX, y: baseY + componentHeight / 2 }
    }
  } else {
    // Input ports are on the left side
    const inputX = baseX

    if (component.type === 'CUSTOM' && component.customDef) {
      // Custom component inputs
      const inputPorts = getCustomComponentInputPorts(component.customDef)
      const portIndex = inputPorts.indexOf(portName)
      
      if (portIndex !== -1) {
        const totalInputs = inputPorts.length
        if (totalInputs === 1) {
          return { x: inputX, y: baseY + componentHeight / 2 } // Center
        } else {
          // Distribute inputs vertically
          const spacing = (componentHeight - 12) / (totalInputs - 1)
          const inputY = baseY + 6 + (portIndex * spacing)
          return { x: inputX, y: inputY }
        }
      }
    } else if (component.type === 'LED') {
      // LED has single centered input
      return { x: inputX, y: baseY + componentHeight / 2 }
    } else if (component.type === 'NOT') {
      // NOT gate has single centered input
      return { x: inputX, y: baseY + componentHeight / 2 }
    } else if (!['TOGGLE', 'CLOCK'].includes(component.type)) {
      // Standard logic gates with A and B inputs
      if (portName === 'A') {
        return { x: inputX, y: baseY + 12 } // Top third
      } else if (portName === 'B') {
        return { x: inputX, y: baseY + 36 } // Bottom third
      }
    }
  }

  // Fallback to center
  return { 
    x: portType === 'output' ? baseX + componentWidth : baseX, 
    y: baseY + componentHeight / 2 
  }
}

/**
 * Gets all input port names for a component
 */
export function getComponentInputPorts(component: Component): string[] {
  if (component.type === 'CUSTOM' && component.customDef) {
    return getCustomComponentInputPorts(component.customDef)
  } else if (component.type === 'LED') {
    return ['IN']
  } else if (component.type === 'NOT') {
    return ['A']
  } else if (!['TOGGLE', 'CLOCK'].includes(component.type)) {
    return ['A', 'B']
  }
  return []
}

/**
 * Gets all output port names for a component
 */
export function getComponentOutputPorts(component: Component): string[] {
  if (component.type === 'CUSTOM' && component.customDef) {
    return getCustomComponentOutputPorts(component.customDef)
  } else if (component.type !== 'LED') {
    return ['OUT']
  }
  return []
}