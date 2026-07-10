import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';

export function ProblemsPanel() {
  const { analysisResult, highlightRange } = useIdeStore();
  const diagnostics = analysisResult?.diagnostics ?? [];

  if (diagnostics.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '8px', color: '#3fb950', fontSize: '12px' }}>
        <span style={{ fontSize: '16px' }}>✅</span>
        No problems detected
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <AnimatePresence>
        {diagnostics.map((diag) => {
          const isError = diag.severity === 'ERROR';
          const isWarning = diag.severity === 'WARNING';
          const color = isError ? '#f85149' : isWarning ? '#d29922' : '#06b6d4';
          const bg = isError ? 'rgba(248,81,73,0.05)' : isWarning ? 'rgba(210,153,34,0.05)' : 'rgba(6,182,212,0.05)';
          const icon = isError ? '❌' : isWarning ? '⚠️' : 'ℹ️';

          return (
            <motion.div
              key={diag.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => diag.range && highlightRange(diag.range)}
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid #21262d',
                cursor: diag.range ? 'pointer' : 'default',
                background: bg,
                borderLeft: `3px solid ${color}`,
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#e6edf3', lineHeight: '1.5' }}>
                    {diag.humanMessage}
                  </div>
                  {diag.suggestion && (
                    <div style={{ fontSize: '11px', color: '#3fb950', marginTop: '2px', display: 'flex', gap: '4px' }}>
                      <span>💡</span>
                      <span>{diag.suggestion}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                    {diag.range && (
                      <span style={{ fontSize: '10px', color: '#6e7681', fontFamily: 'monospace' }}>
                        Line {diag.range.startLine}:{diag.range.startColumn}
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: color, fontFamily: 'monospace' }}>
                      {diag.severity}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
