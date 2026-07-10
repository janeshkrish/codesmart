import React from 'react';
import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import type { CollectionUsage, HeapObject } from '../../types';

// ============================================================
// Collections Visualization Panel
// Shows internal structure of ArrayList, LinkedList, HashMap, etc.
// ============================================================

export function CollectionsPanel() {
  const { analysisResult } = useIdeStore();
  const usages = analysisResult?.collectionUsages ?? [];
  const heapObjects = analysisResult?.memoryModel?.heapObjects ?? [];

  if (usages.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>📦</div>
        <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '220px' }}>
          Declare collections like ArrayList, HashMap, or LinkedList to visualize their structure
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {usages.map(usage => {
        const heapObj = heapObjects.find(h => h.id === analysisResult?.symbolTable?.variables[usage.variableId]?.heapObjectId);
        return (
          <CollectionViz key={usage.id} usage={usage} heapObj={heapObj} />
        );
      })}
    </div>
  );
}

function CollectionViz({ usage, heapObj }: { usage: CollectionUsage; heapObj?: HeapObject }) {
  switch (usage.collectionKind) {
    case 'ARRAY_LIST': return <ArrayListViz usage={usage} heapObj={heapObj} />;
    case 'LINKED_LIST': return <LinkedListViz usage={usage} />;
    case 'HASH_MAP': return <HashMapViz usage={usage} />;
    case 'HASH_SET': return <HashSetViz usage={usage} />;
    case 'TREE_MAP': return <TreeMapViz usage={usage} />;
    case 'PRIORITY_QUEUE': return <PriorityQueueViz usage={usage} />;
    default: return <GenericCollectionViz usage={usage} />;
  }
}

// ============================================================
// ArrayList Visualization
// ============================================================

