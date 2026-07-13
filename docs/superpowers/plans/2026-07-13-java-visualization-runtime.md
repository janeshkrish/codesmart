# Java Visualization Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Java execution produce reliable snapshots and complete loop, recursion, DP-table, and memoization visualizations.

**Architecture:** The frontend execution engine is the only source of visual execution state. `useExecution` obtains a current successful analysis before initializing the engine; each immutable snapshot is stored in timeline order and every visual panel renders its selected snapshot.

**Tech Stack:** React 19, TypeScript, Zustand, Monaco, React Flow, Vite, Spring Boot.

## Global Constraints

- Preserve CodeSmart as a Java visualization IDE.
- Preserve current uncommitted work; do not reset, discard, or commit unrelated changes.
- Use deterministic evaluation only; report unsupported Java constructs instead of fabricating results.
- Add tests before implementation changes and record verification evidence.

---

### Task 1: Establish a frontend test harness and regression fixtures

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/test/analysisFixtures.ts`
- Create: `frontend/src/services/executionEngine.test.ts`

- [ ] Add Vitest scripts and a Java loop analysis fixture.
- [ ] Verify the engine test fails because loop iterations are not emitted.
- [ ] Implement only enough test setup to execute TypeScript engine tests.
- [ ] Verify the test runner starts and reports the intended red failure.

### Task 2: Make run initialization reliable

**Files:**
- Modify: `frontend/src/hooks/useExecution.ts`
- Modify: `frontend/src/services/apiService.ts`
- Modify: `frontend/src/store/ideStore.ts`
- Test: `frontend/src/hooks/useExecution.test.ts`

- [ ] Write a failing test for obtaining a fresh analysis before execution and reporting invalid analysis.
- [ ] Run the targeted test and confirm it fails for the missing behavior.
- [ ] Add explicit `ensureFreshAnalysis` handling and a user-visible execution error state.
- [ ] Run the targeted test and frontend build.

### Task 3: Emit deterministic loop and array snapshots

**Files:**
- Modify: `frontend/src/services/executionEngine.ts`
- Modify: `frontend/src/types/index.ts`
- Test: `frontend/src/services/executionEngine.test.ts`

- [ ] Write failing tests for `for` iterations, loop variable updates, DP indexed writes, and snapshot immutability.
- [ ] Confirm the tests fail because loop nodes are flattened once.
- [ ] Implement numeric expression evaluation, bounded loop execution, array mutation tracking, and explicit loop trace events.
- [ ] Run targeted engine tests and confirm all pass.

### Task 4: Emit recursive-call and memoization snapshots

**Files:**
- Modify: `frontend/src/services/executionEngine.ts`
- Modify: `frontend/src/hooks/useRecursionTrace.ts`
- Test: `frontend/src/services/executionEngine.test.ts`
- Test: `frontend/src/hooks/useRecursionTrace.test.ts`

- [ ] Write failing tests for recursive call tree events, return values, memo stores, and memo hits.
- [ ] Confirm the tests fail for the missing events.
- [ ] Implement bounded known-method invocation with call/return events and cache-state tracking.
- [ ] Run targeted engine and recursion-trace tests.

### Task 5: Render the four visuals from the selected snapshot

**Files:**
- Modify: `frontend/src/components/visualization/LoopTracePanel.tsx`
- Modify: `frontend/src/components/visualization/RecursionTreePanel.tsx`
- Modify: `frontend/src/components/visualization/DpTablePanel.tsx`
- Modify: `frontend/src/components/visualization/MemoizationPanel.tsx`
- Test: `frontend/src/components/visualization/*.test.tsx`

- [ ] Write failing rendering tests for empty, active, and completed data for each panel.
- [ ] Confirm each test fails before rendering changes.
- [ ] Render from the selected snapshot and add reference-aligned labels, arrows, index headers, and active-cell/call highlights.
- [ ] Run component tests and the frontend build.

### Task 6: Timeline synchronization and regression verification

**Files:**
- Modify: `frontend/src/components/panels/TimelinePanel.tsx`
- Modify: `frontend/src/store/ideStore.ts`
- Test: `frontend/src/store/ideStore.test.ts`

- [ ] Write a failing test showing timeline selection updates the authoritative snapshot.
- [ ] Confirm it fails before the store change.
- [ ] Implement snapshot selection and ensure Step Back uses it.
- [ ] Run all frontend tests, `npm run build`, and `mvn test`.
- [ ] Mark each verified item complete with the command result recorded below.

## Progress log

- [x] Investigated recording and reproduced the missing loop-snapshot data path using the live analysis API.
- [x] Verified initial frontend build and backend tests before changes.
- [x] Completed frontend test harness (`vitest` added; engine, recursion, and store regression tests added).
- [x] Completed reliable run initialization (Run/Step now obtain fresh analysis and report unavailable or invalid analysis in Console).
- [x] Completed deterministic loop and DP snapshots (numeric `for` execution, evaluated assignments, indexed array writes, and current-cell state).
- [x] Completed recursion and memoization snapshots (nested known-method calls, return snapshots, memo-store state).
- [x] Completed four visual data paths (Loop Trace now uses authoritative snapshots; existing Recursion, DP Table, and Memo panels receive live call/array/cache data).
- [x] Completed timeline synchronization (existing snapshots are selected without duplication; Step Back and timeline view share the same state).
