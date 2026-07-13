import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import { executionEngine } from '../../services/executionEngine';
import type { ExecutionSnapshot } from '../../services/executionEngine';

// ============================================================
// Timeline Panel — Step-through History & Time-Travel Debugging
// Shows execution history as a scrollable list, allows jumping
// to any step to restore all visualizer state.
// ============================================================

export function TimelinePanel() {
  const {
    executionSnapshots, currentSnapshotIndex, isExecuting,
    goToStep, syncExecutionState, setCurrentExecutionLine,
    addExecutionStep,
  } = useIdeStore();

  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step
  useEffect(() => {
    if (listRef.current && currentSnapshotIndex >= 0) {
      const items = listRef.current.children;
      if (items[currentSnapshotIndex]) {
        items[currentSnapshotIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSnapshotIndex]);

  const handleJumpToStep = useCallback((index: number) => {
    // Use the store's goToStep action
    goToStep(index);

    // Also tell the execution engine to jump to this step
    const snapshot = executionEngine.goToStep(index);
    if (snapshot) {
      syncExecutionState(snapshot);
      setCurrentExecutionLine(snapshot.currentLine);
    }
  }, [goToStep, syncExecutionState, setCurrentExecutionLine]);

  if (executionSnapshots.length === 0) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '10px', color: '#6e7681', padding: '24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px' }}>⏱</div>
        <div style={{ fontSize: '12px', maxWidth: '260px', lineHeight: 1.6 }}>
          Step through your code to build a timeline. Click any step to time-travel back.
        </div>
        <div style={{ fontSize: '10px', color: '#444c56', maxWidth: '240px' }}>
          Tip: Use Step (F6), Step Into (F7), or Run (F5) to start execution
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      {/* Header */}
      <div style={{
        padding: '6px 12px', borderBottom: '1px solid #21262d',
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#e6edf3' }}>
          ⏱ Timeline
        </span>
        <span style={{ fontSize: '10px', color: '#6e7681' }}>
          {executionSnapshots.length} step{executionSnapshots.length !== 1 ? 's' : ''}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#444c56' }}>
          step {currentSnapshotIndex + 1} / {executionSnapshots.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '4px 12px', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        <div style={{
          height: '4px', borderRadius: '2px', background: '#161b22',
          overflow: 'hidden', position: 'relative',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentSnapshotIndex + 1) / executionSnapshots.length) * 100}%` }}
            transition={{ duration: 0.2 }}
            style={{
              height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {executionSnapshots.map((snapshot, index) => {
          const isCurrent = index === currentSnapshotIndex;
          const stepType = getStepType(snapshot);
          const stepColor = getStepColor(stepType);

          return (
            <div
              key={index}
              onClick={() => handleJumpToStep(index)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: isCurrent ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: `3px solid ${isCurrent ? '#7c3aed' : 'transparent'}`,
                borderBottom: '1px solid rgba(33,38,45,0.5)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'flex-start', gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'rgba(22,27,34,0.8)';
              }}
              onMouseLeave={(e) => {
                if (!isCurrent) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Step index */}
              <div style={{
                minWidth: '24px', height: '24px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isCurrent ? 'rgba(124,58,237,0.25)' : 'rgba(33,38,45,0.5)',
                border: `1px solid ${isCurrent ? '#7c3aed' : '#30363d'}`,
                fontSize: '9px', fontWeight: 700,
                color: isCurrent ? '#a78bfa' : '#6e7681',
                fontFamily: 'monospace', flexShrink: 0,
              }}>
                {index + 1}
              </div>

              {/* Step info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Type badge + line */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, padding: '1px 5px',
                    borderRadius: '3px', background: `${stepColor}15`,
                    color: stepColor, border: `1px solid ${stepColor}30`,
                    textTransform: 'uppercase',
                  }}>
                    {stepType}
                  </span>
                  <span style={{ fontSize: '10px', color: '#6e7681', fontFamily: 'monospace' }}>
                    line {snapshot.currentLine}
                  </span>
                </div>

                {/* Statement */}
                <div style={{
                  fontSize: '11px', fontFamily: 'JetBrains Mono, monospace',
                  color: isCurrent ? '#e6edf3' : '#8b949e',
                  marginTop: '2px', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {truncateStatement(snapshot.currentStatement)}
                </div>

                {/* Variable changes */}
                {Object.keys(snapshot.variables).length > 0 && (
                  <div style={{
                    display: 'flex', gap: '4px', flexWrap: 'wrap',
                    marginTop: '3px',
                  }}>
                    {Object.entries(snapshot.variables).slice(0, 4).map(([name, value]) => (
                      <span key={name} style={{
                        fontSize: '9px', fontFamily: 'monospace',
                        color: '#6e7681', background: '#161b22',
                        border: '1px solid #21262d', borderRadius: '3px',
                        padding: '0 4px',
                      }}>
                        <span style={{ color: '#06b6d4' }}>{name}</span>
                        <span style={{ color: '#3fb950' }}>={String(value)}</span>
                      </span>
                    ))}
                    {Object.keys(snapshot.variables).length > 4 && (
                      <span style={{ fontSize: '9px', color: '#444c56' }}>
                        +{Object.keys(snapshot.variables).length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

type StepTypeLabel = 'stmt' | 'call' | 'return' | 'branch' | 'loop' | 'assign' | 'output';

function getStepType(snapshot: ExecutionSnapshot): StepTypeLabel {
  const stmt = snapshot.currentStatement.toLowerCase();
  if (stmt.includes('return')) return 'return';
  if (stmt.includes('system.out.print')) return 'output';
  if (stmt.includes('if') || stmt.includes('switch')) return 'branch';
  if (stmt.includes('for') || stmt.includes('while')) return 'loop';
  if (stmt.includes('(') && !stmt.includes('=')) return 'call';
  if (stmt.includes('=')) return 'assign';
  return 'stmt';
}

function getStepColor(type: StepTypeLabel): string {
  const colors: Record<StepTypeLabel, string> = {
    stmt: '#8b949e',
    call: '#a78bfa',
    return: '#3b82f6',
    branch: '#d29922',
    loop: '#f0883e',
    assign: '#06b6d4',
    output: '#3fb950',
  };
  return colors[type];
}

function truncateStatement(s: string, maxLen = 60): string {
  if (!s) return '';
  const trimmed = s.trim().replace(/\s+/g, ' ');
  return trimmed.length > maxLen ? trimmed.substring(0, maxLen) + '…' : trimmed;
}
