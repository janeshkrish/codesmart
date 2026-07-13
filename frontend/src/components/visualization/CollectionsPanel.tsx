import React from 'react';
import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import type { CollectionUsage, HeapObject } from '../../types';
import type { CollectionState } from '../../services/executionEngine';

// ============================================================
// Collections Visualization Panel
// Shows live internal structure of ArrayList, LinkedList, HashMap, etc.
// Data sourced from the execution engine snapshot (live) or analysis (static).
// ============================================================

export function CollectionsPanel() {
  const { analysisResult, executionSnapshot } = useIdeStore();
  const usages = analysisResult?.collectionUsages ?? [];
  const heapObjects = analysisResult?.memoryModel?.heapObjects ?? [];

  // Merge static analysis usages with live execution data
  const liveCollections = executionSnapshot?.collections ?? [];

  // Build unified display items
  const allItems: { usage?: CollectionUsage; live?: CollectionState; heapObj?: HeapObject }[] = [];

  // Add items from static analysis
  for (const usage of usages) {
    const heapObj = heapObjects.find(
      h => h.id === analysisResult?.symbolTable?.variables[usage.variableId]?.heapObjectId
    );
    const live = liveCollections.find(c => c.name === usage.variableName);
    allItems.push({ usage, live, heapObj });
  }

  // Add live collections not in static analysis (dynamically detected during execution)
  for (const live of liveCollections) {
    if (!usages.find(u => u.variableName === live.name)) {
      allItems.push({ live });
    }
  }

  if (allItems.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>📦</div>
        <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '220px' }}>
          Declare collections like ArrayList, HashMap, LinkedList, Stack, Queue or PriorityQueue to visualize their structure
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {allItems.map((item, i) => {
        const kind = item.usage?.collectionKind ?? mapKind(item.live?.type);
        const name = item.usage?.variableName ?? item.live?.name ?? '?';
        const elements = item.live?.elements ?? (item.heapObj?.arrayElements as unknown[]) ?? [];
        const lastOp = item.live?.lastOperation;
        const lastOpIdx = item.live?.lastOperationIndex;

        return (
          <CollectionViz
            key={i}
            kind={kind}
            name={name}
            elements={elements}
            lastOp={lastOp}
            lastOpIdx={lastOpIdx}
            usage={item.usage}
            heapObj={item.heapObj}
          />
        );
      })}
    </div>
  );
}

function mapKind(type?: string): string {
  if (!type) return 'UNKNOWN';
  const m: Record<string, string> = {
    ArrayList: 'ARRAY_LIST', LinkedList: 'LINKED_LIST', HashMap: 'HASH_MAP',
    HashSet: 'HASH_SET', TreeMap: 'TREE_MAP', TreeSet: 'TREE_SET',
    PriorityQueue: 'PRIORITY_QUEUE', Stack: 'STACK', ArrayDeque: 'ARRAY_DEQUE',
    Queue: 'ARRAY_DEQUE', Deque: 'ARRAY_DEQUE',
  };
  return m[type] ?? 'UNKNOWN';
}

interface VizProps {
  kind: string;
  name: string;
  elements: unknown[];
  lastOp?: string;
  lastOpIdx?: number;
  usage?: CollectionUsage;
  heapObj?: HeapObject;
}

function CollectionViz({ kind, name, elements, lastOp, lastOpIdx, usage, heapObj }: VizProps) {
  switch (kind) {
    case 'ARRAY_LIST':
      return <ArrayListViz name={name} elements={elements} lastOp={lastOp} lastOpIdx={lastOpIdx} usage={usage} heapObj={heapObj} />;
    case 'LINKED_LIST':
      return <LinkedListViz name={name} elements={elements} lastOp={lastOp} lastOpIdx={lastOpIdx} />;
    case 'HASH_MAP':
      return <HashMapViz name={name} elements={elements} usage={usage} />;
    case 'HASH_SET':
      return <HashSetViz name={name} elements={elements} />;
    case 'TREE_MAP':
    case 'TREE_SET':
      return <TreeViz name={name} elements={elements} kind={kind} />;
    case 'PRIORITY_QUEUE':
      return <PriorityQueueViz name={name} elements={elements} />;
    case 'STACK':
      return <StackViz name={name} elements={elements} lastOp={lastOp} />;
    case 'ARRAY_DEQUE':
      return <QueueViz name={name} elements={elements} lastOp={lastOp} />;
    default:
      return <GenericViz name={name} kind={kind} elements={elements} />;
  }
}

