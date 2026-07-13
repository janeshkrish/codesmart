import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import {
  extractFirst2DArray, extractFirst1DArray,
  findChangedCell, findChangedIndex,
  type ArrayCellValue,
} from '../../utils/dpTableExtractor';

export function DpTablePanel() {
  const { executionSteps, currentStepResult, executionSnapshot } = useIdeStore();

  // ─── 1. Try execution-engine snapshot first (richest source) ───────────────
  const snapDp2D = useMemo(() => {
    const dpArrays = executionSnapshot?.dpArrays ?? [];
    const arr2D = dpArrays.find(d => d.dimensions === 2 && d.values2D && d.values2D.length > 0);
    if (arr2D?.values2D) return { variableName: arr2D.name, values: arr2D.values2D as ArrayCellValue[][] };
    return null;
  }, [executionSnapshot]);

  const snapDp1D = useMemo(() => {
    const dpArrays = executionSnapshot?.dpArrays ?? [];
    const arr1D = dpArrays.find(d => d.dimensions === 1 && d.values1D && d.values1D.length > 0);
    if (arr1D?.values1D) return { variableName: arr1D.name, values: arr1D.values1D as ArrayCellValue[] };
    return null;
  }, [executionSnapshot]);

  // ─── 2. Fallback: extract from memory snapshots in step results ─────────────
  const prevSnapshot = executionSteps.length > 1
    ? executionSteps[executionSteps.length - 2]?.memorySnapshot
    : null;
  const currSnapshot = currentStepResult?.memorySnapshot ?? executionSteps.at(-1)?.memorySnapshot;

  const previousTable2D = useMemo(() => extractFirst2DArray(prevSnapshot), [prevSnapshot]);
  const table2D = useMemo(() => snapDp2D ?? extractFirst2DArray(currSnapshot), [snapDp2D, currSnapshot]);

  const previousTable1D = useMemo(() => extractFirst1DArray(prevSnapshot), [prevSnapshot]);
  const table1D = useMemo(() => snapDp1D ?? extractFirst1DArray(currSnapshot), [snapDp1D, currSnapshot]);

  // Changed cell/index detection
  const changedCell = useMemo(() => findChangedCell(previousTable2D, table2D), [previousTable2D, table2D]);
  const changedIndex = useMemo(() => findChangedIndex(previousTable1D, table1D), [previousTable1D, table1D]);

  // Current step's last-changed highlight from snapshot
  const snapLastChanged2D = executionSnapshot?.dpArrays.find(d => d.dimensions === 2)?.lastChangedIndex;
  const snapLastChanged1D = executionSnapshot?.dpArrays.find(d => d.dimensions === 1)?.lastChangedIndex;

  const effectiveChanged2D = changedCell ?? (snapLastChanged2D?.row != null && snapLastChanged2D.col != null
    ? { row: snapLastChanged2D.row!, col: snapLastChanged2D.col! }
    : null);
  const effectiveChanged1D = changedIndex ?? (snapLastChanged1D?.index != null
    ? { index: snapLastChanged1D.index! }
    : null);

  // ─── 3. Render ──────────────────────────────────────────────────────────────

  if (!table2D && !table1D) {
    return (
      <EmptyState message="Declare a DP array (e.g. int[][] dp or int[] dp) and step through to see it fill in live" />
    );
  }

  if (table2D) {
    return <Table2D table={table2D} changedCell={effectiveChanged2D} />;
  }

  return <Table1D table={table1D!} changedIndex={effectiveChanged1D} />;
}

// ─── 2D Table ──────────────────────────────────────────────────────────────────

