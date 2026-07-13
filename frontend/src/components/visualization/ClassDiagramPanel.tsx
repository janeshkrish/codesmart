import React, { useMemo } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes,
  Background, Controls, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import { useIdeStore } from '../../store/ideStore';
import type { ClassDiagramNode, RelationshipType } from '../../types';

// ============================================================
// UML Class Diagram Panel — Dagre Layout
// ============================================================

function ClassNode({ data }: { data: ClassDiagramNode & { selected?: boolean } }) {
  const isInterface = data.kind === 'INTERFACE';
  const isAbstract = data.kind === 'ABSTRACT_CLASS';
  const isEnum = data.kind === 'ENUM';
  const isRecord = data.kind === 'RECORD';

  const borderColor = isInterface ? '#10b981' : isAbstract ? '#f59e0b' : isEnum ? '#e879f9' : isRecord ? '#f0883e' : '#06b6d4';
  const headerBg = isInterface ? 'rgba(16,185,129,0.15)' : isAbstract ? 'rgba(245,158,11,0.15)' :
    isEnum ? 'rgba(232,121,249,0.15)' : isRecord ? 'rgba(240,136,62,0.15)' : 'rgba(6,182,212,0.12)';

  return (
    <div style={{
      background: '#161b22',
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
      minWidth: '160px',
      boxShadow: `0 4px 16px ${borderColor}20`,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor }} />

      {/* Class header */}
      <div style={{ background: headerBg, padding: '6px 12px', borderBottom: `1px solid ${borderColor}30` }}>
        {isInterface && (
          <div style={{ fontSize: '10px', color: '#10b981', fontStyle: 'italic', marginBottom: '2px' }}>
            «interface»
          </div>
        )}
        {isAbstract && (
          <div style={{ fontSize: '10px', color: '#f59e0b', fontStyle: 'italic', marginBottom: '2px' }}>
            «abstract»
          </div>
        )}
        {isEnum && (
          <div style={{ fontSize: '10px', color: '#e879f9', fontStyle: 'italic', marginBottom: '2px' }}>
            «enum»
          </div>
        )}
        {isRecord && (
          <div style={{ fontSize: '10px', color: '#f0883e', fontStyle: 'italic', marginBottom: '2px' }}>
            «record»
          </div>
        )}
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', fontFamily: 'JetBrains Mono, monospace' }}>
          {data.name}
          {data.typeParameters && data.typeParameters.length > 0 && (
            <span style={{ color: '#8b949e', fontSize: '11px' }}>
              &lt;{data.typeParameters.join(', ')}&gt;
            </span>
          )}
        </div>
      </div>

      {/* Fields */}
      {data.fields && data.fields.length > 0 && (
        <div style={{ padding: '6px 12px', borderBottom: '1px solid #21262d' }}>
          {data.fields.slice(0, 6).map((f, i) => (
            <div key={i} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
              color: '#8b949e', lineHeight: '1.6' }}>
              {f}
            </div>
          ))}
          {data.fields.length > 6 && (
            <div style={{ fontSize: '10px', color: '#444c56' }}>+{data.fields.length - 6} more</div>
          )}
        </div>
      )}

      {/* Methods */}
      {data.methods && data.methods.length > 0 && (
        <div style={{ padding: '6px 12px' }}>
          {data.methods.slice(0, 6).map((m, i) => (
            <div key={i} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
              color: '#06b6d4', lineHeight: '1.6' }}>
              {m}
            </div>
          ))}
          {data.methods.length > 6 && (
            <div style={{ fontSize: '10px', color: '#444c56' }}>+{data.methods.length - 6} more</div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: borderColor }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { classNode: ClassNode };

const EDGE_CONFIGS: Record<RelationshipType, { color: string; label: string; dashArray?: string; markerEnd: string }> = {
  INHERITANCE: { color: '#06b6d4', label: 'extends', markerEnd: 'hollow-triangle' },
  IMPLEMENTATION: { color: '#10b981', label: 'implements', dashArray: '6 3', markerEnd: 'hollow-triangle' },
  COMPOSITION: { color: '#f59e0b', label: 'has', markerEnd: 'filled-diamond' },
  AGGREGATION: { color: '#d29922', label: 'has', markerEnd: 'hollow-diamond' },
  DEPENDENCY: { color: '#8b949e', label: 'uses', dashArray: '4 4', markerEnd: 'arrow' },
  ASSOCIATION: { color: '#6e7681', label: '', markerEnd: 'arrow' },
  REALIZATION: { color: '#10b981', label: 'realizes', dashArray: '6 3', markerEnd: 'hollow-triangle' },
};

// ============================================================
// Dagre layout for class diagrams
// ============================================================
function buildClassDiagramLayout(diagram: { classes: ClassDiagramNode[]; relationships: { id: string; sourceId: string; targetId: string; type: RelationshipType; label?: string }[] }) {
  const NODE_W = 200;
  const NODE_H = 100;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    ranksep: 120,
    nodesep: 80,
    marginx: 40,
    marginy: 40,
  });

  // Add nodes
  diagram.classes.forEach(cls => {
    // Estimate node height based on content
    const fieldCount = cls.fields?.length ?? 0;
    const methodCount = cls.methods?.length ?? 0;
    const estimatedHeight = 50 + Math.min(fieldCount, 6) * 18 + Math.min(methodCount, 6) * 18;
    graph.setNode(cls.id, { width: NODE_W, height: Math.max(NODE_H, estimatedHeight) });
  });

  // Add edges — inheritance/implementation edges get higher priority
  diagram.relationships.forEach(rel => {
    graph.setEdge(rel.sourceId, rel.targetId);
  });

  dagre.layout(graph);

  const flowNodes: Node[] = diagram.classes.map(cls => {
    const layoutNode = graph.node(cls.id);
    return {
      id: cls.id,
      type: 'classNode',
      position: {
        x: layoutNode.x - NODE_W / 2,
        y: layoutNode.y - (layoutNode.height ?? NODE_H) / 2,
      },
      data: cls,
    };
  });

  const flowEdges: Edge[] = diagram.relationships.map(rel => {
    const config = EDGE_CONFIGS[rel.type] ?? EDGE_CONFIGS.ASSOCIATION;
    return {
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      type: 'smoothstep',
      animated: rel.type === 'DEPENDENCY',
      style: {
        stroke: config.color,
        strokeWidth: 2,
        strokeDasharray: config.dashArray,
      },
      label: rel.label ?? config.label,
      labelStyle: { fill: config.color, fontSize: 10 },
      labelBgStyle: { fill: '#0d1117', fillOpacity: 0.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color: config.color },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}

export function ClassDiagramPanel() {
  const { analysisResult } = useIdeStore();
  const diagram = analysisResult?.classDiagram;

  const { nodes, edges } = useMemo(() => {
    if (!diagram?.classes?.length) return { nodes: [], edges: [] };
    return buildClassDiagramLayout(diagram);
  }, [diagram]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync ReactFlow internal state when computed data changes
  React.useEffect(() => { setFlowNodes(nodes); }, [nodes, setFlowNodes]);
  React.useEffect(() => { setFlowEdges(edges); }, [edges, setFlowEdges]);

  if (!diagram?.classes?.length) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>📐</div>
        <div style={{ fontSize: '13px' }}>Write classes to see the UML diagram</div>
        <div style={{ fontSize: '11px', color: '#444c56', textAlign: 'center', maxWidth: '200px' }}>
          Try: extends, implements, class with fields and methods
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Legend */}
      <div style={{
        padding: '4px 10px',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        gap: '12px',
        fontSize: '10px',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        <span style={{ color: '#06b6d4' }}>── extends</span>
        <span style={{ color: '#10b981' }}>- - implements</span>
        <span style={{ color: '#f59e0b' }}>◆── composition</span>
        <span style={{ color: '#d29922' }}>◇── aggregation</span>
        <span style={{ color: '#8b949e' }}>- - dependency</span>
        <span style={{ marginLeft: 'auto', color: '#6e7681' }}>
          {diagram.classes.length} class{diagram.classes.length !== 1 ? 'es' : ''}
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
