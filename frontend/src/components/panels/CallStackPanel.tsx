import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';

export function CallStackPanel() {
  const { currentStepResult, analysisResult, highlightRange } = useIdeStore();

  // During execution: show actual call stack from step result
  const executionFrames = currentStepResult?.stackFrames;

  // During analysis: show inferred stack frames from memory model
  const analysisFrames = analysisResult?.memoryModel?.stackFrames;

  const frames = executionFrames ?? analysisFrames ?? [];

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: isTop ? '#7c3aed' : '#444c56' }}>
                      {isTop ? '▶' : '○'}
                    </span>
                    <span style={{
                      fontSize: '12px', fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700, color: isTop ? '#e6edf3' : '#8b949e',
                    }}>
                      {frame.methodName}()
                    </span>
                    {isTop && (
                      <span style={{ fontSize: '9px', color: '#7c3aed',
                        background: 'rgba(124,58,237,0.15)', padding: '1px 5px', borderRadius: '3px' }}>
                        current
                      </span>
                    )}
                  </div>

                  {frame.range && (
                    <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '2px',
                      fontFamily: 'monospace', marginLeft: '16px' }}>
                      Line {frame.range.startLine}
                    </div>
                  )}

                  {/* Local variable preview */}
                  {frame.localVariables.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px',
                      marginLeft: '16px' }}>
                      {frame.localVariables.slice(0, 3).map(v => (
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
                      {frame.localVariables.length > 3 && (
                        <span style={{ fontSize: '10px', color: '#444c56' }}>
                          +{frame.localVariables.length - 3}
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