function Table2D({
  table,
  changedCell,
}: {
  table: { variableName: string; values: ArrayCellValue[][] };
  changedCell: { row: number; col: number } | null;
}) {
  const columnCount = Math.max(...table.values.map(r => r.length), 0);

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0d1117', padding: '16px' }}>
      {/* Variable name + legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ color: '#06b6d4', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700 }}>
          {table.variableName}
        </span>
        <span style={{ fontSize: '10px', color: '#6e7681' }}>
          {table.values.length} × {columnCount}
        </span>
        <span style={{ fontSize: '10px', background: 'rgba(63,185,80,0.15)', color: '#3fb950',
          border: '1px solid rgba(63,185,80,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
          ● just updated
        </span>
        <span style={{ fontSize: '10px', background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
          border: '1px solid rgba(124,58,237,0.3)', borderRadius: '4px', padding: '1px 6px' }}>
          ● filled
        </span>
      </div>

      <table style={{ borderCollapse: 'collapse', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#e6edf3' }}>
        <thead>
          <tr>
            <th style={headerCellStyle}>↓row / col→</th>
            {Array.from({ length: columnCount }, (_, col) => (
              <th key={col} style={headerCellStyle}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.values.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th style={headerCellStyle}>{rowIndex}</th>
              {Array.from({ length: columnCount }, (_, colIndex) => {
                const isChanged = changedCell?.row === rowIndex && changedCell.col === colIndex;
                const val = row[colIndex];
                const isFilled = val !== null && val !== undefined && val !== 0 && val !== '0';
                return (
                  <td key={colIndex} style={{
                    width: 48, height: 40, textAlign: 'center',
                    border: `1px solid ${isChanged ? '#3fb950' : isFilled ? 'rgba(124,58,237,0.4)' : '#21262d'}`,
                    background: isChanged
                      ? 'rgba(63,185,80,0.28)'
                      : isFilled ? 'rgba(124,58,237,0.08)' : '#161b22',
                    color: isChanged ? '#3fb950' : isFilled ? '#a78bfa' : '#444c56',
                    transition: 'background 0.3s, border-color 0.3s, color 0.3s',
                    fontWeight: isChanged ? 700 : 400,
                    position: 'relative',
                  }}>
                    {isChanged && (
                      <motion.div
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {String(val ?? 0)}
                      </motion.div>
                    )}
                    {!isChanged && String(val ?? 0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 1D Table ──────────────────────────────────────────────────────────────────

function Table1D({
  table,
  changedIndex,
}: {
  table: { variableName: string; values: ArrayCellValue[] };
  changedIndex: { index: number } | null;
}) {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#0d1117', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
        <span style={{ color: '#06b6d4', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 700 }}>
          {table.variableName}
        </span>
        <span style={{ fontSize: '10px', color: '#6e7681' }}>length: {table.values.length}</span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {table.values.map((val, idx) => {
          const isChanged = changedIndex?.index === idx;
          const isFilled = val !== null && val !== undefined && val !== 0;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
              <div style={{ fontSize: '9px', color: '#444c56', fontFamily: 'monospace' }}>[{idx}]</div>
              <motion.div
                animate={{ scale: isChanged ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 48, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${isChanged ? '#3fb950' : isFilled ? 'rgba(124,58,237,0.4)' : '#21262d'}`,
                  background: isChanged
                    ? 'rgba(63,185,80,0.28)'
                    : isFilled ? 'rgba(124,58,237,0.08)' : '#161b22',
                  color: isChanged ? '#3fb950' : isFilled ? '#a78bfa' : '#444c56',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: isChanged ? 700 : 400,
                  fontFamily: 'JetBrains Mono, monospace',
                  transition: 'background 0.3s, border-color 0.3s',
                }}
              >
                {String(val ?? 0)}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const headerCellStyle = {
  width: 48, height: 36,
  textAlign: 'center' as const,
  border: '1px solid #21262d',
  background: '#0d1117',
  color: '#6e7681',
  fontWeight: 700,
  fontSize: '10px',
  fontFamily: 'JetBrains Mono, monospace',
  padding: '0 4px',
};

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '12px', color: '#6e7681', textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '32px' }}>▦</div>
      <div style={{ fontSize: '13px', maxWidth: '300px', lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}