// ─── Shared header ──────────────────────────────────────────────────────────

function CollectionHeader({ icon, label, name, typeParams, extra, color, bg }:
  { icon: string; label: string; name: string; typeParams?: string; extra?: string; color: string; bg: string }) {
  return (
    <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', background: bg }}>
      <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{icon} {label}</span>
      <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
      {typeParams && <span style={{ fontSize: '10px', color: '#444c56' }}>&lt;{typeParams}&gt;</span>}
      {extra && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>{extra}</span>}
    </div>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '8px', padding: '8px', background: '#0d1117', borderRadius: '6px',
      fontSize: '11px', color: '#8b949e', lineHeight: '1.6' }}>
      {children}
    </div>
  );
}

function LastOpBadge({ op, idx }: { op?: string; idx?: number }) {
  if (!op) return null;
  const opColors: Record<string, string> = {
    add: '#3fb950', push: '#3fb950', offer: '#3fb950', put: '#3fb950', enqueue: '#3fb950',
    remove: '#f85149', pop: '#f85149', poll: '#f85149', dequeue: '#f85149',
  };
  const color = opColors[op] ?? '#d29922';
  return (
    <span style={{
      marginLeft: 'auto', fontSize: '10px', fontWeight: 700,
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: '4px', padding: '1px 6px',
    }}>
      ↺ {op}{idx != null ? `[${idx}]` : ''}
    </span>
  );
}

// ─── ArrayList ──────────────────────────────────────────────────────────────

function ArrayListViz({ name, elements, lastOp, lastOpIdx, usage, heapObj }: {
  name: string; elements: unknown[]; lastOp?: string; lastOpIdx?: number;
  usage?: CollectionUsage; heapObj?: HeapObject;
}) {
  // Prefer live elements, then heapObj array, then show empty
  const displayElements = elements.length > 0
    ? elements
    : (heapObj?.arrayElements as unknown[] ?? []);
  const capacity = Math.max(displayElements.length + 2, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a5c30', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#163b22', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#3fb950', fontWeight: 700, fontFamily: 'monospace' }}>📋 ArrayList</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        {usage?.elementType && <span style={{ fontSize: '10px', color: '#444c56' }}>&lt;{usage.elementType}&gt;</span>}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>
          size: {displayElements.length} / cap: {capacity}
        </span>
        <LastOpBadge op={lastOp} idx={lastOpIdx} />
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
          {Array.from({ length: capacity }).map((_, i) => {
            const isLastOp = lastOpIdx === i;
            return (
              <motion.div
                key={i}
                initial={i < displayElements.length ? { scale: 0 } : {}}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  width: '44px', height: '44px',
                  border: `1px solid ${isLastOp ? '#3fb950' : i < displayElements.length ? '#1a5c30' : '#21262d'}`,
                  borderRadius: '4px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: isLastOp ? 'rgba(63,185,80,0.3)' : i < displayElements.length ? 'rgba(26,92,48,0.3)' : 'rgba(33,38,45,0.3)',
                  fontSize: '10px', fontFamily: 'monospace',
                  boxShadow: isLastOp ? '0 0 8px rgba(63,185,80,0.4)' : 'none',
                }}
              >
                <div style={{ color: '#444c56', fontSize: '9px' }}>[{i}]</div>
                {i < displayElements.length ? (
                  <div style={{ color: isLastOp ? '#3fb950' : '#e6edf3', fontWeight: 600, fontSize: '11px' }}>
                    {String(displayElements[i])}
                  </div>
                ) : (
                  <div style={{ color: '#21262d', fontSize: '9px' }}>null</div>
                )}
              </motion.div>
            );
          })}
        </div>
        <InfoTip>
          💡 <strong>ArrayList</strong>: Backed by a dynamic array. Growth factor ×1.5 when full.
          Random access O(1). Append amortized O(1). Middle insert/delete O(n).
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── LinkedList ──────────────────────────────────────────────────────────────

