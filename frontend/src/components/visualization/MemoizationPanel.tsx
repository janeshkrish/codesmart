import { useMemo } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls, Handle, MarkerType, Position,
  type Edge, type Node, type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useIdeStore } from '../../store/ideStore';
import { useRecursionTrace, type RecursionTraceNode } from '../../hooks/useRecursionTrace';
import { extractFirst1DArray, findChangedIndex, type ArrayCellValue } from '../../utils/dpTableExtractor';

type MemoNodeData =
  | { kind: 'call'; traceNode: RecursionTraceNode }
  | { kind: 'memo'; index: number; value: unknown; changed: boolean };

function MemoNode({ data }: { data: MemoNodeData }) {
  if (data.kind === 'memo') {
    return (
      <div style={{
        width: 64,
        height: 58,
        background: data.changed ? 'rgba(63,185,80,0.24)' : 'rgba(22,27,34,0.95)',
        border: `2px solid ${data.changed ? '#3fb950' : '#30363d'}`,
        borderRadius: '6px',
        color: '#e6edf3',
        fontFamily: 'JetBrains Mono, monospace',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <Handle type="target" position={Position.Left} style={{ background: '#3fb950' }} />
        <div style={{ color: '#6e7681', fontSize: '10px' }}>[{data.index}]</div>
        <div style={{ color: data.changed ? '#3fb950' : '#e6edf3', fontSize: '13px', fontWeight: 700 }}>
          {String(data.value ?? 0)}
        </div>
      </div>
    );
  }

  const node = data.traceNode;
  const isHit = node.cacheStatus === 'cache-hit';
  const color = isHit ? '#d29922' : '#7c3aed';

  return (
    <div style={{
      minWidth: 120,
      padding: '8px 12px',
      background: isHit ? 'rgba(210,153,34,0.13)' : 'rgba(124,58,237,0.14)',
      border: `2px solid ${color}`,
      borderRadius: '6px',
      color: '#e6edf3',
      fontFamily: 'JetBrains Mono, monospace',
      textAlign: 'center',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />
      <div style={{ color, fontSize: '11px', fontWeight: 700 }}>{node.label}</div>
      <div style={{ color: '#6e7681', fontSize: '10px', marginTop: '3px' }}>
        {isHit ? 'cache hit' : node.completed ? 'computed' : 'active'}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
      <Handle type="source" id="memo" position={Position.Right} style={{ background: color }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { memoNode: MemoNode };

export function MemoizationPanel() {
  const { executionSteps, currentStepResult, executionSnapshot } = useIdeStore();
  const trace = useRecursionTrace(executionSteps);

  // ─── Pull memo data from execution engine snapshot first ─────────────────
  const snapMemoValues = useMemo(() => {
    if (!executionSnapshot) return null;
    // Try 1D DP arrays (memo/cache/dp)
    const arr = executionSnapshot.dpArrays.find(d => d.dimensions === 1 && d.values1D && d.values1D.length > 0);
    if (arr?.values1D) return { variableName: arr.name, values: arr.values1D as ArrayCellValue[] };
    return null;
  }, [executionSnapshot]);

  const snapLastChanged = executionSnapshot?.dpArrays.find(d => d.dimensions === 1)?.lastChangedIndex?.index;
  const memoLastAction = executionSnapshot?.memoCache?.lastAction;
  const memoLastKey = executionSnapshot?.memoCache?.lastKey;

  // ─── Fallback: extract from memory snapshots ─────────────────────────────
  const previousMemo = useMemo(
    () => extractFirst1DArray(executionSteps.length > 1 ? executionSteps[executionSteps.length - 2]?.memorySnapshot : null),
    [executionSteps],
  );
  const memo = useMemo(
    () => snapMemoValues ?? extractFirst1DArray(currentStepResult?.memorySnapshot ?? executionSteps.at(-1)?.memorySnapshot),
    [snapMemoValues, currentStepResult, executionSteps],
  );
  const changedIndex = useMemo(() => findChangedIndex(previousMemo, memo), [previousMemo, memo]);
  const effectiveChangedIndex = changedIndex?.index ?? snapLastChanged;
  const layout = useMemo(
    () => buildMemoLayout(trace.nodes, trace.edges, memo?.values ?? [], effectiveChangedIndex, memoLastAction, memoLastKey),
    [trace, memo, effectiveChangedIndex, memoLastAction, memoLastKey],
  );

  if (trace.nodes.length === 0 && !memo) {
    return <EmptyState message="Run a memoized recursive method to see calls, cache hits, and memo writes" />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Memo status indicator */}
      {memoLastAction && (
        <div style={{
          padding: '4px 12px', borderBottom: '1px solid #21262d',
          display: 'flex', alignItems: 'center', gap: '8px',
          background: memoLastAction === 'hit' ? 'rgba(210,153,34,0.08)'
            : memoLastAction === 'store' ? 'rgba(63,185,80,0.08)'
            : 'rgba(248,81,73,0.08)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700,
            color: memoLastAction === 'hit' ? '#d29922'
              : memoLastAction === 'store' ? '#3fb950'
              : '#f85149' }}>
            {memoLastAction === 'hit' ? '⚡ Cache Hit' : memoLastAction === 'store' ? '💾 Stored' : '❌ Cache Miss'}
          </span>
          {memoLastKey && (
            <span style={{ fontSize: '10px', color: '#8b949e', fontFamily: 'monospace' }}>
              key: {memoLastKey}
            </span>
          )}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={layout.nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} color="#21262d" gap={20} size={1} />
          <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        </ReactFlow>
      </div>
    </div>
  );
}

function buildMemoLayout(
  traceNodes: RecursionTraceNode[],
  traceEdges: { id: string; source: string; target: string }[],
  memoValues: unknown[],
  changedIndex?: number,
  lastAction?: string,
  lastKey?: string,
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 45, marginx: 40, marginy: 40 });
  traceNodes.forEach(node => graph.setNode(node.id, { width: 140, height: 70 }));
  traceEdges.forEach(edge => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  const treeNodes: Node[] = traceNodes.map(node => {
    const position = graph.node(node.id) ?? { x: 80, y: 80 };
    return {
      id: node.id,
      type: 'memoNode',
      position: { x: position.x - 70, y: position.y - 35 },
      data: { kind: 'call', traceNode: node } satisfies MemoNodeData,
    };
  });

  const maxTreeX = treeNodes.length > 0
    ? Math.max(...treeNodes.map(node => node.position.x + 150))
    : 80;
  const memoX = maxTreeX + 140;
  const memoY = 80;
  const memoNodes: Node[] = memoValues.map((value, index) => ({
    id: `memo-${index}`,
    type: 'memoNode',
    position: { x: memoX, y: memoY + index * 72 },
    data: { kind: 'memo', index, value, changed: changedIndex === index } satisfies MemoNodeData,
  }));

  const callEdges: Edge[] = traceEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    style: { stroke: '#7c3aed', strokeWidth: 1.4 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' },
  }));

  const memoEdges: Edge[] = traceNodes
    .filter(node => node.memoIndex !== undefined && memoValues[node.memoIndex] !== undefined)
    .map(node => {
      const isHit = node.cacheStatus === 'cache-hit';
      const color = isHit ? '#d29922' : '#3fb950';
      return {
        id: `memo-edge-${node.id}-${node.memoIndex}`,
        source: node.id,
        sourceHandle: 'memo',
        target: `memo-${node.memoIndex}`,
        type: 'smoothstep',
        label: isHit ? 'cache hit' : 'store',
        labelStyle: { fill: color, fontSize: 10 },
        labelBgStyle: { fill: '#0d1117' },
        style: { stroke: color, strokeWidth: 1.5, strokeDasharray: isHit ? '5 5' : undefined },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      } satisfies Edge;
    });

  return { nodes: [...treeNodes, ...memoNodes], edges: [...callEdges, ...memoEdges] };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '12px', color: '#6e7681', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '32px' }}>⇥</div>
      <div style={{ fontSize: '13px', maxWidth: '320px', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
