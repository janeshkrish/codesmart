import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes, type EdgeTypes, type EdgeProps,
  BaseEdge, EdgeLabelRenderer,
  Background, Controls, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import dagre from '@dagrejs/dagre';
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
      <Handle type="target" position={Position.Left} style={config.handleStyle} />
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
      <Handle type="source" position={Position.Right} style={config.handleStyle} />
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

function LoopGroupComponent() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      border: '1px dashed rgba(139,92,246,0.65)',
      background: 'rgba(124,58,237,0.06)',
      borderRadius: '8px',
      pointerEvents: 'none',
    }} />
  );
}

type LoopBackEdgeData = {
  color: string;
  routeY?: number;
};

function LoopBackEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
  data,
}: EdgeProps<LoopBackEdgeData>) {
  const color = data?.color ?? '#7c3aed';
  const routeY = data?.routeY ?? Math.max(sourceY, targetY) + 80;
  const edgePath = `M ${sourceX},${sourceY} L ${sourceX},${routeY} L ${targetX},${routeY} L ${targetX},${targetY}`;
  const labelX = (sourceX + targetX) / 2;
  const labelY = routeY - 10;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            color,
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            background: '#0d1117',
            padding: '1px 4px',
            borderRadius: '3px',
            pointerEvents: 'none',
          }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes: NodeTypes = { cfgNode: CfgNodeComponent, loopGroup: LoopGroupComponent };
const edgeTypes: EdgeTypes = { loopBack: LoopBackEdge };

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

  const { currentExecutionLine, executionSnapshot } = useIdeStore();
  const visitedLines = executionSnapshot?.visitedLines ?? new Set<number>();
  const branchDecisions = executionSnapshot?.branchDecisions ?? [];

  const { nodes, edges } = useMemo(() => {
    if (!activeCfg) return { nodes: [], edges: [] };
    return buildCfgLayout(activeCfg);
  }, [activeCfg]);

  // Highlight nodes based on execution state
  const highlightedNodes = useMemo(() => {
    if (!currentExecutionLine && visitedLines.size === 0) return nodes;
    return nodes.map(node => {
      const nodeStartLine = node.data?.range?.startLine;
      const nodeEndLine = node.data?.range?.endLine;
      const isCurrent = nodeStartLine && currentExecutionLine &&
        currentExecutionLine >= nodeStartLine && currentExecutionLine <= (nodeEndLine ?? nodeStartLine);
      const isVisited = nodeStartLine && visitedLines.has(nodeStartLine);

      if (isCurrent) {
        return { ...node, style: { ...node.style, boxShadow: '0 0 12px rgba(210,153,34,0.6)', border: '2px solid #d29922' } };
      }
      if (isVisited) {
        return { ...node, style: { ...node.style, opacity: 1, border: '1px solid #3fb950' } };
      }
      return node;
    });
  }, [nodes, currentExecutionLine, visitedLines]);

  // Highlight edges based on branch decisions
  const highlightedEdges = useMemo(() => {
    if (branchDecisions.length === 0) return edges;
    return edges.map(edge => {
      const decision = branchDecisions.find(bd => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        return sourceNode?.data?.range?.startLine === bd.line;
      });
      if (decision) {
        const isTaken = (edge.data?.label === 'TRUE' && decision.result) ||
                        (edge.data?.label === 'FALSE' && !decision.result);
        if (isTaken) {
          return { ...edge, style: { ...edge.style, stroke: '#3fb950', strokeWidth: 2.5 }, animated: true };
        }
      }
      return edge;
    });
  }, [edges, branchDecisions, nodes]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(highlightedNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(highlightedEdges);

  // Sync ReactFlow internal state when computed data changes
  React.useEffect(() => { setFlowNodes(highlightedNodes); }, [highlightedNodes, setFlowNodes]);
  React.useEffect(() => { setFlowEdges(highlightedEdges); }, [highlightedEdges, setFlowEdges]);

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
          edgeTypes={edgeTypes}
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
// Layout: dagre left-to-right ranks with loop swimlanes
// ============================================================

const CFG_NODE_WIDTH = 180;
const CFG_NODE_HEIGHT = 70;
const LOOP_PADDING_X = 36;
const LOOP_PADDING_Y = 30;

type Point = { x: number; y: number };
type LoopBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  routeY: number;
};