function ArrayListViz({ usage, heapObj }: { usage: CollectionUsage; heapObj?: HeapObject }) {
  const elements = (heapObj?.arrayElements as string[]) ?? [];
  const capacity = Math.max(elements.length + 2, 10);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a5c30', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#163b22', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#3fb950', fontWeight: 700, fontFamily: 'monospace' }}>📋 ArrayList</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{usage.variableName}</span>
        {usage.elementType && <span style={{ fontSize: '10px', color: '#444c56' }}>&lt;{usage.elementType}&gt;</span>}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>
          size: {elements.length} / capacity: {capacity}
        </span>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Internal array visualization */}
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
          {Array.from({ length: capacity }).map((_, i) => (
            <motion.div
              key={i}
              initial={i < elements.length ? { scale: 0 } : {}}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                width: '44px', height: '44px',
                border: `1px solid ${i < elements.length ? '#1a5c30' : '#21262d'}`,
                borderRadius: '4px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: i < elements.length ? 'rgba(26,92,48,0.3)' : 'rgba(33,38,45,0.3)',
                fontSize: '10px', fontFamily: 'monospace',
              }}
            >
              <div style={{ color: '#444c56', fontSize: '9px' }}>[{i}]</div>
              {i < elements.length ? (
                <div style={{ color: '#3fb950', fontWeight: 600 }}>{String(elements[i])}</div>
              ) : (
                <div style={{ color: '#21262d' }}>null</div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#6e7681', display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(26,92,48,0.3)', border: '1px solid #1a5c30', borderRadius: '2px' }} />
            Filled slots
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', background: 'rgba(33,38,45,0.3)', border: '1px solid #21262d', borderRadius: '2px' }} />
            Empty capacity
          </div>
        </div>

        <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
          fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
          💡 <strong>ArrayList</strong>: Backed by a dynamic array. When full, capacity doubles (×1.5 growth).
          Random access O(1). Insertion at end amortized O(1). Middle insertion/deletion O(n).
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// LinkedList Visualization
// ============================================================

function LinkedListViz({ usage }: { usage: CollectionUsage }) {
  const demoNodes = ['head', 'node1', 'node2', 'tail'];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>🔗 LinkedList</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{usage.variableName}</span>
      </div>

      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          <div style={{ color: '#444c56', fontSize: '11px', fontFamily: 'monospace', marginRight: '4px' }}>null ←</div>

          {demoNodes.map((n, i) => (
            <React.Fragment key={n}>
              {/* Node box */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex',
                  border: '1px solid #1a3a5c',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: '44px', height: '44px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(26,58,92,0.3)', borderRight: '1px solid #1a3a5c',
                  fontSize: '11px', fontFamily: 'monospace' }}>
                  <div style={{ color: '#444c56', fontSize: '9px' }}>data</div>
                  <div style={{ color: '#60a5fa' }}>{i === 0 ? '▶' : i + 1}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, width: '36px', background: 'rgba(60,40,80,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: '#8b5cf6', borderBottom: '1px solid #1a3a5c' }}>
                    prev
                  </div>
                  <div style={{ flex: 1, width: '36px', background: 'rgba(40,60,80,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: '#06b6d4' }}>
                    next
                  </div>
                </div>
              </motion.div>

              {/* Arrow */}
              {i < demoNodes.length - 1 && (
                <div style={{ color: '#06b6d4', fontSize: '16px', userSelect: 'none' }}>⇄</div>
              )}
            </React.Fragment>
          ))}

          <div style={{ color: '#444c56', fontSize: '11px', fontFamily: 'monospace', marginLeft: '4px' }}>→ null</div>
        </div>

        <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
          fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
          💡 <strong>LinkedList</strong>: Doubly-linked node chain. Each node holds prev/next pointers.
          Insertion/deletion at head/tail O(1). Index access O(n). More memory than ArrayList (2 pointers per node).
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// HashMap Visualization (buckets + chains)
// ============================================================

function HashMapViz({ usage }: { usage: CollectionUsage }) {
  const bucketCount = 16;
  const demoBuckets: { key: string; value: string; hash: number; next?: { key: string; value: string } }[] = [
    { key: '"Alice"', value: '25', hash: 3 },
    { key: '"Bob"', value: '30', hash: 7, next: { key: '"Charlie"', value: '35' } },
    { key: '"Dave"', value: '28', hash: 11 },
    { key: '"Eve"', value: '22', hash: 3 }, // collision with Alice → treeified bucket
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>#️⃣ HashMap</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{usage.variableName}</span>
        <span style={{ fontSize: '10px', color: '#444c56' }}>
          {usage.keyType && usage.valueType ? `<${usage.keyType}, ${usage.valueType}>` : ''}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>
          table[{bucketCount}] · load: {(demoBuckets.length / bucketCount * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Bucket table */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {Array.from({ length: bucketCount }).map((_, bucketIdx) => {
            const entries = demoBuckets.filter(b => b.hash === bucketIdx);
            return (
              <div key={bucketIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                {/* Bucket index */}
                <div style={{ fontSize: '9px', color: '#444c56', fontFamily: 'monospace' }}>[{bucketIdx}]</div>

                {/* Bucket cell */}
                <div style={{
                  width: '48px', minHeight: '36px',
                  border: `1px solid ${entries.length > 0 ? '#1a3a5c' : '#21262d'}`,
                  borderRadius: '4px',
                  background: entries.length > 0 ? 'rgba(26,58,92,0.4)' : 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '2px',
                }}>
                  {entries.length > 0 ? (
                    entries.map((e, ei) => (
                      <React.Fragment key={ei}>
                        <div style={{
                          width: '100%', fontSize: '9px', fontFamily: 'monospace',
                          textAlign: 'center', padding: '1px',
                        }}>
                          <div style={{ color: '#f59e0b' }}>{e.key}</div>
                          <div style={{ color: '#3fb950' }}>{e.value}</div>
                          {ei < entries.length - 1 && (
                            <div style={{ color: '#06b6d4', fontSize: '8px' }}>↓ next</div>
                          )}
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <div style={{ fontSize: '9px', color: '#21262d' }}>null</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
          fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
          💡 <strong>HashMap</strong>: Hash table with array of buckets. Keys are hashed to bucket index.
          Collisions form linked chains → upgraded to Red-Black tree when chain length ≥ 8.
          Average O(1) get/put. Worst case O(log n) with tree buckets.
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// HashSet (simplified)
// ============================================================

function HashSetViz({ usage }: { usage: CollectionUsage }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px' }}>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>🎯 HashSet</span>
        <span style={{ color: '#8b949e', fontSize: '11px', marginLeft: '8px' }}>{usage.variableName}</span>
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '11px', color: '#8b949e', lineHeight: '1.6', padding: '8px', background: '#0d1117', borderRadius: '6px' }}>
          💡 <strong>HashSet</strong>: Backed by a HashMap with dummy values. Each element is stored as
          a key. No duplicates allowed. O(1) add/remove/contains.
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// TreeMap (balanced BST)
// ============================================================

function TreeMapViz({ usage }: { usage: CollectionUsage }) {
  // Simple BST visualization with 7 nodes
  const nodes = [
    { val: '50', x: 150, y: 0, parent: null },
    { val: '25', x: 70, y: 60, parent: '50' },
    { val: '75', x: 230, y: 60, parent: '50' },
    { val: '10', x: 30, y: 120, parent: '25' },
    { val: '35', x: 110, y: 120, parent: '25' },
    { val: '60', x: 190, y: 120, parent: '75' },
    { val: '90', x: 270, y: 120, parent: '75' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px' }}>
        <span style={{ color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>🌲 TreeMap</span>
        <span style={{ color: '#8b949e', fontSize: '11px', marginLeft: '8px' }}>{usage.variableName}</span>
      </div>
      <div style={{ padding: '12px' }}>
        {/* SVG tree */}
        <svg width="320" height="160" style={{ display: 'block', margin: '0 auto' }}>
          {/* Edges */}
          <line x1="165" y1="16" x2="85" y2="68" stroke="#1a5c30" strokeWidth="1.5" />
          <line x1="165" y1="16" x2="245" y2="68" stroke="#1a5c30" strokeWidth="1.5" />
          <line x1="85" y1="76" x2="45" y2="126" stroke="#1a5c30" strokeWidth="1.5" />
          <line x1="85" y1="76" x2="125" y2="126" stroke="#1a5c30" strokeWidth="1.5" />
          <line x1="245" y1="76" x2="205" y2="126" stroke="#1a5c30" strokeWidth="1.5" />
          <line x1="245" y1="76" x2="285" y2="126" stroke="#1a5c30" strokeWidth="1.5" />

          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.x + 15} cy={n.y + 16} r="16"
                fill="rgba(26,92,48,0.3)" stroke="#1a5c30" strokeWidth="1.5" />
              <text x={n.x + 15} y={n.y + 20} textAnchor="middle"
                fontSize="11" fontFamily="monospace" fill="#3fb950" fontWeight="700">
                {n.val}
              </text>
            </g>
          ))}
        </svg>

        <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
          fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
          💡 <strong>TreeMap</strong>: Red-Black balanced BST. Keys stored in sorted order.
          O(log n) get/put/remove. Iteration in key order. More memory than HashMap.
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// PriorityQueue
// ============================================================

function PriorityQueueViz({ usage }: { usage: CollectionUsage }) {
  const heap = [1, 3, 5, 7, 9, 8, 6];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px' }}>
        <span style={{ color: '#f0883e', fontWeight: 700, fontFamily: 'monospace' }}>⚡ PriorityQueue</span>
        <span style={{ color: '#8b949e', fontSize: '11px', marginLeft: '8px' }}>{usage.variableName}</span>
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#6e7681', marginRight: '4px' }}>Min-Heap:</span>
          {heap.map((v, i) => (
            <div key={i} style={{
              width: '32px', height: '32px',
              border: `1px solid ${i === 0 ? '#f0883e' : '#1a3a5c'}`,
              background: i === 0 ? 'rgba(240,136,62,0.2)' : 'rgba(26,58,92,0.2)',
              borderRadius: '4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontFamily: 'monospace',
              color: i === 0 ? '#f0883e' : '#8b949e',
              fontWeight: i === 0 ? 700 : 400,
            }}>
              {v}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '4px' }}>
          Internal array representation of binary min-heap
        </div>
        <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
          fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
          💡 <strong>PriorityQueue</strong>: Binary min-heap. poll() returns minimum element.
          O(log n) add/remove. O(1) peek. Internal array layout.
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Generic fallback
// ============================================================

function GenericCollectionViz({ usage }: { usage: CollectionUsage }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '12px' }}>
      <div style={{ color: '#e6edf3', fontWeight: 600 }}>{usage.collectionKind}</div>
      <div style={{ color: '#8b949e', fontSize: '11px' }}>{usage.variableName}</div>
    </motion.div>
  );
}
