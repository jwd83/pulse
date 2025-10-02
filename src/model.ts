export type ComponentType =
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'NAND'
    | 'NOR'
    | 'XOR'
    | 'XNOR'
    | 'TOGGLE'
    | 'CLOCK'
    | 'LED'
    | 'CUSTOM'
    | 'REGISTER'

export type Port = {
    id: string
    name: string
    x: number
    y: number
}

export type CustomComponentDefinition = {
    name: string
    inputPins: string[]  // IDs of TOGGLE components that become inputs
    outputPins: string[] // IDs of LED components that become outputs
    internalModel: CircuitModel
}

export type Component = {
    id: string
    type: ComponentType
    x: number
    y: number
    props: Record<string, any>
    customDef?: CustomComponentDefinition // Only present for CUSTOM components
}

export type Wire = {
    id: string
    from: { compId: string; port: string }
    to: { compId: string; port: string }
}

export type CircuitModel = {
    components: Component[]
    wires: Wire[]
}