export function buildCfgLayout(cfg: ControlFlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  if (!cfg.nodes || !cfg.edges) return { nodes, edges };

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'LR',
    ranksep: 120,
    nodesep: 80,
    marginx: 40,
    marginy: 40,
    acyclicer: 'greedy',
  });

  cfg.nodes.forEach(n => {
    graph.setNode(n.id, { width: CFG_NODE_WIDTH, height: CFG_NODE_HEIGHT });
  });

  cfg.edges
    .filter(e => !e.isBackEdge)
    .forEach(e => {
      graph.setEdge(e.sourceId, e.targetId);
    });

  dagre.layout(graph);

  const positions = new Map<string, Point>();
  cfg.nodes.forEach(n => {
    const layoutNode = graph.node(n.id);
    positions.set(n.id, {
      x: layoutNode.x - CFG_NODE_WIDTH / 2,
      y: layoutNode.y - CFG_NODE_HEIGHT / 2,
    });
  });

  const loopBounds = buildLoopBounds(cfg.nodes, positions);

  loopBounds.forEach((bounds, loopId) => {
    nodes.push({
      id: `loop-group-${loopId}`,
      type: 'loopGroup',
      position: { x: bounds.x, y: bounds.y },
      data: {},
      selectable: false,
      draggable: false,
      connectable: false,
      zIndex: -1,
      style: {
        width: bounds.width,
        height: bounds.height,
      },
    });
  });

  cfg.nodes.forEach(n => {
    const pos = positions.get(n.id) ?? { x: 0, y: 0 };
    nodes.push({
      id: n.id,
      type: 'cfgNode',
      position: pos,
      data: { node: n },
    });
  });

  const nodesById = new Map(cfg.nodes.map(node => [node.id, node]));

  cfg.edges.forEach(e => {
    const edgeColor = e.isBackEdge ? '#7c3aed' :
      e.label === 'TRUE' ? '#3fb950' :
      e.label === 'FALSE' ? '#f85149' :
      e.label === 'EXCEPTION' ? '#f0883e' :
      '#30363d';
    const sourceNode = nodesById.get(e.sourceId);
    const targetNode = nodesById.get(e.targetId);
    const loopId = sourceNode?.loopId ?? targetNode?.loopId;
    const routeY = loopId ? loopBounds.get(loopId)?.routeY : undefined;

    edges.push({
      id: e.id,
      source: e.sourceId,
      target: e.targetId,
      type: e.isBackEdge ? 'loopBack' : 'smoothstep',
      animated: e.isBackEdge,
      data: e.isBackEdge ? { color: edgeColor, routeY } : undefined,
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

function buildLoopBounds(cfgNodes: CfgNode[], positions: Map<string, Point>): Map<string, LoopBounds> {
  const nodesByLoop = new Map<string, CfgNode[]>();

  cfgNodes.forEach(node => {
    if (!node.loopId) return;
    const loopNodes = nodesByLoop.get(node.loopId) ?? [];
    loopNodes.push(node);
    nodesByLoop.set(node.loopId, loopNodes);
  });

  const loopBounds = new Map<string, LoopBounds>();
  nodesByLoop.forEach((loopNodes, loopId) => {
    const positioned = loopNodes
      .map(node => positions.get(node.id))
      .filter((position): position is Point => Boolean(position));

    if (positioned.length === 0) return;

    const minX = Math.min(...positioned.map(position => position.x));
    const minY = Math.min(...positioned.map(position => position.y));
    const maxX = Math.max(...positioned.map(position => position.x + CFG_NODE_WIDTH));
    const maxY = Math.max(...positioned.map(position => position.y + CFG_NODE_HEIGHT));
    const x = minX - LOOP_PADDING_X;
    const y = minY - LOOP_PADDING_Y;
    const width = maxX - minX + LOOP_PADDING_X * 2;
    const height = maxY - minY + LOOP_PADDING_Y * 2;

    loopBounds.set(loopId, {
      x,
      y,
      width,
      height,
      routeY: y + height - 14,
    });
  });

  return loopBounds;
}

function truncate(s: string, max: number): string {
  return s && s.length > max ? s.substring(0, max) + '…' : s ?? '';
}
