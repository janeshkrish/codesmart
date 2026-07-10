import React, { useMemo } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes,
  Background, Controls, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import { useIdeStore } from '../../store/ideStore';
import type { ClassDiagramNode, RelationshipType } from '../../types';

// ============================================================
// UML Class Diagram Panel
// ============================================================

function ClassNode({ data }: { data: ClassDiagramNode & { selected?: boolean } }) {
  const isInterface = data.kind === 'INTERFACE';
  const isAbstract = data.kind === 'ABSTRACT_CLASS';
  const isEnum = data.kind === 'ENUM';

  const borderColor = isInterface ? '#10b981' : isAbstract ? '#f59e0b' : isEnum ? '#e879f9' : '#06b6d4';
  const headerBg = isInterface ? 'rgba(16,185,129,0.15)' : isAbstract ? 'rgba(245,158,11,0.15)' :
    isEnum ? 'rgba(232,121,249,0.15)' : 'rgba(6,182,212,0.12)';

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
          {data.fields.slice(0, 5).map((f, i) => (
            <div key={i} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
              color: '#8b949e', lineHeight: '1.6' }}>
              {f}
            </div>
          ))}
          {data.fields.length > 5 && (
            <div style={{ fontSize: '10px', color: '#444c56' }}>+{data.fields.length - 5} more</div>
          )}
        </div>
      )}

      {/* Methods */}
      {data.methods && data.methods.length > 0 && (
        <div style={{ padding: '6px 12px' }}>
          {data.methods.slice(0, 5).map((m, i) => (
            <div key={i} style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
              color: '#06b6d4', lineHeight: '1.6' }}>
              {m}
            </div>
          ))}
          {data.methods.length > 5 && (
            <div style={{ fontSize: '10px', color: '#444c56' }}>+{data.methods.length - 5} more</div>
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

export function ClassDiagramPanel() {
  const { analysisResult } = useIdeStore();
  const diagram = analysisResult?.classDiagram;

  const { nodes, edges } = useMemo(() => {
    if (!diagram?.classes?.length) return { nodes: [], edges: [] };

    const NODE_W = 200;
    const H_GAP = 100;
    const V_GAP = 180;

    const flowNodes: Node[] = diagram.classes.map((cls, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return {
        id: cls.id,
        type: 'classNode',
        position: { x: col * (NODE_W + H_GAP), y: row * V_GAP },
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
  }, [diagram]);

  const [flowNodes, , onNodesChange] = useNodesState(nodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(edges);

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
