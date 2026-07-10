import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes,
  Background, Controls, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import { useIdeStore } from '../../store/ideStore';
import type { ControlFlowGraph, CfgNode, CfgNodeType } from '../../types';

// ============================================================
// Flowchart Panel — Control Flow Graphs
// Shows for/while/if-else/switch/try-catch as flowcharts
// ============================================================

function CfgNodeComponent({ data }: { data: { node: CfgNode } }) {
  const n = data.node;

  const config = getCfgNodeConfig(n.type);

  return (
    <div style={{
      ...config.style,
      minWidth: '120px',
      maxWidth: '200px',
      fontSize: '11px',
      fontFamily: 'JetBrains Mono, monospace',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.15s',
      padding: '6px 10px',
    }}>
      <Handle type="target" position={Position.Top} style={config.handleStyle} />
      <div style={{ color: config.color, fontWeight: 700, fontSize: '10px', marginBottom: '2px' }}>
        {config.icon} {n.type.replace(/_/g, ' ')}
      </div>
      <div style={{ color: '#e6edf3', fontSize: '11px', lineHeight: '1.4' }}>
        {truncate(n.label, 30)}
      </div>
      {n.condition && (
        <div style={{ color: '#d29922', fontSize: '10px', marginTop: '2px',
          fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2px' }}>
          {truncate(n.condition, 25)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={config.handleStyle} />
    </div>
  );
}

function getCfgNodeConfig(type: CfgNodeType) {
  const configs: Partial<Record<CfgNodeType, {
    style: React.CSSProperties;
    color: string;
    handleStyle: React.CSSProperties;
    icon: string;
  }>> = {
    START: {
      style: {
        background: 'rgba(63,185,80,0.15)',
        border: '2px solid #3fb950',
        borderRadius: '50px',
      },
      color: '#3fb950', handleStyle: { background: '#3fb950' }, icon: '▶',
    },
    END: {
      style: {
        background: 'rgba(248,81,73,0.15)',
        border: '2px solid #f85149',
        borderRadius: '50px',
      },
      color: '#f85149', handleStyle: { background: '#f85149' }, icon: '⏹',
    },
    DECISION: {
      style: {
        background: 'rgba(210,153,34,0.15)',
        border: '2px solid #d29922',
        borderRadius: '6px',
        transform: 'rotate(0deg)',
      },
      color: '#d29922', handleStyle: { background: '#d29922' }, icon: '◆',
    },
    LOOP_CONDITION: {
      style: {
        background: 'rgba(240,136,62,0.15)',
        border: '2px solid #f0883e',
        borderRadius: '6px',
      },
      color: '#f0883e', handleStyle: { background: '#f0883e' }, icon: '🔄',
    },
    LOOP_INIT: {
      style: {
        background: 'rgba(124,58,237,0.15)',
        border: '1px solid #7c3aed',
        borderRadius: '6px',
      },
      color: '#a78bfa', handleStyle: { background: '#7c3aed' }, icon: '🔢',
    },
    LOOP_UPDATE: {
      style: {
        background: 'rgba(6,182,212,0.1)',
        border: '1px solid #06b6d4',
        borderRadius: '6px',
      },
      color: '#06b6d4', handleStyle: { background: '#06b6d4' }, icon: '⬆️',
    },
    CATCH_BLOCK: {
      style: {
        background: 'rgba(248,81,73,0.1)',
        border: '1px solid #f85149',
        borderRadius: '6px',
      },
      color: '#f85149', handleStyle: { background: '#f85149' }, icon: '🚨',
    },
    FINALLY_BLOCK: {
      style: {
        background: 'rgba(139,148,158,0.1)',
        border: '1px solid #8b949e',
        borderRadius: '6px',
      },
      color: '#8b949e', handleStyle: { background: '#8b949e' }, icon: '✅',
    },
    RETURN: {
      style: {
        background: 'rgba(59,130,246,0.1)',
        border: '1px solid #3b82f6',
        borderRadius: '6px',
      },
      color: '#3b82f6', handleStyle: { background: '#3b82f6' }, icon: '↩️',
    },
    THROW: {
      style: {
        background: 'rgba(248,81,73,0.1)',
        border: '2px dashed #f85149',
        borderRadius: '6px',
      },
      color: '#f85149', handleStyle: { background: '#f85149' }, icon: '💥',
    },
    SWITCH_HEADER: {
      style: {
        background: 'rgba(232,121,249,0.1)',
        border: '2px solid #e879f9',
        borderRadius: '6px',
      },
      color: '#e879f9', handleStyle: { background: '#e879f9' }, icon: '⇨',
    },
  };

  return configs[type] ?? {
    style: {
      background: 'rgba(22,27,34,0.9)',
      border: '1px solid #30363d',
      borderRadius: '6px',
    },
    color: '#8b949e', handleStyle: { background: '#8b949e' }, icon: '●',
  };
}

const nodeTypes: NodeTypes = { cfgNode: CfgNodeComponent };

export function FlowchartPanel() {
  const { analysisResult } = useIdeStore();
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  const cfgs = analysisResult?.controlFlowGraphs ?? {};
  const methodIds = Object.keys(cfgs);

  // Auto-select first method
  React.useEffect(() => {
    if (methodIds.length > 0 && !selectedMethod) {
      setSelectedMethod(methodIds[0]);
    }
  }, [methodIds.length]);

  const activeCfg = selectedMethod ? cfgs[selectedMethod] : null;

  const { nodes, edges } = useMemo(() => {
    if (!activeCfg) return { nodes: [], edges: [] };
    return buildCfgLayout(activeCfg);
  }, [activeCfg]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

  if (methodIds.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>⚡</div>
        <div style={{ fontSize: '13px' }}>Write a method to see its flowchart</div>
        <div style={{ fontSize: '11px', color: '#444c56', maxWidth: '200px', textAlign: 'center' }}>
          Try: for loops, if-else statements, while loops, try-catch
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Method selector */}
      {methodIds.length > 1 && (
        <div style={{
          padding: '6px 8px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          {methodIds.map(id => (
            <button
              key={id}
              onClick={() => setSelectedMethod(id)}
              style={{
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                background: selectedMethod === id ? 'rgba(124,58,237,0.2)' : 'transparent',
                border: `1px solid ${selectedMethod === id ? '#7c3aed' : '#30363d'}`,
                color: selectedMethod === id ? '#a78bfa' : '#8b949e',
                cursor: 'pointer',
              }}
            >
              {cfgs[id]?.methodName ?? id}()
            </button>
          ))}
        </div>
      )}

      {/* CFG Legend */}
      <div style={{
        padding: '4px 8px',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        gap: '10px',
        fontSize: '10px',
        color: '#6e7681',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span>▶ Start/End</span>
        <span style={{ color: '#d29922' }}>◆ Decision</span>
        <span style={{ color: '#f0883e' }}>🔄 Loop</span>
        <span style={{ color: '#f85149' }}>🚨 Catch</span>
        <span style={{ color: '#3b82f6' }}>↩️ Return</span>
        <span style={{ color: '#8b5cf6' }}>--- Back edge</span>
      </div>

      {/* Flow chart */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#30363d' },
          }}
        >
          <Background variant={BackgroundVariant.Dots} color="#21262d" gap={20} size={1} />
          <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        </ReactFlow>
      </div>
    </div>
  );
}

// ============================================================
// Layout: top-to-bottom, 200px per node
// ============================================================

function buildCfgLayout(cfg: ControlFlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!cfg.nodes || !cfg.edges) return { nodes, edges };

  // Simple vertical layout: each node stacked, with branching side-by-side
  const visited = new Set<string>();
  const positions = new Map<string, { x: number; y: number }>();

  // BFS layout
  const queue: { id: string; x: number; y: number }[] = [];
  const entryNode = cfg.nodes.find(n => n.isEntry);
  if (entryNode) {
    queue.push({ id: entryNode.id, x: 0, y: 0 });
  } else if (cfg.nodes.length > 0) {
    queue.push({ id: cfg.nodes[0].id, x: 0, y: 0 });
  }

  let maxY = 0;
  const levelX = new Map<number, number>(); // track x per depth level

  while (queue.length > 0) {
    const { id, x, y } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);

    positions.set(id, { x, y });
    maxY = Math.max(maxY, y);

    // Find children
    const outEdges = cfg.edges.filter(e => e.sourceId === id && !e.isBackEdge);
    let childX = x;

    for (const edge of outEdges) {
      if (!visited.has(edge.targetId)) {
        const isTrue = edge.label === 'TRUE';
        const isFalse = edge.label === 'FALSE';
        const offsetX = isTrue ? -120 : isFalse ? 120 : 0;
        queue.push({ id: edge.targetId, x: x + offsetX, y: y + 150 });
      }
    }
  }

  // Add remaining unvisited nodes
  cfg.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      positions.set(n.id, { x: 0, y: maxY + 150 });
      maxY += 150;
    }
  });

  // Build React Flow nodes
  cfg.nodes.forEach(n => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    nodes.push({
      id: n.id,
      type: 'cfgNode',
      position: pos,
      data: { node: n },
    });
  });

  // Build React Flow edges
  cfg.edges.forEach(e => {
    const edgeColor = e.isBackEdge ? '#7c3aed' :
      e.label === 'TRUE' ? '#3fb950' :
      e.label === 'FALSE' ? '#f85149' :
      e.label === 'EXCEPTION' ? '#f0883e' :
      '#30363d';

    edges.push({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      type: e.isBackEdge ? 'smoothstep' : 'smoothstep',
      animated: e.isBackEdge,
      style: {
        stroke: edgeColor,
        strokeWidth: 1.5,
        strokeDasharray: e.isBackEdge ? '5 5' : undefined,
      },
      label: e.label && e.label !== 'NORMAL' ? e.label : undefined,
      labelStyle: { fill: edgeColor, fontSize: 10 },
      labelBgStyle: { fill: '#0d1117' },
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
    });
  });

  return { nodes, edges };
}

function truncate(s: string, max: number): string {
  return s && s.length > max ? s.substring(0, max) + '…' : s ?? '';
}
