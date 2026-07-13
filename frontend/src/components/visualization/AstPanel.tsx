import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  type Node, type Edge, type NodeTypes,
  Background, Controls, MiniMap, BackgroundVariant,
  Handle, Position, MarkerType, useNodesState, useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useIdeStore } from '../../store/ideStore';
import type { AstNode as AstNodeType } from '../../types';

// ============================================================
// AST Panel — Live Abstract Syntax Tree
// ============================================================

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const H_GAP = 40;
const V_GAP = 80;

interface LayoutNode {
  node: AstNodeType;
  x: number;
  y: number;
  width: number;
}

// Custom AST node component
function AstNodeComponent({ data }: { data: { type: string; label: string; explanation?: string; hasError?: boolean } }) {
  const { selectAstNode } = useIdeStore();

  const typeColors: Record<string, string> = {
    CompilationUnit: '#7c3aed',
    ClassDeclaration: '#06b6d4',
    InterfaceDeclaration: '#10b981',
    MethodDeclaration: '#f59e0b',
    ConstructorDeclaration: '#f59e0b',
    FieldDeclaration: '#8b949e',
    VariableDeclaration: '#3fb950',
    IfStmt: '#d29922',
    ForStmt: '#f0883e',
    WhileStmt: '#f0883e',
    DoWhileStmt: '#f0883e',
    ForEachStmt: '#f0883e',
    SwitchStmt: '#e879f9',
    TryStmt: '#f85149',
    ReturnStmt: '#3b82f6',
    MethodCallExpr: '#06b6d4',
    ObjectCreationExpr: '#10b981',
    LambdaExpr: '#a78bfa',
    BinaryExpr: '#8b949e',
    default: '#6e7681',
  };

  const color = typeColors[data.type] ?? typeColors.default;
  const borderColor = data.hasError ? '#f85149' : color;

  return (
    <div
      style={{
        background: '#161b22',
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '6px 10px',
        fontSize: '11px',
        cursor: 'pointer',
        minWidth: '130px',
        textAlign: 'center',
        boxShadow: `0 0 8px ${color}20`,
        transition: 'all 0.15s',
      }}
      title={data.explanation ?? ''}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ color: color, fontWeight: 700, fontSize: '10px', marginBottom: '2px' }}>
        {data.type}
      </div>
      <div style={{ color: '#e6edf3', fontSize: '11px', fontFamily: 'JetBrains Mono, monospace' }}>
        {truncate(data.label, 20)}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 8, height: 8 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { astNode: AstNodeComponent };

export function AstPanel() {
  const { analysisResult, selectAstNode } = useIdeStore();

  const { nodes, edges } = useMemo(() => {
    if (!analysisResult?.astRoot) return { nodes: [], edges: [] };
    return buildFlowLayout(analysisResult.astRoot);
  }, [analysisResult?.astRoot]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Sync ReactFlow internal state when computed data changes
  React.useEffect(() => { setFlowNodes(nodes); }, [nodes, setFlowNodes]);
  React.useEffect(() => { setFlowEdges(edges); }, [edges, setFlowEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectAstNode(node.id);
  }, [selectAstNode]);

  if (!analysisResult?.astRoot) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>🌳</div>
        <div style={{ fontSize: '13px' }}>Type Java code to see the AST</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-right"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#30363d', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#30363d' },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#21262d"
          gap={20}
          size={1}
        />
        <Controls style={{ background: '#161b22', border: '1px solid #30363d' }} />
        <MiniMap
          style={{ background: '#0d1117', border: '1px solid #30363d', height: 100 }}
          nodeColor={(n) => {
            const typeColor = n.data?.type ? getNodeColor(n.data.type) : '#444c56';
            return typeColor;
          }}
        />
      </ReactFlow>
    </div>
  );
}

// ============================================================
// Layout Algorithm (simple top-down tree layout)
// ============================================================

function buildFlowLayout(root: AstNodeType): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nodeIndex = 0;

  // Assign x positions using post-order traversal
  const positions = new Map<string, { x: number; y: number }>();

  function calcLayout(node: AstNodeType, depth: number, startX: number): number {
    const children = node.children?.filter(c => c != null) ?? [];

    if (children.length === 0) {
      positions.set(node.id, { x: startX, y: depth * (NODE_HEIGHT + V_GAP) });
      return startX + NODE_WIDTH + H_GAP;
    }

    const childStartX = startX;
    let currentX = childStartX;

    for (const child of children) {
      currentX = calcLayout(child, depth + 1, currentX);
    }

    // Center parent over children
    const firstChildX = positions.get(children[0].id)?.x ?? startX;
    const lastChildX = positions.get(children[children.length - 1].id)?.x ?? currentX;
    const parentX = (firstChildX + lastChildX) / 2;

    positions.set(node.id, { x: parentX, y: depth * (NODE_HEIGHT + V_GAP) });
    return Math.max(currentX, startX + NODE_WIDTH + H_GAP);
  }

  calcLayout(root, 0, 0);

  function addNodes(node: AstNodeType) {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };

    nodes.push({
      id: node.id,
      type: 'astNode',
      position: pos,
      data: {
        type: node.type,
        label: node.label,
        explanation: node.explanation,
        hasError: node.hasError,
      },
      style: { width: NODE_WIDTH },
    });

    const children = node.children?.filter(c => c != null) ?? [];
    for (const child of children) {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: getNodeColor(node.type) + '60', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: getNodeColor(node.type) + '60' },
      });
      addNodes(child);
    }
  }

  addNodes(root);
  return { nodes, edges };
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    CompilationUnit: '#7c3aed',
    ClassDeclaration: '#06b6d4',
    MethodDeclaration: '#f59e0b',
    VariableDeclaration: '#3fb950',
    IfStmt: '#d29922',
    ForStmt: '#f0883e',
    WhileStmt: '#f0883e',
    TryStmt: '#f85149',
    MethodCallExpr: '#06b6d4',
    ObjectCreationExpr: '#10b981',
    LambdaExpr: '#a78bfa',
  };
  return colors[type] ?? '#444c56';
}

function truncate(s: string, max: number): string {
  return s && s.length > max ? s.substring(0, max) + '…' : s ?? '';
}
