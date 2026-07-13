import { useMemo, useState } from 'react';
import { useIdeStore } from '../../store/ideStore';
import type { ControlFlowGraph, CfgNode, StepResult } from '../../types';
import type { ExecutionSnapshot } from '../../services/executionEngine';

interface LoopIteration {
  id: string;
  index: number;
  loopValue?: string;
  outputDelta?: string;
  variableChanges: string[];
}

export function LoopTracePanel() {
  const { analysisResult, executionSteps, executionSnapshots, isExecuting } = useIdeStore();
  const [mode, setMode] = useState<'live' | 'all'>('live');
  const iterations = useMemo(
    () => executionSnapshots.length > 0
      ? buildLoopIterationsFromSnapshots(executionSnapshots)
      : buildLoopIterations(executionSteps, analysisResult?.controlFlowGraphs ?? {}),
    [executionSnapshots, executionSteps, analysisResult],
  );

  const displayedIterations = useMemo(() => {
    if (mode === 'live' && iterations.length > 0) {
      return [iterations[iterations.length - 1]];
    }
    return iterations;
  }, [mode, iterations]);

  if (iterations.length === 0) {
    return <EmptyState message="Step through or run a loop to see each iteration side by side" />;
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '14px', background: '#0d1117', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        paddingBottom: '10px',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMode('live')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #30363d',
              background: mode === 'live' ? '#21262d' : 'transparent',
              color: mode === 'live' ? '#3fb950' : '#8b949e',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            Live / Step
          </button>
          <button
            onClick={() => setMode('all')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid #30363d',
              background: mode === 'all' ? '#21262d' : 'transparent',
              color: mode === 'all' ? '#3fb950' : '#8b949e',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            All Iterations
          </button>
        </div>
        {mode === 'all' && isExecuting && (
          <span style={{ fontSize: '11px', color: '#d29922', display: 'flex', alignItems: 'center', gap: '4px' }}>
            🔄 Stepping active (run to completion to see final results)
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', minWidth: 'max-content' }}>
        {displayedIterations.map(iteration => (
          <div key={iteration.id} style={{
            width: 180,
            minHeight: 118,
            background: 'rgba(240,136,62,0.12)',
            border: '2px solid #f0883e',
            borderRadius: '6px',
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '6px 10px',
              borderBottom: '1px solid rgba(240,136,62,0.35)',
              color: '#f0883e',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>iteration</span>
              <span>{iteration.index}</span>
            </div>
            <div style={{ padding: '8px 10px', color: '#e6edf3', fontSize: '11px', lineHeight: 1.5 }}>
              {iteration.loopValue && (
                <div style={{ color: '#d29922', marginBottom: '6px' }}>{iteration.loopValue}</div>
              )}
              {iteration.outputDelta && (
                <pre style={{ margin: '0 0 6px', color: '#3fb950', whiteSpace: 'pre-wrap' }}>
                  {iteration.outputDelta.trimEnd()}
                </pre>
              )}
              {iteration.variableChanges.length > 0 ? (
                iteration.variableChanges.map(change => (
                  <div key={change} style={{ color: '#8b949e' }}>{change}</div>
                ))
              ) : !iteration.outputDelta ? (
                <div style={{ color: '#6e7681' }}>body visited</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function buildLoopIterationsFromSnapshots(snapshots: ExecutionSnapshot[]): LoopIteration[] {
  const iterations: LoopIteration[] = [];
  let previousOutput = '';
  let previousVariables: Record<string, unknown> = {};
  let previousKey: string | null = null;

  for (const snapshot of snapshots) {
    const activeLoop = [...snapshot.branchDecisions].reverse().find(decision => decision.type === 'for' && decision.result);
    if (!activeLoop) continue;
    const loopValue = getLoopValue(snapshot.variables);
    const key = `${activeLoop.line}:${loopValue ?? snapshot.currentLine}`;
    const outputDelta = diffOutput(previousOutput, snapshot.consoleOutput);
    const variableChanges = diffVariables(previousVariables, snapshot.variables);

    if (key !== previousKey && (loopValue || outputDelta || variableChanges.length > 0)) {
      iterations.push({
        id: `loop-iteration-${snapshot.stepIndex}`,
        index: iterations.length,
        loopValue,
        outputDelta,
        variableChanges,
      });
      previousKey = key;
    } else if (iterations.length > 0) {
      const current = iterations[iterations.length - 1];
      if (outputDelta) current.outputDelta = `${current.outputDelta ?? ''}${outputDelta}`;
      variableChanges.forEach(change => {
        if (!current.variableChanges.includes(change)) current.variableChanges.push(change);
      });
    }

    previousOutput = snapshot.consoleOutput;
    previousVariables = snapshot.variables;
  }
  return iterations;
}

function buildLoopIterations(steps: StepResult[], cfgs: Record<string, ControlFlowGraph>): LoopIteration[] {
  const loopRanges = getLoopBodyRanges(cfgs);
  const iterations: LoopIteration[] = [];
  let previousStep: StepResult | null = null;
  let previousLoopKey: string | null = null;

  steps.forEach((step, stepIndex) => {
    const line = step.currentLine;
    const inLoop = line ? loopRanges.some(range => line >= range.start && line <= range.end) : false;
    const loopValue = getLoopValue(step.variables);
    const loopKey = loopValue ?? (inLoop ? `line:${line}` : null);
    const outputDelta = diffOutput(previousStep?.output, step.output);
    const variableChanges = diffVariables(previousStep?.variables, step.variables);
    const hasSignal = inLoop || Boolean(outputDelta) || variableChanges.length > 0;

    if (hasSignal && loopKey && loopKey !== previousLoopKey) {
      iterations.push({
        id: `loop-iteration-${stepIndex}`,
        index: iterations.length,
        loopValue,
        outputDelta,
        variableChanges,
      });
      previousLoopKey = loopKey;
    } else if (hasSignal && iterations.length > 0) {
      const current = iterations[iterations.length - 1];
      if (outputDelta && !current.outputDelta?.includes(outputDelta)) {
        current.outputDelta = `${current.outputDelta ?? ''}${outputDelta}`;
      }
      variableChanges.forEach(change => {
        if (!current.variableChanges.includes(change)) current.variableChanges.push(change);
      });
    }

    previousStep = step;
  });

  if (iterations.length === 0) {
    const finalOutput = [...steps].reverse().find(step => step.output)?.output;
    if (finalOutput) {
      return finalOutput
        .split(/\r?\n/)
        .filter(line => line.length > 0)
        .map((line, index) => ({
          id: `loop-output-${index}`,
          index,
          outputDelta: `${line}\n`,
          variableChanges: [],
        }));
    }
  }

  return iterations;
}

function getLoopBodyRanges(cfgs: Record<string, ControlFlowGraph>): { start: number; end: number }[] {
  return Object.values(cfgs).flatMap(cfg => {
    const loopNodeIds = new Set(cfg.nodes.filter(node => node.loopId).map(node => node.id));
    return cfg.nodes
      .filter(node => loopNodeIds.has(node.id))
      .filter(isLoopBodyNode)
      .map(node => node.range)
      .filter((range): range is NonNullable<CfgNode['range']> => Boolean(range))
      .map(range => ({ start: range.startLine, end: range.endLine }));
  });
}

function isLoopBodyNode(node: CfgNode): boolean {
  return node.type !== 'LOOP_INIT' && node.type !== 'LOOP_CONDITION' && node.type !== 'LOOP_UPDATE';
}

function getLoopValue(variables?: Record<string, unknown>): string | undefined {
  if (!variables) return undefined;
  const preferred = ['i', 'j', 'k', 'index'].find(name => variables[name] !== undefined);
  if (preferred) return `${preferred} = ${String(variables[preferred])}`;
  const numeric = Object.entries(variables).find(([, value]) => typeof value === 'number');
  return numeric ? `${numeric[0]} = ${String(numeric[1])}` : undefined;
}

function diffOutput(previous?: string, current?: string): string | undefined {
  if (!current || current === previous) return undefined;
  return current.slice(previous?.length ?? 0);
}

function diffVariables(previous?: Record<string, unknown>, current?: Record<string, unknown>): string[] {
  if (!current) return [];
  return Object.entries(current)
    .filter(([key, value]) => previous?.[key] !== value)
    .map(([key, value]) => `${key} = ${String(value)}`);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '12px', color: '#6e7681', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '32px' }}>↻</div>
      <div style={{ fontSize: '13px', maxWidth: '260px', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
