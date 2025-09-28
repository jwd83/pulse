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

export type Port = {
    id: string
    name: string
    x: number
    y: number
}

export type Component = {
    id: string
    type: ComponentType
    x: number
    y: number
    props: Record<string, any>
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
