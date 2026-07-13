import React, { useMemo } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes,
  Background, Controls, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import { useIdeStore } from '../../store/ideStore';

// ============================================================
// Call Graph Panel — Dagre Layout
// Shows method → method call relationships
// Recursion displayed as self-loops
// ============================================================

function CallGraphNodeComponent({ data }: { data: {
  methodName: string; className?: string; isEntry?: boolean;
  isRecursive?: boolean; isExternal?: boolean; signature?: string;
}}) {
  const borderColor = data.isEntry ? '#3fb950' :
    data.isRecursive ? '#e879f9' :
    data.isExternal ? '#8b949e' : '#06b6d4';

  const bg = data.isEntry ? 'rgba(63,185,80,0.12)' :
    data.isRecursive ? 'rgba(232,121,249,0.12)' :
    data.isExternal ? 'rgba(139,148,158,0.08)' : 'rgba(6,182,212,0.10)';

  return (
    <div style={{
      background: bg,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      padding: '8px 14px',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: '130px',
      textAlign: 'center',
      boxShadow: `0 0 12px ${borderColor}20`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor }} />
      {data.isEntry && (
        <div style={{ fontSize: '10px', color: '#3fb950', marginBottom: '2px' }}>ENTRY</div>
      )}
      {data.isRecursive && (
        <div style={{ fontSize: '10px', color: '#e879f9', marginBottom: '2px' }}>🔁 RECURSIVE</div>
      )}
      {data.className && (
        <div style={{ fontSize: '10px', color: '#8b949e' }}>{data.className}</div>
      )}
      <div style={{ color: '#e6edf3', fontWeight: 700 }}>{data.methodName}</div>
      {data.isExternal && (
        <div style={{ fontSize: '10px', color: '#6e7681' }}>external</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: borderColor }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { callNode: CallGraphNodeComponent };

// ============================================================
// Dagre layout for call graphs
// ============================================================
function buildCallGraphLayout(callGraph: { nodes: any[]; edges: any[] }) {
  const NODE_W = 160;
  const NODE_H = 80;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    ranksep: 100,
    nodesep: 60,
    marginx: 40,
    marginy: 40,
  });

  callGraph.nodes.forEach(n => {
    graph.setNode(n.id, { width: NODE_W, height: NODE_H });
  });

  // Only add non-self-loop edges for layout
  callGraph.edges.forEach(e => {
    if (e.callerId !== e.calleeId) {
      graph.setEdge(e.callerId, e.calleeId);
    }
  });

  dagre.layout(graph);

  const flowNodes: Node[] = callGraph.nodes.map(n => {
    const layoutNode = graph.node(n.id);
    return {
      id: n.id,
      type: 'callNode',
      position: {
        x: layoutNode.x - NODE_W / 2,
        y: layoutNode.y - NODE_H / 2,
      },
      data: {
        methodName: n.methodName,
        className: n.className,
        isEntry: n.isEntry,
        isRecursive: n.isRecursive,
        isExternal: n.isExternal,
        signature: n.signature,
      },
    };
  });

  const flowEdges: Edge[] = callGraph.edges.map(e => ({
    id: e.id,
    source: e.callerId,
    target: e.calleeId,
    type: 'smoothstep',
    animated: e.isRecursiveCall,
    style: {
      stroke: e.isRecursiveCall ? '#e879f9' : '#06b6d4',
      strokeWidth: e.isRecursiveCall ? 2 : 1.5,
      strokeDasharray: e.isRecursiveCall ? '6 3' : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: e.isRecursiveCall ? '#e879f9' : '#06b6d4' },
    label: e.isRecursiveCall ? 'recursive' : undefined,
    labelStyle: { fill: '#e879f9', fontSize: 10 },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

export function CallGraphPanel() {
  const { analysisResult } = useIdeStore();
  const callGraph = analysisResult?.callGraph;

  const { nodes, edges } = useMemo(() => {
    if (!callGraph?.nodes?.length) return { nodes: [], edges: [] };
    return buildCallGraphLayout(callGraph);
  }, [callGraph]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync ReactFlow internal state when computed data changes
  React.useEffect(() => { setFlowNodes(nodes); }, [nodes, setFlowNodes]);
  React.useEffect(() => { setFlowEdges(edges); }, [edges, setFlowEdges]);

  if (!callGraph?.nodes?.length) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>📞</div>
        <div style={{ fontSize: '13px' }}>Write methods that call each other</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div style={{
        padding: '4px 10px', borderBottom: '1px solid #21262d',
        display: 'flex', gap: '12px', fontSize: '10px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ color: '#3fb950' }}>● Entry</span>
        <span style={{ color: '#06b6d4' }}>── Call</span>
        <span style={{ color: '#e879f9' }}>🔁 Recursive</span>
        <span style={{ color: '#8b949e' }}>○ External</span>
        <span style={{ marginLeft: 'auto', color: '#6e7681' }}>
          {callGraph.nodes.length} method{callGraph.nodes.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
        >
          <Background variant={BackgroundVariant.Dots} color="#21262d" gap={20} size={1} />
          <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        </ReactFlow>
      </div>
    </div>
  );
}
