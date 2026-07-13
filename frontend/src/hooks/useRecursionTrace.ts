import { useMemo } from 'react';
import type { StackFrame, StepResult } from '../types';

export interface RecursionTraceNode {
  id: string;
  parentId?: string;
  label: string;
  methodName: string;
  depth: number;
  completed: boolean;
  frameKey: string;
  argumentValues: string[];
  cacheStatus?: 'computed' | 'cache-hit';
  memoIndex?: number;
  returnValue?: unknown;
}

export interface RecursionTraceEdge {
  id: string;
  source: string;
  target: string;
}

export interface RecursionTrace {
  nodes: RecursionTraceNode[];
  edges: RecursionTraceEdge[];
}

export function useRecursionTrace(steps: StepResult[]): RecursionTrace {
  return useMemo(() => buildRecursionTrace(steps), [steps]);
}

export function buildRecursionTrace(steps: StepResult[]): RecursionTrace {
  const nodes: RecursionTraceNode[] = [];
  const edges: RecursionTraceEdge[] = [];
  const activeByFrameKey = new Map<string, string>();
  const completedIds = new Set<string>();
  const returnValues = new Map<string, unknown>();
  let previousFrames: StackFrame[] = [];
  let sequence = 0;

  for (const step of steps) {
    const frames = step.stackFrames ?? [];

    if (frames.length > previousFrames.length) {
      for (let index = previousFrames.length; index < frames.length; index++) {
        const frame = frames[index];
        const parentFrame = frames[index - 1];
        const parentKey = parentFrame ? getFrameKey(parentFrame, index - 1) : undefined;
        const parentId = parentKey ? activeByFrameKey.get(parentKey) : undefined;
        const nodeId = `rec-${sequence++}`;
        const argumentValues = getArgumentValues(frame);
        const memoIndex = inferMemoIndex(argumentValues);

        nodes.push({
          id: nodeId,
          parentId,
          label: buildFrameLabel(frame, argumentValues),
          methodName: frame.methodName,
          depth: frame.depth ?? index,
          completed: false,
          frameKey: getFrameKey(frame, index),
          argumentValues,
          memoIndex,
        });

        activeByFrameKey.set(getFrameKey(frame, index), nodeId);
        if (parentId) {
          edges.push({ id: `rec-edge-${parentId}-${nodeId}`, source: parentId, target: nodeId });
        }
      }
    } else if (frames.length < previousFrames.length) {
      // Frames popped — extract return values from the step that triggered the pop
      for (let index = previousFrames.length - 1; index >= frames.length; index--) {
        const frameKey = getFrameKey(previousFrames[index], index);
        const nodeId = activeByFrameKey.get(frameKey);
        if (nodeId) {
          completedIds.add(nodeId);
          // Try to capture return value from the step's variables or the popped frame
          const poppedFrame = previousFrames[index];
          if (poppedFrame.returnValue) {
            returnValues.set(nodeId, poppedFrame.returnValue.staticValue ?? poppedFrame.returnValue.name);
          } else if (step.variables) {
            // The return value may now be in the caller's variables
            // Heuristic: look for newly appearing or changed numeric values
            const lastReturnValue = extractReturnValueHeuristic(step);
            if (lastReturnValue !== undefined) {
              returnValues.set(nodeId, lastReturnValue);
            }
          }
        }
        activeByFrameKey.delete(frameKey);
      }
    }

    previousFrames = frames;
  }

  if (previousFrames.length === 0 && nodes.length === 0) {
    return { nodes, edges };
  }

  const nodesWithCompletion = nodes.map(node => ({
    ...node,
    completed: node.completed || completedIds.has(node.id),
    returnValue: returnValues.get(node.id),
  }));

  return markCacheHits(nodesWithCompletion, edges);
}

function markCacheHits(nodes: RecursionTraceNode[], edges: RecursionTraceEdge[]): RecursionTrace {
  const childCount = new Map<string, number>();
  edges.forEach(edge => childCount.set(edge.source, (childCount.get(edge.source) ?? 0) + 1));
  const seenMemoIndex = new Set<number>();

  const marked = nodes.map(node => {
    if (node.memoIndex === undefined) return node;
    const hasChildren = (childCount.get(node.id) ?? 0) > 0;
    const cacheStatus: RecursionTraceNode['cacheStatus'] =
      !hasChildren && seenMemoIndex.has(node.memoIndex) ? 'cache-hit' : 'computed';
    seenMemoIndex.add(node.memoIndex);
    return { ...node, cacheStatus };
  });

  return { nodes: marked, edges };
}

function getFrameKey(frame: StackFrame, index: number): string {
  return frame.id || `${frame.methodName}-${frame.depth}-${index}-${frame.virtualAddress ?? ''}`;
}

function getArgumentValues(frame: StackFrame): string[] {
  const variables = frame.localVariables ?? [];
  const parameters = variables.filter(variable => variable.parameter);
  const source = parameters.length > 0 ? parameters : variables.slice(0, 2);
  return source
    .map(variable => variable.staticValue ?? variable.name)
    .filter(Boolean)
    .map(String);
}

function buildFrameLabel(frame: StackFrame, argumentValues: string[]): string {
  const displayName = frame.methodName || 'call';
  return `${displayName}(${argumentValues.join(', ')})`;
}

function inferMemoIndex(argumentValues: string[]): number | undefined {
  const value = argumentValues.find(arg => /^-?\d+$/.test(arg));
  return value === undefined ? undefined : Number(value);
}

function extractReturnValueHeuristic(step: StepResult): unknown {
  // Look for the current statement containing a "return" keyword
  if (step.currentStatement?.includes('return')) {
    const match = step.currentStatement.match(/return\s+(.+?)(?:;|$)/);
    if (match) {
      const val = match[1].trim();
      // If it's a simple numeric or variable, try to resolve it
      if (/^-?\d+$/.test(val)) return parseInt(val, 10);
      if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
      if (step.variables && val in step.variables) return step.variables[val];
      return val;
    }
  }
  return undefined;
}