function LinkedListViz({ name, elements, lastOp, lastOpIdx }: {
  name: string; elements: unknown[]; lastOp?: string; lastOpIdx?: number;
}) {
  const displayElements = elements.length > 0 ? elements : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#60a5fa', fontWeight: 700, fontFamily: 'monospace' }}>🔗 LinkedList</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>size: {displayElements.length}</span>
        <LastOpBadge op={lastOp} idx={lastOpIdx} />
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          <div style={{ color: '#444c56', fontSize: '11px', fontFamily: 'monospace', marginRight: '4px' }}>null ←</div>

          {displayElements.length === 0 ? (
            <div style={{ color: '#444c56', fontSize: '11px', fontFamily: 'monospace', fontStyle: 'italic' }}>empty</div>
          ) : (
            displayElements.map((val, i) => (
              <React.Fragment key={i}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    display: 'flex',
                    border: `1px solid ${lastOpIdx === i ? '#3fb950' : '#1a3a5c'}`,
                    borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                    boxShadow: lastOpIdx === i ? '0 0 8px rgba(63,185,80,0.4)' : 'none',
                  }}
                >
                  <div style={{ width: '44px', height: '44px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: lastOpIdx === i ? 'rgba(63,185,80,0.2)' : 'rgba(26,58,92,0.3)',
                    borderRight: '1px solid #1a3a5c', fontSize: '11px', fontFamily: 'monospace' }}>
                    <div style={{ color: '#444c56', fontSize: '9px' }}>data</div>
                    <div style={{ color: lastOpIdx === i ? '#3fb950' : '#60a5fa' }}>{String(val)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, width: '30px', background: 'rgba(60,40,80,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: '#8b5cf6', borderBottom: '1px solid #1a3a5c' }}>prev</div>
                    <div style={{ flex: 1, width: '30px', background: 'rgba(40,60,80,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: '#06b6d4' }}>next</div>
                  </div>
                </motion.div>
                {i < displayElements.length - 1 && (
                  <div style={{ color: '#06b6d4', fontSize: '16px', userSelect: 'none' }}>⇄</div>
                )}
              </React.Fragment>
            ))
          )}

          <div style={{ color: '#444c56', fontSize: '11px', fontFamily: 'monospace', marginLeft: '4px' }}>→ null</div>
        </div>
        <InfoTip>
          💡 <strong>LinkedList</strong>: Doubly-linked node chain. Head/tail insert O(1). Index access O(n).
          More memory per element than ArrayList (2 pointers).
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── HashMap ──────────────────────────────────────────────────────────────────

function HashMapViz({ name, elements, usage }: { name: string; elements: unknown[]; usage?: CollectionUsage }) {
  // elements may be [key, value, key, value, ...] or [{k,v}] pairs
  // If live elements are provided, parse as k/v pairs
  const bucketCount = 16;
  const entries: { key: string; value: string; hash: number }[] = [];

  for (let i = 0; i + 1 < elements.length; i += 2) {
    const key = String(elements[i]);
    const value = String(elements[i + 1]);
    // Simple hash function simulation
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) & 0xFFFF;
    entries.push({ key, value, hash: h % bucketCount });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>#️⃣ HashMap</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        {usage?.keyType && usage?.valueType && (
          <span style={{ fontSize: '10px', color: '#444c56' }}>&lt;{usage.keyType}, {usage.valueType}&gt;</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>
          table[{bucketCount}] · {entries.length} entries
        </span>
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {Array.from({ length: bucketCount }).map((_, bi) => {
            const bucketEntries = entries.filter(e => e.hash === bi);
            return (
              <div key={bi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ fontSize: '8px', color: '#444c56', fontFamily: 'monospace' }}>[{bi}]</div>
                <div style={{
                  width: '52px', minHeight: '36px',
                  border: `1px solid ${bucketEntries.length > 0 ? '#1a3a5c' : '#21262d'}`,
                  borderRadius: '4px',
                  background: bucketEntries.length > 0 ? 'rgba(26,58,92,0.4)' : 'transparent',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '2px',
                }}>
                  {bucketEntries.length > 0 ? (
                    bucketEntries.map((e, ei) => (
                      <React.Fragment key={ei}>
                        <div style={{ width: '100%', fontSize: '8px', fontFamily: 'monospace', textAlign: 'center', padding: '1px' }}>
                          <div style={{ color: '#f59e0b' }}>{e.key}</div>
                          <div style={{ color: '#3fb950' }}>{e.value}</div>
                          {ei < bucketEntries.length - 1 && (
                            <div style={{ color: '#06b6d4', fontSize: '7px' }}>↓ chain</div>
                          )}
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <div style={{ fontSize: '8px', color: '#21262d' }}>∅</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <InfoTip>
          💡 <strong>HashMap</strong>: Hash table with {bucketCount} buckets. Collisions form linked chains →
          upgraded to Red-Black tree when chain length ≥ 8. Average O(1) get/put.
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── HashSet ──────────────────────────────────────────────────────────────────

function HashSetViz({ name, elements }: { name: string; elements: unknown[] }) {
  const bucketCount = 12;
  const slots: { val: string; bucket: number }[] = elements.map(e => {
    const key = String(e);
    let h = 0;
    for (const c of key) h = (h * 31 + c.charCodeAt(0)) & 0xFFFF;
    return { val: key, bucket: h % bucketCount };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>🎯 HashSet</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>{elements.length} elements</span>
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {Array.from({ length: bucketCount }).map((_, bi) => {
            const inBucket = slots.filter(s => s.bucket === bi);
            return (
              <div key={bi} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <div style={{ fontSize: '8px', color: '#444c56' }}>[{bi}]</div>
                <div style={{
                  width: '52px', minHeight: '32px',
                  border: `1px solid ${inBucket.length > 0 ? '#4c1d95' : '#21262d'}`,
                  borderRadius: '4px',
                  background: inBucket.length > 0 ? 'rgba(76,29,149,0.3)' : 'transparent',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px',
                }}>
                  {inBucket.length > 0 ? (
                    inBucket.map((s, i) => (
                      <div key={i} style={{ fontSize: '9px', color: '#a78bfa', fontFamily: 'monospace' }}>{s.val}</div>
                    ))
                  ) : (
                    <div style={{ fontSize: '8px', color: '#21262d' }}>∅</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <InfoTip>
          💡 <strong>HashSet</strong>: Backed by a HashMap with dummy values. No duplicates. O(1) add/contains/remove.
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── Tree (TreeMap / TreeSet) ─────────────────────────────────────────────────

function TreeViz({ name, elements, kind }: { name: string; elements: unknown[]; kind: string }) {
  const label = kind === 'TREE_SET' ? '🌲 TreeSet' : '🌲 TreeMap';
  const color = kind === 'TREE_SET' ? '#10b981' : '#10b981';

  // Build simple BST from elements for visualization
  const sorted = [...elements].sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  });

  // Simple tree layout for up to 7 nodes
  const treePositions = [
    { x: 150, y: 10 },
    { x: 80, y: 65 }, { x: 220, y: 65 },
    { x: 45, y: 120 }, { x: 115, y: 120 }, { x: 185, y: 120 }, { x: 255, y: 120 },
  ];
  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6],
  ];
  const displayNodes = sorted.slice(0, 7);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{label}</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>
          {elements.length} entries{elements.length > 7 ? ' (showing 7)' : ''}
        </span>
      </div>
      <div style={{ padding: '12px' }}>
        {displayNodes.length === 0 ? (
          <div style={{ color: '#444c56', fontSize: '12px', fontStyle: 'italic' }}>empty tree</div>
        ) : (
          <svg width="300" height="155" style={{ display: 'block', margin: '0 auto' }}>
            {edges.filter(([p, c]) => p < displayNodes.length && c < displayNodes.length).map(([p, c], i) => (
              <line key={i}
                x1={treePositions[p].x + 15} y1={treePositions[p].y + 15}
                x2={treePositions[c].x + 15} y2={treePositions[c].y + 14}
                stroke="#1a5c30" strokeWidth="1.5"
              />
            ))}
            {displayNodes.map((val, i) => (
              <g key={i}>
                <circle cx={treePositions[i].x + 15} cy={treePositions[i].y + 15} r="15"
                  fill="rgba(26,92,48,0.3)" stroke="#1a5c30" strokeWidth="1.5" />
                <text x={treePositions[i].x + 15} y={treePositions[i].y + 20}
                  textAnchor="middle" fontSize="10" fontFamily="monospace" fill="#3fb950" fontWeight="700">
                  {String(val).slice(0, 4)}
                </text>
              </g>
            ))}
          </svg>
        )}
        <InfoTip>
          💡 <strong>{kind === 'TREE_SET' ? 'TreeSet' : 'TreeMap'}</strong>: Red-Black balanced BST.
          Keys in sorted order. O(log n) add/remove/contains. Iteration in sorted order.
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── PriorityQueue (Min-Heap) ─────────────────────────────────────────────────

function PriorityQueueViz({ name, elements }: { name: string; elements: unknown[] }) {
  const heap = elements.length > 0 ? elements : [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #1a3a5c', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0d1f3c', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#f0883e', fontWeight: 700, fontFamily: 'monospace' }}>⚡ PriorityQueue</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>size: {heap.length}</span>
      </div>
      <div style={{ padding: '12px' }}>
        {heap.length === 0 ? (
          <div style={{ color: '#444c56', fontSize: '12px', fontStyle: 'italic' }}>empty queue</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#6e7681', marginRight: '4px' }}>heap array:</span>
              {heap.map((v, i) => (
                <motion.div key={i}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                  style={{
                    width: '36px', height: '36px',
                    border: `1px solid ${i === 0 ? '#f0883e' : '#1a3a5c'}`,
                    background: i === 0 ? 'rgba(240,136,62,0.2)' : 'rgba(26,58,92,0.2)',
                    borderRadius: '4px', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontFamily: 'monospace',
                    color: i === 0 ? '#f0883e' : '#8b949e',
                    fontWeight: i === 0 ? 700 : 400,
                  }}>
                  <div style={{ color: '#444c56', fontSize: '8px' }}>[{i}]</div>
                  <div>{String(v)}</div>
                </motion.div>
              ))}
            </div>
            {/* Draw binary heap tree for small heaps */}
            {heap.length > 0 && heap.length <= 7 && (
              <HeapTreeViz heap={heap} />
            )}
          </>
        )}
        <InfoTip>
          💡 <strong>PriorityQueue</strong>: Binary min-heap. poll() returns minimum element in O(log n).
          O(1) peek. Internal array: parent at ⌊i/2⌋, children at 2i+1 and 2i+2.
        </InfoTip>
      </div>
    </motion.div>
  );
}

function HeapTreeViz({ heap }: { heap: unknown[] }) {
  const positions = [
    { x: 140, y: 8 },
    { x: 80, y: 55 }, { x: 200, y: 55 },
    { x: 50, y: 102 }, { x: 110, y: 102 }, { x: 170, y: 102 }, { x: 230, y: 102 },
  ];
  const edges: [number, number][] = [];
  for (let i = 1; i < Math.min(heap.length, 7); i++) {
    edges.push([Math.floor((i - 1) / 2), i]);
  }

  return (
    <svg width="290" height="135" style={{ display: 'block', margin: '8px auto 0' }}>
      {edges.map(([p, c], i) => (
        <line key={i}
          x1={positions[p].x + 14} y1={positions[p].y + 14}
          x2={positions[c].x + 14} y2={positions[c].y + 12}
          stroke="#1a3a5c" strokeWidth="1.5"
        />
      ))}
      {heap.slice(0, 7).map((v, i) => (
        <g key={i}>
          <circle cx={positions[i].x + 14} cy={positions[i].y + 14} r="14"
            fill={i === 0 ? 'rgba(240,136,62,0.25)' : 'rgba(26,58,92,0.3)'}
            stroke={i === 0 ? '#f0883e' : '#1a3a5c'} strokeWidth="1.5" />
          <text x={positions[i].x + 14} y={positions[i].y + 19}
            textAnchor="middle" fontSize="10" fontFamily="monospace"
            fill={i === 0 ? '#f0883e' : '#60a5fa'} fontWeight="700">
            {String(v)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Stack ────────────────────────────────────────────────────────────────────

function StackViz({ name, elements, lastOp }: { name: string; elements: unknown[]; lastOp?: string }) {
  const display = [...elements].reverse(); // Show top of stack at top

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #4c1d95', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#1a0a2e', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#a78bfa', fontWeight: 700, fontFamily: 'monospace' }}>📚 Stack</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>size: {elements.length}</span>
        <LastOpBadge op={lastOp} />
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          {display.length === 0 ? (
            <div style={{ color: '#444c56', fontSize: '12px', fontStyle: 'italic' }}>empty stack</div>
          ) : (
            display.map((v, i) => (
              <motion.div key={i}
                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  width: '140px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 10px',
                  border: `1px solid ${i === 0 ? '#7c3aed' : '#4c1d95'}`,
                  background: i === 0 ? 'rgba(124,58,237,0.25)' : 'rgba(76,29,149,0.15)',
                  borderRadius: '4px',
                  fontFamily: 'monospace', fontSize: '12px',
                }}>
                <span style={{ color: '#a78bfa' }}>{String(v)}</span>
                {i === 0 && <span style={{ fontSize: '9px', color: '#7c3aed' }}>← TOP</span>}
              </motion.div>
            ))
          )}
        </div>
        <div style={{ borderTop: '2px solid #4c1d95', marginTop: '4px', paddingTop: '4px',
          fontSize: '10px', color: '#444c56', textAlign: 'center' }}>
          ⊥ bottom
        </div>
        <InfoTip>
          💡 <strong>Stack</strong>: LIFO (Last In, First Out). push/pop from top. O(1) all operations.
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── Queue / Deque ────────────────────────────────────────────────────────────

function QueueViz({ name, elements, lastOp }: { name: string; elements: unknown[]; lastOp?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: '#161b22', border: '1px solid #0e4429', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ background: '#0a2e1a', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#56d364', fontWeight: 700, fontFamily: 'monospace' }}>🚦 Queue</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>size: {elements.length}</span>
        <LastOpBadge op={lastOp} />
      </div>
      <div style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          <div style={{ fontSize: '10px', color: '#56d364', marginRight: '4px' }}>← DEQUEUE</div>
          {elements.length === 0 ? (
            <div style={{ color: '#444c56', fontSize: '12px', fontStyle: 'italic' }}>empty queue</div>
          ) : (
            elements.map((v, i) => (
              <motion.div key={i}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
                style={{
                  width: '48px', height: '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${i === 0 ? '#3fb950' : '#0e4429'}`,
                  background: i === 0 ? 'rgba(63,185,80,0.2)' : 'rgba(14,68,41,0.3)',
                  borderRadius: '4px',
                  fontFamily: 'monospace', fontSize: '12px',
                  color: i === 0 ? '#3fb950' : '#e6edf3',
                }}>
                {String(v)}
              </motion.div>
            ))
          )}
          <div style={{ fontSize: '10px', color: '#f85149', marginLeft: '4px' }}>ENQUEUE →</div>
        </div>
        <InfoTip>
          💡 <strong>Queue</strong>: FIFO (First In, First Out). offer/add at tail. poll/remove from head. O(1) both.
        </InfoTip>
      </div>
    </motion.div>
  );
}

// ─── Generic fallback ──────────────────────────────────────────────────────────

function GenericViz({ name, kind, elements }: { name: string; kind: string; elements: unknown[] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px',
        background: '#1a1f25' }}>
        <span style={{ color: '#8b949e', fontWeight: 700, fontFamily: 'monospace' }}>📦 {kind.replace(/_/g, ' ')}</span>
        <span style={{ color: '#8b949e', fontSize: '11px' }}>{name}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6e7681' }}>size: {elements.length}</span>
      </div>
      <div style={{ padding: '12px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {elements.length === 0 ? (
          <span style={{ color: '#444c56', fontSize: '12px', fontStyle: 'italic' }}>empty</span>
        ) : (
          elements.map((v, i) => (
            <div key={i} style={{
              padding: '4px 8px', border: '1px solid #30363d', borderRadius: '4px',
              fontSize: '12px', fontFamily: 'monospace', color: '#e6edf3', background: '#21262d',
            }}>
              {String(v)}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
