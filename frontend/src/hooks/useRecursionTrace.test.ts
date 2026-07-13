import { describe, expect, it } from 'vitest';
import { buildRecursionTrace } from './useRecursionTrace';
import type { StackFrame, StepResult } from '../types';

const frame = (id: string, depth: number): StackFrame => ({
  id, methodName: 'fib', depth, localVariables: [], isActive: true, virtualAddress: depth,
});

describe('buildRecursionTrace', () => {
  it('creates separate sibling calls when a recursive frame returns and another replaces it at the same depth', () => {
    const steps: StepResult[] = [
      { type: 'STEP_FORWARD', message: '', stackFrames: [frame('main', 0), frame('fib-3', 1)] },
      { type: 'STEP_FORWARD', message: '', stackFrames: [frame('main', 0), frame('fib-3', 1), frame('fib-2', 2)] },
      { type: 'STEP_FORWARD', message: '', stackFrames: [frame('main', 0), frame('fib-3', 1)] },
      { type: 'STEP_FORWARD', message: '', stackFrames: [frame('main', 0), frame('fib-3', 1), frame('fib-1', 2)] },
    ];

    const trace = buildRecursionTrace(steps);
    expect(trace.nodes.map(node => node.frameKey)).toContain('fib-2');
    expect(trace.nodes.map(node => node.frameKey)).toContain('fib-1');
    expect(trace.edges).toHaveLength(3);
  });
});
