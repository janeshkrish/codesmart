import React from 'react';
import { useIdeStore } from '../../store/ideStore';
import { ProblemsPanel } from './ProblemsPanel';
import { SymbolTablePanel } from './SymbolTablePanel';
import { ExplanationPanel } from './ExplanationPanel';
import { TimelinePanel } from './TimelinePanel';
import { SearchPanel } from './SearchPanel';
import type { BottomTab } from '../../types';

const TABS: { id: BottomTab; label: string; icon: string }[] = [
  { id: 'problems', label: 'Problems', icon: '⚠️' },
  { id: 'symtable', label: 'Symbols', icon: '📊' },
  { id: 'explanation', label: 'Explain', icon: '💡' },
  { id: 'debugger', label: 'Debugger', icon: '🐞' },
  { id: 'timeline', label: 'Timeline', icon: '⏱' },
  { id: 'search', label: 'Search', icon: '🔍' },
];

export function BottomPanel() {
  const { activeBottomTab, setActiveBottomTab, analysisResult, executionSnapshots } = useIdeStore();

  const errorCount = analysisResult?.diagnostics.filter(d => d.severity === 'ERROR').length ?? 0;
  const warnCount = analysisResult?.diagnostics.filter(d => d.severity === 'WARNING').length ?? 0;
  const timelineCount = executionSnapshots.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', borderTop: '1px solid #21262d' }}>

      {/* Tab bar */}
      <div style={{
        display: 'flex', background: '#0d1117',
        borderBottom: '1px solid #21262d', flexShrink: 0,
      }}>
        {TABS.map(tab => {
          const badge = tab.id === 'problems' && (errorCount + warnCount) > 0
            ? errorCount + warnCount
            : tab.id === 'timeline' && timelineCount > 0
            ? timelineCount
            : null;
          const badgeColor = tab.id === 'problems'
            ? (errorCount > 0 ? '#f85149' : '#d29922')
            : '#7c3aed';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveBottomTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '0 14px', height: '34px', fontSize: '11px', fontWeight: 600,
                color: activeBottomTab === tab.id ? '#e6edf3' : '#6e7681',
                background: activeBottomTab === tab.id ? '#161b22' : 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeBottomTab === tab.id ? '#7c3aed' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {badge && (
                <span style={{
                  background: badgeColor,
                  color: 'white', borderRadius: '10px',
                  padding: '0 5px', fontSize: '9px', fontWeight: 700,
                  minWidth: '16px', textAlign: 'center',
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeBottomTab === 'problems' && <ProblemsPanel />}
        {activeBottomTab === 'symtable' && <SymbolTablePanel />}
        {activeBottomTab === 'explanation' && <ExplanationPanel />}
        {activeBottomTab === 'timeline' && <TimelinePanel />}
        {activeBottomTab === 'debugger' && (
          <div style={{ padding: '12px', color: '#8b949e', fontSize: '12px' }}>
            <div style={{ color: '#e6edf3', fontWeight: 600, marginBottom: '8px' }}>Debugger State</div>
            <div>Use the Call Stack panel for variables and frames. Set breakpoints in the editor gutter.</div>
          </div>
        )}
        {activeBottomTab === 'search' && <SearchPanel />}
      </div>
    </div>
  );
}
