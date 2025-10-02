import { CircuitModel, Component, Wire } from './model'
import { mapInputsToToggles, extractOutputsFromLeds, getCustomComponentInputPorts, getCustomComponentOutputPorts } from './utils/custom-components'

export type SignalMap = Record<string, boolean>

export function evaluate(model: CircuitModel): SignalMap {
    // more robust evaluator:
    // 1) build a mapping of wires so inputs are fast to lookup
    // 2) attempt a topological sort and evaluate in that order (works for acyclic nets)
    // 3) if there are cycles, evaluate acyclic part first then iterate remaining nodes to a fixed point

    const signals: SignalMap = {}

    // map destination key -> wire
    const wireMap = new Map<string, { from: { compId: string; port: string } }>()
    for (const w of model.wires) {
        wireMap.set(w.to.compId + ':' + w.to.port, { from: w.from })
    }

    const inputOf = (compId: string, port: string): boolean => {
        const w = wireMap.get(compId + ':' + port)
        if (!w) return false
        return !!signals[w.from.compId + ':' + w.from.port]
    }

    const computeCustomComponent = (c: Component): boolean => {
        if (!c.customDef) return false
        
        // Gather inputs from wires connected to this component
        const externalInputs: Record<string, boolean> = {}
        const inputPorts = getCustomComponentInputPorts(c.customDef)
        
        inputPorts.forEach(port => {
            externalInputs[port] = inputOf(c.id, port)
        })
        
        // Map external inputs to internal TOGGLE states
        const mappedComponents = mapInputsToToggles(c.customDef, externalInputs)
        
        // Create internal model with mapped components
        const internalModel: CircuitModel = {
            components: mappedComponents,
            wires: c.customDef.internalModel.wires
        }
        
        // Evaluate the internal model
        const internalSignals = evaluate(internalModel)
        
        // Extract outputs from LEDs
        const outputs = extractOutputsFromLeds(c.customDef, internalSignals)
        
        // Store all output signals for this component
        const outputPorts = getCustomComponentOutputPorts(c.customDef)
        outputPorts.forEach(port => {
            const outputKey = c.id + ':' + port
            signals[outputKey] = outputs[port] || false
        })
        
        // Return the first output (for backward compatibility with single-output assumption)
        return outputs['OUT0'] || false
    }

    const computeOutput = (c: Component): boolean => {
        switch (c.type) {
            case 'TOGGLE':
            case 'CLOCK':
                return !!c.props.state
            case 'LED':
                return !!inputOf(c.id, 'IN')
            case 'NOT':
                return !inputOf(c.id, 'A')
            case 'AND':
                return inputOf(c.id, 'A') && inputOf(c.id, 'B')
            case 'OR':
                return inputOf(c.id, 'A') || inputOf(c.id, 'B')
            case 'NAND':
                return !(inputOf(c.id, 'A') && inputOf(c.id, 'B'))
            case 'NOR':
                return !(inputOf(c.id, 'A') || inputOf(c.id, 'B'))
            case 'XOR':
                return Boolean(inputOf(c.id, 'A')) !== Boolean(inputOf(c.id, 'B'))
            case 'XNOR':
                return Boolean(inputOf(c.id, 'A')) === Boolean(inputOf(c.id, 'B'))
            case 'REGISTER':
                return !!c.props.state
            case 'CUSTOM':
                return computeCustomComponent(c)
            default:
                return false
        }
    }

    // Build adjacency for topological sort: edge from source comp -> dest comp
    const compsById = new Map<string, Component>()
    for (const c of model.components) compsById.set(c.id, c)

    const adj = new Map<string, Set<string>>()
    const indegree = new Map<string, number>()
    for (const c of model.components) {
        adj.set(c.id, new Set())
        indegree.set(c.id, 0)
    }
    for (const w of model.wires) {
        // ignore self edges if any
        if (!adj.has(w.from.compId) || !adj.has(w.to.compId)) continue
        if (!adj.get(w.from.compId)!.has(w.to.compId)) {
            adj.get(w.from.compId)!.add(w.to.compId)
            indegree.set(w.to.compId, (indegree.get(w.to.compId) || 0) + 1)
        }
    }

    // Kahn's algorithm
    const queue: string[] = []
    for (const [id, deg] of indegree.entries()) if (deg === 0) queue.push(id)

    const topo: string[] = []
    while (queue.length) {
        const id = queue.shift()!
        topo.push(id)
        for (const nbr of adj.get(id) || []) {
            indegree.set(nbr, (indegree.get(nbr) || 1) - 1)
            if (indegree.get(nbr) === 0) queue.push(nbr)
        }
    }

    // initialize signals for stateful sources first
    for (const c of model.components) {
        const keyOut = c.id + ':OUT'
        if (c.type === 'TOGGLE' || c.type === 'CLOCK') signals[keyOut] = !!c.props.state
        else signals[keyOut] = false
    }

    // Evaluate acyclic portion in topological order
    const topoSet = new Set(topo)
    for (const id of topo) {
        const c = compsById.get(id)!
        const keyOut = c.id + ':OUT'
        signals[keyOut] = computeOutput(c)
    }

    // If we didn't include all components in topo, we have cycles. Iterate remaining nodes until stable.
    if (topo.length < model.components.length) {
        const remaining = model.components.filter((c) => !topoSet.has(c.id))
        const MAX_ITER = 100
        for (let iter = 0; iter < MAX_ITER; iter++) {
            let changed = false
            for (const c of remaining) {
                const keyOut = c.id + ':OUT'
                const newVal = computeOutput(c)
                if (!!signals[keyOut] !== !!newVal) {
                    signals[keyOut] = newVal
                    changed = true
                }
            }
            if (!changed) break
        }
    }

    return signals
}

export function updateStatefulComponents(model: CircuitModel, signals: SignalMap, prevSignals: SignalMap): CircuitModel {
    const newComps = model.components.map(c => {
        if (c.type === 'CLOCK') {
            // simple 1hz clock
            const tick = Date.now() % 1000;
            if (tick < 500 && (c.props.lastTick || 0) >= 500) {
                return { ...c, props: { ...c.props, state: !c.props.state, lastTick: tick } };
            }
            return { ...c, props: { ...c.props, lastTick: tick } };
        } else if (c.type === 'REGISTER') {
            const clkWire = model.wires.find(w => w.to.compId === c.id && w.to.port === 'CLK');
            const enWire = model.wires.find(w => w.to.compId === c.id && w.to.port === 'EN');
            const dWire = model.wires.find(w => w.to.compId === c.id && w.to.port === 'D');

            const clkId = clkWire ? clkWire.from.compId + ':' + clkWire.from.port : undefined;
            const enId = enWire ? enWire.from.compId + ':' + enWire.from.port : undefined;
            const dId = dWire ? dWire.from.compId + ':' + dWire.from.port : undefined;

            const clk = clkId ? signals[clkId] : false;
            const prevClk = clkId ? prevSignals[clkId] : false;
            const en = enId ? signals[enId] : true; // enabled by default
            const d = dId ? signals[dId] : false;

            if (clk && !prevClk && en) {
                return { ...c, props: { ...c.props, state: d } };
            }
        }
        return c;
    });
    return { ...model, components: newComps };
}
