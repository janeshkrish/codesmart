import { useMemo } from 'react';
import ReactFlow, {
  Background, BackgroundVariant, Controls, Handle, MarkerType, Position,
  type Edge, type Node, type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useIdeStore } from '../../store/ideStore';
import { useRecursionTrace, type RecursionTraceNode } from '../../hooks/useRecursionTrace';

// ============================================================
// Enhanced Recursion Tree Node
// Shows: active call, completed, cache-hit, returned value, depth
// ============================================================

function RecursionNode({ data }: { data: { traceNode: RecursionTraceNode; isActive: boolean } }) {
  const node = data.traceNode;
  const isActive = data.isActive;
  const isCacheHit = node.cacheStatus === 'cache-hit';
  const isCompleted = node.completed;

  const borderColor = isActive ? '#d29922'
    : isCacheHit ? '#f59e0b'
    : isCompleted ? '#3fb950'
    : '#7c3aed';

  const bgColor = isActive ? 'rgba(210,153,34,0.18)'
    : isCacheHit ? 'rgba(245,158,11,0.12)'
    : isCompleted ? 'rgba(63,185,80,0.12)'
    : 'rgba(124,58,237,0.14)';

  const glowShadow = isActive ? '0 0 16px rgba(210,153,34,0.5)' : `0 0 6px ${borderColor}25`;

  return (
    <div style={{
      minWidth: 130,
      padding: '8px 12px',
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      color: '#e6edf3',
      fontFamily: 'JetBrains Mono, monospace',
      textAlign: 'center',
      opacity: isCompleted && !isActive ? 0.85 : 1,
      boxShadow: glowShadow,
      transition: 'all 0.25s ease',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor }} />

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
        {isActive && (
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#d29922',
            animation: 'pulse-glow 1.5s ease infinite',
          }} />
        )}
        {isCacheHit && <span style={{ fontSize: '10px' }}>⚡</span>}
        {isCompleted && !isCacheHit && <span style={{ fontSize: '10px' }}>✓</span>}
      </div>

      {/* Call label */}
      <div style={{ color: borderColor, fontSize: '11px', fontWeight: 700 }}>
        {node.label}
      </div>

      {/* Depth indicator */}
      <div style={{ color: '#6e7681', fontSize: '9px', marginTop: '2px' }}>
        depth {node.depth}
      </div>

      {/* Status text */}
      <div style={{
        fontSize: '9px', marginTop: '3px',
        color: isActive ? '#d29922'
          : isCacheHit ? '#f59e0b'
          : isCompleted ? '#3fb950'
          : '#a78bfa',
        fontWeight: 600,
      }}>
        {isActive ? '▶ executing'
          : isCacheHit ? 'cache hit'
          : isCompleted ? 'completed'
          : 'pending'}
      </div>

      {/* Return value (for completed nodes) */}
      {isCompleted && node.returnValue !== undefined && (
        <div style={{
          marginTop: '4px', padding: '2px 6px', borderRadius: '4px',
          background: 'rgba(63,185,80,0.15)', border: '1px solid rgba(63,185,80,0.3)',
          fontSize: '10px', color: '#3fb950', fontWeight: 700,
        }}>
          → {String(node.returnValue)}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: borderColor }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { recursionNode: RecursionNode };

export function RecursionTreePanel() {
  const { executionSteps, executionSnapshot } = useIdeStore();
  const trace = useRecursionTrace(executionSteps);

  // Determine the currently active node (top of call stack)
  const activeMethodName = useMemo(() => {
    if (!executionSnapshot?.callStack?.length) return null;
    const topFrame = executionSnapshot.callStack[executionSnapshot.callStack.length - 1];
    return topFrame.methodName;
  }, [executionSnapshot]);

  const layout = useMemo(
    () => buildTreeLayout(trace.nodes, trace.edges, activeMethodName),
    [trace, activeMethodName],
  );

  if (trace.nodes.length === 0) {
    return <EmptyState message="Run or step through a recursive method to see the call tree" />;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div style={{
        padding: '4px 10px', borderBottom: '1px solid #21262d',
        display: 'flex', gap: '12px', fontSize: '10px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#d29922' }}>● Active</span>
        <span style={{ color: '#7c3aed' }}>● Pending</span>
        <span style={{ color: '#3fb950' }}>● Completed</span>
        <span style={{ color: '#f59e0b' }}>⚡ Cache Hit</span>
        <span style={{ marginLeft: 'auto', color: '#6e7681' }}>
          {trace.nodes.length} call{trace.nodes.length !== 1 ? 's' : ''}
        </span>
      </div>
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

export function buildTreeLayout(
  traceNodes: RecursionTraceNode[],
  traceEdges: { id: string; source: string; target: string }[],
  activeMethodName?: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 45, marginx: 40, marginy: 40 });

  traceNodes.forEach(node => graph.setNode(node.id, { width: 160, height: 90 }));
  traceEdges.forEach(edge => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);

  // Find the last active node — the one that matches activeMethodName and is not completed
  const activeNodeId = (() => {
    if (!activeMethodName) return null;
    const candidates = traceNodes.filter(n => n.methodName === activeMethodName && !n.completed);
    return candidates.length > 0 ? candidates[candidates.length - 1].id : null;
  })();

  return {
    nodes: traceNodes.map(node => {
      const position = graph.node(node.id);
      return {
        id: node.id,
        type: 'recursionNode',
        position: { x: position.x - 80, y: position.y - 45 },
        data: {
          traceNode: node,
          isActive: node.id === activeNodeId,
        },
      };
    }),
    edges: traceEdges.map(edge => {
      const sourceNode = traceNodes.find(n => n.id === edge.source);
      const targetNode = traceNodes.find(n => n.id === edge.target);
      const isCacheHitEdge = targetNode?.cacheStatus === 'cache-hit';

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: targetNode?.id === activeNodeId,
        style: {
          stroke: isCacheHitEdge ? '#f59e0b' : '#7c3aed',
          strokeWidth: 1.5,
          strokeDasharray: isCacheHitEdge ? '5 5' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCacheHitEdge ? '#f59e0b' : '#7c3aed',
        },
      };
    }),
  };
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '12px', color: '#6e7681', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '32px' }}>⑂</div>
      <div style={{ fontSize: '13px', maxWidth: '280px', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
