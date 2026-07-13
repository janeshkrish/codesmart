# CodeSmart Three-Phase Release Plan

> **For agentic workers:** Execute each phase with a red-green test or rendered regression check before marking it complete.

**Goal:** Deliver a fixed Electron workspace, Java-focused editor workflow, and reliable teaching visualizations without changing CodeSmart into a general-purpose IDE.

## Phase 1 — Electron workspace and interaction smoothness

- [x] Replace viewport-sized root dimensions with container-safe dimensions and reset stale persisted panel layout.
- [x] Give explorer, editor, visualizer, bottom tabs, call stack, and console usable minimum widths at 1280×720 and 1440×900.
- [x] Make toolbar and tab strips scroll or compact instead of forcing horizontal overflow.
- [x] Render-check desktop and compact Electron-size layouts for clipping and blank regions.

## Phase 2 — Java editing, navigation, search, and files

- [x] Add open file and Save/Save As handling to the Electron bridge and project explorer.
- [x] Add Java-aware command palette actions: format document, go to line, find in file, find in project, rename symbol, and organize imports where safely supported by Monaco.
- [x] Replace the placeholder Search bottom tab with real code search results that navigate the Monaco editor.
- [x] Support file selection, rename, delete confirmation, and Java-class templates in the explorer.

## Phase 3 — Execution and reference-aligned visualizations

- [x] Finish snapshot coverage for numeric loops, recursive calls, DP arrays, and memo cache events.
- [x] Make Loop Trace, Recursion, DP Table, and Memo panels render selected timeline snapshots consistently.
- [x] Match the supplied references: iteration cards, Fibonacci call tree, labelled DP grid, and cache-index arrows.
- [x] Verify the run/step/back/timeline data path through regression tests.

## Completion evidence

- [x] Frontend tests pass.
- [x] Frontend production build passes.
- [x] Backend tests pass.
- [x] Electron main-process syntax check passes.
- [x] Desktop screenshots show no root horizontal overflow or clipped essential panels.
