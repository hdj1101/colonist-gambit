---
name: documentation
description: >-
  Maintain, reference, and author technical documentation for Colonist Gambit.
  Use this skill whenever reading, creating, updating, or auditing documentation
  in the `docs/` directory, documenting new game features, state machine changes,
  hex math, networking protocols, SVG rendering, or keeping documentation in sync with code.
---

# Colonist Gambit Documentation Skill

This skill governs how to reference, maintain, and author documentation for **Colonist Gambit**. It ensures that the technical documentation in `docs/` remains an accurate, high-fidelity reference for human contributors and AI pair programmers alike.

---

## When to Use This Skill

Activate this skill when:
- Adding or modifying game features, rules, or state actions in `@colonist-gambit/shared`.
- Updating the server networking layer, room management, or state masking in `@colonist-gambit/server`.
- Modifying the React client, SVG board renderer, or modals in `@colonist-gambit/client`.
- The user requests new documentation, architectural guides, or runbooks.
- Auditing existing documentation for accuracy or updating docs during code refactoring.

---

## Core Documentation Map

Always consult the appropriate existing documentation file before making changes or when answering technical questions:

| Domain / Question | Primary Reference File |
|---|---|
| Distributed design, pure reducer, fog-of-war masking | [`docs/architecture.md`](../../docs/architecture.md) |
| Cube coordinates, pointy-topped projection, canonical IDs, graph adjacencies | [`docs/hex-grid-and-board.md`](../../docs/hex-grid-and-board.md) |
| Phase state machine, snake draft, harvest, placement rules, Longest Road DFS | [`docs/game-engine-and-rules.md`](../../docs/game-engine-and-rules.md) |
| Socket.IO contracts, room lifecycle, reconnection, state masking projection | [`docs/networking-and-protocol.md`](../../docs/networking-and-protocol.md) |
| React architecture, `useSocket` hook, 3-layer SVG renderer, hit testing | [`docs/client-and-rendering.md`](../../docs/client-and-rendering.md) |
| Workspace setup, Vitest test suites, extensibility recipes (actions/maps/bots) | [`docs/development-and-testing.md`](../../docs/development-and-testing.md) |
| Documentation index & navigation | [`docs/README.md`](../../docs/README.md) |

---

## Documentation Synchronization Workflow

When modifying code across the codebase, follow this checklist to keep documentation in sync:

### 1. Engine / Rules Changes (`packages/shared`)
If you:
- Add or modify a `GameAction` type:
  - Update `docs/game-engine-and-rules.md` (Actions & State Transitions).
  - Update `docs/development-and-testing.md` (Recipe A: Adding a New Game Action).
- Alter placement validation (e.g. Distance Rule, road network):
  - Update `docs/game-engine-and-rules.md` section on Placement Validation.
- Alter victory evaluation or Longest Road DFS:
  - Update `docs/game-engine-and-rules.md` section on Longest Road & Victory.
- Change board geometry, coordinate transformations, or generation:
  - Update `docs/hex-grid-and-board.md`.

### 2. Server / Multiplayer Changes (`packages/server`)
If you:
- Add or change Socket.IO events:
  - Update `docs/networking-and-protocol.md` table of event contracts.
- Adjust room lifecycle, ready states, or host handover:
  - Update `docs/networking-and-protocol.md` section on Room Lifecycle.
- Modify state masking or redactions (`maskGameStateForPlayer`):
  - Update `docs/architecture.md` (Fog-of-War Projection) and `docs/networking-and-protocol.md`.

### 3. Frontend / UI Changes (`packages/client`)
If you:
- Modify `BoardRenderer.tsx` layer hierarchy, styling, or projection:
  - Update `docs/client-and-rendering.md` section on SVG Board Rendering Pipeline.
- Add or update modals (e.g. trading, discard, steal):
  - Update `docs/client-and-rendering.md` section on Modals & Interaction Modes.
- Change `useSocket` lifecycle or event handling:
  - Update `docs/client-and-rendering.md` and `docs/networking-and-protocol.md`.

---

## Authoring Standards & Conventions

When writing or updating documentation files in `docs/`:

1. **Mathematical Rigor (KaTeX)**:
   - Use standard LaTeX notation for coordinates, matrices, and formulas.
   - Inline math: `$q + r + s = 0$`. Remember: write literal dollar signs as `\$`.
   - Display equations:
     $$\begin{bmatrix} x \\ y \end{bmatrix} = R \begin{bmatrix} \sqrt{3} & \frac{\sqrt{3}}{2} \\ 0 & \frac{3}{2} \end{bmatrix} \begin{bmatrix} q \\ r \end{bmatrix}$$
2. **Visual Diagrams (Mermaid)**:
   - Use `flowchart TD` or `flowchart LR` for topologies and data flow.
   - Use `sequenceDiagram` for client-server protocol exchanges.
   - Use `stateDiagram-v2` for state machines and phase transitions.
3. **Exact Code Fidelity**:
   - Provide concrete TypeScript types, interfaces, and function signatures that exactly match the source files.
   - Include file path references so readers can navigate directly to the code (e.g., `packages/shared/src/engine/applyAction.ts`).
4. **Linking & Discovery**:
   - Whenever creating a new document in `docs/`, link to it from both [`docs/README.md`](../../docs/README.md) and the root [`README.md`](../../README.md).
   - Use relative markdown links between docs (e.g., `[System Architecture](./architecture.md)`).
5. **Validation**:
   - Run `npm test` to ensure code snippets and referenced APIs remain functionally accurate.
