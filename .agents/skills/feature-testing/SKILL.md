---
name: feature-testing
description: >-
  Architect and author comprehensive test suites whenever a new feature, rule,
  state action, expansion mechanic, network event, or UI component is added to Colonist Gambit.
  Enforces test-driven development, location parity in dedicated tests/ folders,
  invariant assertions, edge-case coverage, and full test suite verification.
---

# Feature Testing Skill for Colonist Gambit

This skill governs the systematic design, authoring, and execution of test suites whenever any new feature, expansion mechanic, rule, action, or component is added to **Colonist Gambit**.

It guarantees that new features preserve the integrity of the zero-DOM kernel, adhere to the established test architecture pyramid, maintain file organization standards, and verify all invariants before code is finalized.

---

## When to Use This Skill

Activate this skill when:
- Designing or implementing a new feature in `@colonist-gambit/shared` (e.g., expansion packs like Seafarers, Cities & Knights, custom map generators, new development cards, trade variants).
- Adding or modifying a `GameAction` or FSM phase transition in `packages/shared/src/engine/`.
- Adding new coordinate math or graph algorithms (e.g., ship connectivity, water tiles, hex distance).
- Introducing new real-time Socket.IO events, room settings, matchmaking options, or information-hiding rules in `@colonist-gambit/server`.
- Creating new interactive client components or user intent hooks in `@colonist-gambit/client`.
- The user requests test cases, test plan architecture, or quality assurance for any proposed change.

---

## Core Testing Principles

1. **Test-First / Specification Alignment**:
   - Before writing or finalizing feature code, specify the test scenarios, unique Test IDs (e.g. `SEAFARER-01`, `TRADE-02`), test inputs, and expected invariants.
2. **Dedicated Test Directory Parity**:
   - Never collocate test files alongside source files in `src/`.
   - Place all tests in the exclusive `tests/` directory of the corresponding package, mirroring the source structure:
     - `packages/shared/src/engine/feature.ts` $\rightarrow$ `packages/shared/tests/engine/feature.test.ts`
     - `packages/server/src/socket/feature.ts` $\rightarrow$ `packages/server/tests/socket/feature.test.ts`
3. **Information Hiding Security Invariant**:
   - Any feature that broadcasts state to clients MUST verify that opponent views do NOT leak private information (masked hands, hidden dev cards, unseen deck order).
4. **Conservation & Graph Invariants**:
   - Verify resource conservation laws: $\sum \text{player resources} + \sum \text{bank resources} = \text{total minted resources}$ (unless discarded or traded to bank).
   - Verify topological invariants: vertex degree bounds, edge symmetry, and canonical ID uniqueness.
5. **Deterministic Mocking**:
   - Never rely on non-deterministic `Math.random()` in tests. Inject or pass controlled PRNG seeds or mock callbacks (e.g. mock dice rolls `() => 0.4` for specific values).

---

## The Feature Testing Workflow

Follow these steps for every new feature:

### Step 1: Feature Test Architecture & Matrix
Formulate a test matrix covering:
- **Happy Path**: Standard execution of the feature.
- **Rule Violations & Rejections**: Insufficient resources, wrong phase, out-of-turn execution, illegal placement, duplicate actions.
- **Edge Cases**: Zero inventory, bank exhaustion, boundary/coastal tiles, disconnected networks, simultaneous/reentrant events.
- **Invariants**: Resource conservation, turn order progression, VP updates.

*Example Test Matrix Format:*
| Test ID | Scenario | Input / Action | Expected State / Error |
| :--- | :--- | :--- | :--- |
| `FEAT-01` | Valid execution | `{ type: 'NEW_ACTION', ... }` | `res.success === true`, state updated |
| `FEAT-02` | Out-of-turn rejection | Non-active player dispatches | `res.success === false`, `error: 'Not your turn'` |
| `FEAT-03` | Invariant check | Post-action resource sum | Bank + players conserve count |

### Step 2: Author Unit Tests in Dedicated `tests/` Directory
Create or update the corresponding test file using `vitest`:

```typescript
import { describe, it, expect } from 'vitest';
import { applyAction } from '../../src/engine/applyAction.js';
import type { GameState } from '../../src/types/state.js';

describe('Feature Name (FEAT-01 to FEAT-XX)', () => {
  it('FEAT-01: executes valid feature action and updates state', () => {
    // Arrange state...
    // Act...
    // Assert...
  });

  it('FEAT-02: rejects action when prerequisites are not met', () => {
    // Arrange state...
    // Act...
    // Assert error message...
  });
});
```

### Step 3: Implement Feature Code
Implement the minimal TypeScript code in `src/` to fulfill the test assertions:
- Update types in `src/types/`.
- Add validation in `src/validators/`.
- Add pure transitions in `src/engine/`.
- Export symbols from `src/index.ts`.

### Step 4: Verification & Regression Testing
Run the targeted test suite, followed by the entire monorepo suite:

```bash
# 1. Run the specific test suite
npm test packages/shared/tests/engine/feature.test.ts

# 2. Run the entire test suite across all packages
npm test
```

### Step 5: Type Check & Workspace Build
Ensure clean TypeScript compilation with zero type errors:

```bash
npm run build --workspaces
```

---

## Package-Specific Test Checklists

### For `packages/shared` Features:
- [ ] Test placed in `packages/shared/tests/<subfolder>/<feature>.test.ts`.
- [ ] Imports use relative paths to `../../src/...`.
- [ ] State immutability verified (original state not mutated in place).
- [ ] Phase prerequisites enforced (action only allowed in valid `GamePhase`).
- [ ] Active player turn identity checked.
- [ ] Victory points and special card ownership (`longestRoad`, `largestArmy`) re-evaluated if affected.

### For `packages/server` Features:
- [ ] Test placed in `packages/server/tests/<subfolder>/<feature>.test.ts`.
- [ ] State masking verified: opponent perspectives do NOT reveal hidden resources or cards (`SEC-*`).
- [ ] Socket integration test connects live mock clients on ephemeral ports if testing real-time events.
- [ ] Disconnect and reconnect edge cases covered.

### For `packages/client` Features:
- [ ] Board hitboxes and click handlers map to correct canonical IDs (`vId`, `eId`, `hId`).
- [ ] Visual modes (`interactionMode`) toggle cleanly without lingering selection state.
- [ ] Socket event dispatches handle server acknowledgement errors cleanly.
