# Pulse — Digital Logic Sandbox

Minimal single-page React + TypeScript sandbox for experimenting with digital logic circuits.

Features:

- Basic gates: AND, OR, NOT, NAND, NOR, XOR, XNOR
- Input sources: TOGGLE (click to flip), CLOCK (skeleton)
- Outputs: LED (shows signal)
- Canvas with draggable components, add from palette, delete
- Basic wiring: click output port (green) and drag to input port (blue)
- Simple Manhattan routing for wires
- Fast simulation loop updating LEDs based on gate states

Run locally:

1. Install deps

   npm install

2. Start dev server

   npm run dev

Notes:

- The model is stored in `src/model.ts` and is intentionally simple to make saving/loading easy.
- Next steps: add clock controls, loading/saving, visual signal paths, multiple instances.
- You can test the simulation by creating toggles, connecting them through gates to LEDs.
- See `src/engine.ts` for gate evaluation logic. Easy to add new components by updating types and eval.
