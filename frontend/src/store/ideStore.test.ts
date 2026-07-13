import { beforeEach, describe, expect, it } from 'vitest';
import { useIdeStore } from './ideStore';
import type { ExecutionSnapshot } from '../services/executionEngine';

const snapshot = (stepIndex: number): ExecutionSnapshot => ({
  stepIndex, currentLine: stepIndex + 1, currentStatement: `line ${stepIndex + 1}`,
  variables: {}, callStack: [], heapObjects: [], consoleOutput: '', dpArrays: [],
  memoCache: { entries: new Map() }, collections: [], visitedLines: new Set(), branchDecisions: [],
});

describe('execution snapshot synchronization', () => {
  beforeEach(() => useIdeStore.getState().clearExecutionSteps());

  it('selects an existing snapshot instead of duplicating it after a timeline jump', () => {
    const store = useIdeStore.getState();
    store.syncExecutionState(snapshot(0));
    store.syncExecutionState(snapshot(1));
    store.goToStep(0);
    store.syncExecutionState(snapshot(0));

    const state = useIdeStore.getState();
    expect(state.executionSnapshots).toHaveLength(2);
    expect(state.currentSnapshotIndex).toBe(0);
  });
});
