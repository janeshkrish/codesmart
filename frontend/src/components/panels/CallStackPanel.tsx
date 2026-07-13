import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';

// ============================================================
// Enhanced Call Stack Panel
// Shows execution-time stack frames with return values,
// local variable preview, and animated push/pop transitions.
// ============================================================

export function CallStackPanel() {
  const { currentStepResult, analysisResult, highlightRange, executionSnapshot } = useIdeStore();

  // During execution: prefer snapshot call stack (richer) → step result frames → analysis frames
  const snapshotFrames = executionSnapshot?.callStack;
  const executionFrames = currentStepResult?.stackFrames;
  const analysisFrames = analysisResult?.memoryModel?.stackFrames;

  // Build display frames from the best available source
  const frames = React.useMemo(() => {
    if (snapshotFrames && snapshotFrames.length > 0) {
      // Convert StackFrameState to display format
      return snapshotFrames.map(f => ({
        id: f.id,
        methodName: f.methodName,
        className: f.className,
        depth: f.depth,
        isActive: f.isActive,
        callLine: f.callLine,
        returnValue: f.returnValue,
        localVariables: Array.from(f.localVariables.values()).map(v => ({
          id: `${f.id}-${v.name}`,
          name: v.name,
          type: v.type,
          staticValue: v.value != null ? String(v.value) : undefined,
        })),
        parameters: Array.from(f.parameters.values()).map(v => ({
          id: `${f.id}-param-${v.name}`,
          name: v.name,
          type: v.type,
          staticValue: v.value != null ? String(v.value) : undefined,
        })),
        range: { startLine: f.callLine, startColumn: 1, endLine: f.callLine, endColumn: 1 },
      }));
    }
    if (executionFrames && executionFrames.length > 0) {
      return executionFrames.map(f => ({
        id: f.id,
        methodName: f.methodName,
        className: f.className,
        depth: f.depth,
        isActive: f.isActive,
        callLine: f.range?.startLine,
        returnValue: f.returnValue?.staticValue,
        localVariables: f.localVariables.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          staticValue: v.staticValue,
        })),
        parameters: [],
        range: f.range,
      }));
    }
    if (analysisFrames && analysisFrames.length > 0) {
      return analysisFrames.map(f => ({
        id: f.id,
        methodName: f.methodName,
        className: f.className,
        depth: f.depth,
        isActive: f.isActive,
        callLine: f.range?.startLine,
        returnValue: f.returnValue?.staticValue,
        localVariables: f.localVariables.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          staticValue: v.staticValue,
        })),
        parameters: [],
        range: f.range,
      }));
    }
    return [];
  }, [snapshotFrames, executionFrames, analysisFrames]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', borderLeft: '1px solid #21262d', borderTop: '1px solid #21262d',
    }}>
      <div className="panel-header">
        <span>📚</span>
        <span className="panel-title">Call Stack</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#444c56' }}>
          {frames.length} frame{frames.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {frames.length === 0 ? (
          <div style={{ padding: '20px 12px', color: '#444c56', fontSize: '11px', textAlign: 'center' }}>
            No active stack frames
          </div>
        ) : (
          <AnimatePresence>
            {[...frames].reverse().map((frame, idx) => {
              const isTop = idx === 0;
              const allVars = [...frame.parameters, ...frame.localVariables];

              return (
                <motion.div
                  key={frame.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => frame.range && highlightRange(frame.range)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #21262d',
                    cursor: frame.range ? 'pointer' : 'default',
                    background: isTop ? 'rgba(124,58,237,0.08)' : 'transparent',
                    borderLeft: `2px solid ${isTop ? '#7c3aed' : '#21262d'}`,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Method name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: isTop ? '#7c3aed' : '#444c56' }}>
                      {isTop ? '▶' : '○'}
                    </span>
                    <span style={{
                      fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700, color: isTop ? '#e6edf3' : '#8b949e',
                    }}>
                      {frame.className ? `${frame.className}.` : ''}{frame.methodName}()
                    </span>
                    {isTop && (
                      <span style={{ fontSize: '9px', color: '#7c3aed',
                        background: 'rgba(124,58,237,0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                        current
                      </span>
                    )}
                    {/* Depth indicator */}
                    <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#444c56' }}>
                      depth {frame.depth}
                    </span>
                  </div>

                  {/* Call line */}
                  {frame.callLine && (
                    <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '2px',
                      fontFamily: 'monospace', marginLeft: '16px' }}>
                      Line {frame.callLine}
                    </div>
                  )}

                  {/* Return value */}
                  {frame.returnValue !== undefined && frame.returnValue !== null && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      marginTop: '4px', marginLeft: '16px', padding: '2px 6px',
                      background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)',
                      borderRadius: '3px', fontSize: '10px',
                    }}>
                      <span style={{ color: '#3fb950', fontWeight: 600 }}>return</span>
                      <span style={{ color: '#e6edf3', fontFamily: 'monospace' }}>
                        {String(frame.returnValue)}
                      </span>
                    </div>
                  )}

                  {/* Local variable preview */}
                  {allVars.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px',
                      marginLeft: '16px' }}>
                      {allVars.slice(0, 4).map(v => (
                        <div key={v.id} style={{
                          fontSize: '10px', fontFamily: 'monospace',
                          color: '#6e7681', background: '#161b22',
                          border: '1px solid #21262d', borderRadius: '3px',
                          padding: '1px 5px',
                        }}>
                          <span style={{ color: '#06b6d4' }}>{v.name}</span>
                          {v.staticValue && <span style={{ color: '#3fb950' }}>={v.staticValue}</span>}
                        </div>
                      ))}
                      {allVars.length > 4 && (
                        <span style={{ fontSize: '10px', color: '#444c56' }}>
                          +{allVars.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
