# Java Visualization Runtime Design

## Purpose

Make CodeSmart's Java execution visualizations dependable without changing its purpose as a Java learning and visualization IDE. The runtime must turn a successfully analysed Java source file into deterministic execution snapshots that drive loops, recursion, dynamic-programming tables, and memoization views.

## Evidence and root cause

The supplied recording reproduces a loop panel that stays empty after Run. A live request to `POST /api/analyze` returns a successful AST and control-flow graph for a valid `for` loop. The fault is in the frontend runtime: it flattens the `ForStmt` and its body once, records only a generic true condition, and does not create a snapshot for each loop iteration. Visual panels therefore cannot render the data illustrated in the supplied reference images.

## Architecture

`useExecution` remains the sole bridge from UI controls to `FrontendExecutionEngine`. Before execution it must obtain the latest valid analysis synchronously; it must never silently return when analysis is pending or invalid. The engine emits immutable `ExecutionSnapshot` records, and the Zustand store makes the currently selected timeline snapshot authoritative for every visual panel.

The engine supports a deliberately bounded Java subset for this release: primitive declarations and assignments, `for`/`while` loops with numeric conditions and updates, method calls to known methods, recursive calls, integer-array allocation and indexed writes, and `System.out.print/println`. Unsupported constructs must be surfaced in the Console as a visualization limitation, rather than being represented as incorrect execution.

## User-visible behavior

- Run and step wait for a fresh successful analysis; invalid code shows its diagnostic and does not start a stale run.
- Loops display an ordered trace with iteration number, condition result, loop variable, variable changes, and output.
- Recursive calls display a parent/child tree, parameters, active/completed state, and returns.
- `int[]` and `int[][]` DP arrays display labelled indices and visibly highlight the latest write.
- Memo tables display cache stores and cache hits, with the current key and result.
- Timeline selection and Step Back restore the same data across all four panels.

## Quality constraints

- Do not remove existing Java-analysis, memory, flow, call, collection, or stream views.
- Keep all visual output deterministic: no random branch results.
- Add focused frontend tests before production changes and verify the frontend build plus backend test suite.
- Preserve pre-existing uncommitted user changes and do not commit or reset them without a separate request.
