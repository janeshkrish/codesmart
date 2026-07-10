import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import type { StackFrame, HeapObject, StringPoolEntry, StaticAreaEntry, VariableInfo } from '../../types';

// ============================================================
// Memory Visualization Panel
// Shows Stack / Heap / String Pool / Static Area / Method Area
// with animated reference arrows
// ============================================================

export function MemoryPanel() {
  const { analysisResult, selectVariable, selectHeapObject } = useIdeStore();

  if (!analysisResult?.memoryModel) {
    return <EmptyState message="Type Java code to see memory visualization" />;
  }

  const { stackFrames, heapObjects, stringPool, staticArea, methodArea, references, gcEligibleIds } =
    analysisResult.memoryModel;

  const hasContent = stackFrames.length > 0 || heapObjects.length > 0 ||
    stringPool.length > 0 || staticArea.length > 0;

  if (!hasContent) {
    return <EmptyState message="Declare variables or create objects to visualize memory" />;
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* Stack Frames */}
      {stackFrames.length > 0 && (
        <MemoryRegion id="stack" title="Stack" color="#1e4080" headerColor="#1a3560" icon="📚">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence>
              {stackFrames.map((frame, idx) => (
                <StackFrameCard
                  key={frame.id}
                  frame={frame}
                  isTop={idx === stackFrames.length - 1}
                  onSelectVar={selectVariable}
                />
              ))}
            </AnimatePresence>
          </div>
        </MemoryRegion>
      )}

      {/* Heap Objects */}
      {heapObjects.length > 0 && (
        <MemoryRegion id="heap" title="Heap" color="#1a5c30" headerColor="#163b22" icon="🏗️">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <AnimatePresence>
              {heapObjects.map(obj => (
                <HeapObjectCard
                  key={obj.id}
                  obj={obj}
                  isGcEligible={gcEligibleIds.includes(obj.id)}
                  onClick={() => selectHeapObject(obj.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </MemoryRegion>
      )}

      {/* String Pool */}
      {stringPool.length > 0 && (
        <MemoryRegion id="string-pool" title="String Pool" color="#6b1f44" headerColor="#4a1530" icon="🔤">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <AnimatePresence>
              {stringPool.map(entry => (
                <StringPoolCard key={entry.id} entry={entry} />
              ))}
            </AnimatePresence>
          </div>
        </MemoryRegion>
      )}

      {/* Static Area */}
      {staticArea.length > 0 && (
        <MemoryRegion id="static-area" title="Static Area" color="#5c5c1a" headerColor="#3a3a0d" icon="⚙️">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {staticArea.map(entry => (
              <StaticCard key={entry.id} entry={entry} />
            ))}
          </div>
        </MemoryRegion>
      )}

      {/* Method Area */}
      {methodArea.length > 0 && (
        <MemoryRegion id="method-area" title="Method Area" color="#44206b" headerColor="#2a1040" icon="📋">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {methodArea.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(68,32,107,0.3)',
                  border: '1px solid #44206b',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                <div style={{ color: '#a78bfa', fontWeight: 600 }}>{entry.className}</div>
                <div style={{ color: '#6e7681', fontSize: '10px' }}>
                  @{entry.virtualAddress?.toString(16).toUpperCase()}
                </div>
              </motion.div>
            ))}
          </div>
        </MemoryRegion>
      )}

      {/* Memory Legend */}
      <MemoryLegend />
    </div>
  );
}

// ============================================================
// Memory Region Container
// ============================================================

function MemoryRegion({ id, title, color, headerColor, icon, children }: {
  id: string; title: string; color: string; headerColor: string; icon: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = React.useState(() => {
    return localStorage.getItem(`cs-memory-region-${id}`) !== 'false';
  });

  const toggle = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem(`cs-memory-region-${id}`, String(next));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        border: `1px solid ${color}`,
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <div 
        className="memory-region-toggle"
        onClick={toggle}
        style={{
        background: headerColor,
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#e6edf3',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        <span style={{ fontSize: '10px' }}>{isExpanded ? '▼' : '▶'}</span>
        <span>{icon}</span>
        <span style={{ flex: 1 }}>{title}</span>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Stack Frame Card
// ============================================================

function StackFrameCard({ frame, isTop, onSelectVar }: {
  frame: StackFrame;
  isTop: boolean;
  onSelectVar: (id: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{
        background: isTop ? 'rgba(30,64,128,0.4)' : 'rgba(30,64,128,0.2)',
        border: `1px solid ${isTop ? '#3b6fd4' : '#1e4080'}`,
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      {/* Frame header */}
      <div style={{
        padding: '5px 10px',
        background: isTop ? 'rgba(30,64,128,0.5)' : 'rgba(30,64,128,0.3)',
        borderBottom: '1px solid #1e4080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px' }}>{isTop ? '▶' : '○'}</span>
          <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 700, color: isTop ? '#60a5fa' : '#8b949e' }}>
            {frame.methodName}()
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="tag tag-stack">depth: {frame.depth}</span>
          <span style={{ fontSize: '10px', color: '#444c56', fontFamily: 'monospace' }}>
            @{frame.virtualAddress?.toString(16).toUpperCase() ?? '???'}
          </span>
        </div>
      </div>

      {/* Variables */}
      <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {frame.localVariables.length === 0 ? (
          <span style={{ fontSize: '11px', color: '#444c56', fontStyle: 'italic' }}>
            No local variables
          </span>
        ) : (
          frame.localVariables.map(v => (
            <VariableCard key={v.id} variable={v} onClick={() => onSelectVar(v.id)} />
          ))
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// Variable Card
// ============================================================

function VariableCard({ variable, onClick }: { variable: VariableInfo; onClick: () => void }) {
  const isPrimitive = variable.storageKind === 'PRIMITIVE_STACK';
  const isString = variable.storageKind === 'STRING_POOL';
  const isRef = variable.storageKind === 'REFERENCE_STACK' || variable.storageKind === 'ARRAY_HEAP';

  const borderColor = isPrimitive ? '#1e4080' : isString ? '#6b1f44' : '#1a5c30';
  const bgColor = isPrimitive ? 'rgba(30,64,128,0.2)' : isString ? 'rgba(107,31,68,0.2)' : 'rgba(26,92,48,0.2)';

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        padding: '7px 10px',
        cursor: 'pointer',
        minWidth: '90px',
        fontFamily: 'JetBrains Mono, monospace',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#06b6d4' }}>
        {variable.name}
      </div>
      <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px' }}>
        {variable.type}
      </div>
      {variable.staticValue && (
        <div style={{ fontSize: '12px', color: '#3fb950', marginTop: '2px' }}>
          = {variable.staticValue}
        </div>
      )}
      {isRef && !variable.staticValue && (
        <div style={{ fontSize: '10px', color: '#f0883e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>→</span><span>heap</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
        {isPrimitive && <span className="tag tag-primitive">stack</span>}
        {isRef && <span className="tag tag-reference">ref</span>}
        {isString && <span className="tag tag-string">pool</span>}
        {variable.parameter && <span className="tag" style={{ background: 'rgba(240,136,62,0.1)', color: '#fb923c', border: '1px solid rgba(240,136,62,0.3)' }}>param</span>}
      </div>
    </motion.div>
  );
}

// ============================================================
// Heap Object Card
// ============================================================

function HeapObjectCard({ obj, isGcEligible, onClick }: {
  obj: HeapObject; isGcEligible: boolean; onClick: () => void;
}) {
  const kindColors: Record<string, { border: string; bg: string; header: string }> = {
    OBJECT: { border: '#1a5c30', bg: 'rgba(26,92,48,0.2)', header: 'rgba(26,92,48,0.4)' },
    ARRAY: { border: '#3a5c1a', bg: 'rgba(58,92,26,0.2)', header: 'rgba(58,92,26,0.4)' },
    COLLECTION: { border: '#5c3a1a', bg: 'rgba(92,58,26,0.2)', header: 'rgba(92,58,26,0.4)' },
    MAP: { border: '#1a3a5c', bg: 'rgba(26,58,92,0.2)', header: 'rgba(26,58,92,0.4)' },
    LAMBDA: { border: '#5c1a5c', bg: 'rgba(92,26,92,0.2)', header: 'rgba(92,26,92,0.4)' },
    STRING: { border: '#6b1f44', bg: 'rgba(107,31,68,0.2)', header: 'rgba(107,31,68,0.4)' },
    WRAPPER: { border: '#1a5c5c', bg: 'rgba(26,92,92,0.2)', header: 'rgba(26,92,92,0.4)' },
    ANONYMOUS_CLASS: { border: '#5c5c1a', bg: 'rgba(92,92,26,0.2)', header: 'rgba(92,92,26,0.4)' },
  };
  const colors = kindColors[obj.kind] ?? kindColors.OBJECT;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={isGcEligible ? 'gc-eligible' : ''}
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        minWidth: '120px',
        maxWidth: '180px',
        opacity: isGcEligible ? 0.6 : 1,
      }}
    >
      {/* Object header */}
      <div style={{
        background: colors.header,
        padding: '4px 8px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4px',
      }}>
        <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700, color: '#3fb950' }}>
          {obj.className}
        </span>
        {isGcEligible && (
          <span title="GC Eligible" style={{ fontSize: '10px', color: '#f85149' }}>♻️</span>
        )}
      </div>

      <div style={{ padding: '6px 8px', background: colors.bg }}>
        {/* Array elements */}
        {obj.kind === 'ARRAY' && obj.arrayElements && (
          <ArrayVisualization elements={obj.arrayElements} componentType={obj.arrayComponentType} />
        )}

        {/* String value */}
        {obj.kind === 'STRING' && obj.stringValue && (
          <div style={{ fontSize: '11px', color: '#c3e88d', fontFamily: 'monospace' }}>
            &quot;{obj.stringValue}&quot;
          </div>
        )}

        {/* Object fields */}
        {obj.kind === 'OBJECT' && obj.fields && Object.keys(obj.fields).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {Object.entries(obj.fields).slice(0, 4).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '4px', fontSize: '10px', fontFamily: 'monospace' }}>
                <span style={{ color: '#8b949e' }}>{k}:</span>
                <span style={{ color: '#e6edf3' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Collection visualization */}
        {obj.kind === 'COLLECTION' && (
          <CollectionMiniViz obj={obj} />
        )}

        {/* Address */}
        <div style={{ fontSize: '9px', color: '#444c56', marginTop: '4px',
          fontFamily: 'monospace', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '3px' }}>
          @{obj.virtualAddress?.toString(16).toUpperCase() ?? '???'}
          <span style={{ marginLeft: '4px', color: '#6e7681' }}>
            refs: {obj.referenceCount}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Array Visualization (compact)
// ============================================================

function ArrayVisualization({ elements, componentType }: {
  elements: unknown[]; componentType?: string;
}) {
  const display = elements.slice(0, 8);
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#8b949e', marginBottom: '4px' }}>
        {componentType}[] ({elements.length})
      </div>
      <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
        {display.map((el, i) => (
          <div
            key={i}
            title={`[${i}] = ${el}`}
            style={{
              minWidth: '28px', height: '28px',
              background: 'rgba(58,92,26,0.4)',
              border: '1px solid #3a5c1a',
              borderRadius: '4px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontFamily: 'monospace',
              cursor: 'default',
            }}
          >
            <div style={{ color: '#4ade80', fontSize: '9px' }}>[{i}]</div>
            <div style={{ color: '#e6edf3' }}>{String(el)}</div>
          </div>
        ))}
        {elements.length > 8 && (
          <div style={{ fontSize: '10px', color: '#6e7681', alignSelf: 'center' }}>
            +{elements.length - 8}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Collection Mini Viz
// ============================================================

function CollectionMiniViz({ obj }: { obj: HeapObject }) {
  const kindLabels: Record<string, string> = {
    ARRAY_LIST: '📋 ArrayList',
    LINKED_LIST: '🔗 LinkedList',
    HASH_MAP: '#️⃣ HashMap',
    HASH_SET: '🎯 HashSet',
    TREE_MAP: '🌲 TreeMap',
    PRIORITY_QUEUE: '⚡ PriorityQueue',
    ARRAY_DEQUE: '⬅️➡️ ArrayDeque',
  };

  const state = obj.collectionInternalState as any;
  const count = state?.size ?? 0;

  return (
    <div style={{ fontSize: '11px', color: '#f0883e', fontFamily: 'monospace' }}>
      {kindLabels[obj.collectionKind ?? ''] ?? obj.collectionKind ?? 'Collection'}
      <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '2px' }}>
        {count === 0 ? 'empty' : `${count} item${count === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

// ============================================================
// String Pool Card
// ============================================================

function StringPoolCard({ entry }: { entry: StringPoolEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(107,31,68,0.2)',
        border: '1px solid #6b1f44',
        borderRadius: '6px',
        padding: '6px 10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
      }}
    >
      <div style={{ color: '#e879f9', fontWeight: 600 }}>
        &quot;{entry.value}&quot;
      </div>
      <div style={{ color: '#444c56', fontSize: '9px', marginTop: '2px' }}>
        @{entry.virtualAddress?.toString(16).toUpperCase()} · refs: {entry.referenceCount}
      </div>
    </motion.div>
  );
}

// ============================================================
// Static Area Card
// ============================================================

function StaticCard({ entry }: { entry: StaticAreaEntry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(92,92,26,0.2)',
        border: '1px solid #5c5c1a',
        borderRadius: '6px',
        padding: '6px 10px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
      }}
    >
      <div style={{ color: '#d29922', fontWeight: 600 }}>{entry.fieldName}</div>
      <div style={{ color: '#8b949e', fontSize: '10px' }}>{entry.type}</div>
      {entry.value !== undefined && (
        <div style={{ color: '#3fb950', fontSize: '11px' }}>= {String(entry.value)}</div>
      )}
    </motion.div>
  );
}

// ============================================================
// Memory Legend
// ============================================================

function MemoryLegend() {
  return (
    <div style={{
      borderTop: '1px solid #21262d',
      paddingTop: '10px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      fontSize: '10px',
      color: '#6e7681',
    }}>
      <span>📚 Stack = method call frames</span>
      <span>🏗️ Heap = objects, arrays</span>
      <span>🔤 String Pool = string literals</span>
      <span>⚙️ Static = class fields</span>
      <span>♻️ GC Eligible</span>
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      color: '#6e7681',
    }}>
      <div style={{ fontSize: '32px' }}>🧠</div>
      <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '220px', lineHeight: '1.6' }}>
        {message}
      </div>
    </div>
  );
}
