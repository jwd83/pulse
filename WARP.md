# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Pulse is a digital logic circuit sandbox built as a single-page React + TypeScript application. It allows users to create and simulate digital logic circuits by dragging components onto a canvas and connecting them with wires.

## Core Architecture

### Key Files and Their Responsibilities

- **`src/model.ts`** - Core data types and interfaces
  - Defines `ComponentType`, `Component`, `Wire`, and `CircuitModel` types
  - Contains the complete circuit state representation

- **`src/engine.ts`** - Circuit simulation engine
  - Implements circuit evaluation with topological sorting for acyclic circuits
  - Handles cyclic circuits with fixed-point iteration
  - Uses Kahn's algorithm for dependency resolution
  - Main entry point: `evaluate(model: CircuitModel): SignalMap`

- **`src/App.tsx`** - Main application component
  - Manages global circuit state
  - Runs simulation loop (60ms intervals)
  - Handles component palette and workspace integration

- **`src/components/Workspace.tsx`** - Interactive canvas component
  - Manages component positioning and wire connections
  - Handles drag-and-drop operations
  - Renders SVG wires with Manhattan routing and signal visualization
  - Implements visual wire creation (click output port, drag to input port)

- **`src/components/Palette.tsx`** - Component selection sidebar
  - Lists available components (gates, inputs, outputs)

- **`src/components/gate/GateView.tsx`** - Individual component rendering
  - Renders gates, inputs (TOGGLE, CLOCK), and outputs (LED)
  - Handles component interactions and port connections

### Component Types

**Logic Gates**: AND, OR, NOT, NAND, NOR, XOR, XNOR
**Input Sources**: TOGGLE (clickable state), CLOCK (auto-toggles every 1000ms)  
**Outputs**: LED (visual signal indicator)

### Wire System

- Wires connect output ports (green) to input ports (blue)
- Visual feedback: active signals show in red, inactive in black
- Smooth cubic Bezier curves for wire rendering
- Automatic duplicate wire prevention

### Simulation Engine

- Evaluates circuits using topological sorting for performance
- Handles combinational logic cycles with iterative evaluation
- 60ms simulation refresh rate
- Real-time signal state display in sidebar

## Common Development Commands

### Development Server
```bash
npm run dev
```
Starts Vite development server with hot reloading

### Production Build
```bash
npm run build
```
Creates optimized production build in `dist/`

### Preview Production Build
```bash
npm run preview
```
Serves production build locally for testing

### Dependency Management
```bash
npm install
```

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4.5.2
- **Styling**: Tailwind CSS 3.4.1 with PostCSS and Autoprefixer
- **Deployment**: Configured for GitHub Pages (`base: '/pulse/'` in vite.config.ts)

## Development Notes

### Adding New Component Types

1. Add the component type to `ComponentType` union in `model.ts`
2. Implement evaluation logic in `engine.ts` `computeOutput` function
3. Add visual representation in `GateView.tsx`
4. Update the component palette in `Palette.tsx`

### Circuit State Management

- Circuit state is managed in `App.tsx` as a single `CircuitModel` object
- All components are rendered from this centralized state
- Wire creation follows output → input port connection pattern

### Performance Considerations

- Simulation runs at 16.67fps (60ms intervals) for responsive interaction
- Topological sorting optimizes evaluation order for complex circuits
- Clock components auto-toggle every 1000ms independently of simulation loop

### File Structure

```
src/
├── App.tsx              # Main app component and state management
├── main.tsx            # React app entry point
├── model.ts            # Core data types and interfaces  
├── engine.ts           # Circuit evaluation engine
├── styles.css          # Global styles
└── components/
    ├── Palette.tsx     # Component selection sidebar
    ├── Workspace.tsx   # Interactive circuit canvas
    └── gate/
        └── GateView.tsx # Individual component rendering
```