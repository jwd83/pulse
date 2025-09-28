import { CircuitModel, Component, Wire } from './model'

export type SignalMap = Record<string, boolean>

export function evaluate(model: CircuitModel): SignalMap {
    // simple combinational evaluator: map component outputs to boolean signals
    const signals: SignalMap = {}

    // helper: read inputs from wires
    const inputOf = (compId: string, port: string): boolean => {
        // find a wire that goes to this comp/port
        const w = model.wires.find((ww) => ww.to.compId === compId && ww.to.port === port)
        if (!w) return false
        // read from source
        return signals[w.from.compId + ':' + w.from.port] || false
    }

    for (const c of model.components) {
        const keyOut = c.id + ':OUT'
        switch (c.type) {
            case 'TOGGLE':
            case 'CLOCK':
                // toggles and clocks expose their state as OUT
                signals[keyOut] = !!c.props.state
                break
            case 'LED':
                signals[keyOut] = !!inputOf(c.id, 'IN')
                break
            case 'NOT':
                signals[keyOut] = !inputOf(c.id, 'A')
                break
            case 'AND':
                signals[keyOut] = inputOf(c.id, 'A') && inputOf(c.id, 'B')
                break
            case 'OR':
                signals[keyOut] = inputOf(c.id, 'A') || inputOf(c.id, 'B')
                break
            case 'NAND':
                signals[keyOut] = !(inputOf(c.id, 'A') && inputOf(c.id, 'B'))
                break
            case 'NOR':
                signals[keyOut] = !(inputOf(c.id, 'A') || inputOf(c.id, 'B'))
                break
            case 'XOR':
                signals[keyOut] = Boolean(inputOf(c.id, 'A')) !== Boolean(inputOf(c.id, 'B'))
                break
            case 'XNOR':
                signals[keyOut] = Boolean(inputOf(c.id, 'A')) === Boolean(inputOf(c.id, 'B'))
                break
            default:
                signals[keyOut] = false
        }
    }

    return signals
}
