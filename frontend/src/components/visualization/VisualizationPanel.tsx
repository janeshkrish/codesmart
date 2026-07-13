import { useIdeStore } from '../../store/ideStore';
import { MemoryPanel } from './MemoryPanel';
import { AstPanel } from './AstPanel';
import { FlowchartPanel } from './FlowchartPanel';
import { CallGraphPanel } from './CallGraphPanel';
import { ClassDiagramPanel } from './ClassDiagramPanel';
import { CollectionsPanel } from './CollectionsPanel';
import { StreamPipelinePanel } from './StreamPipelinePanel';
import { ScopePanel } from './ScopePanel';
import { LoopTracePanel } from './LoopTracePanel';
import { RecursionTreePanel } from './RecursionTreePanel';
import { DpTablePanel } from './DpTablePanel';
import { MemoizationPanel } from './MemoizationPanel';
import type { VisualizationTab } from '../../types';

const TABS: { id: VisualizationTab; label: string; icon: string }[] = [
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'ast', label: 'AST', icon: '🌳' },
  { id: 'flowchart', label: 'Flow', icon: '⚡' },
  { id: 'callgraph', label: 'Calls', icon: '📞' },
  { id: 'classdiagram', label: 'UML', icon: '📐' },
  { id: 'collections', label: 'Collections', icon: '📦' },
  { id: 'streams', label: 'Streams', icon: '🌊' },
  { id: 'scope', label: 'Scopes', icon: '🔭' },
  { id: 'looptrace', label: 'Loops', icon: '🔁' },
  { id: 'recursiontree', label: 'Recursion', icon: '🌲' },
  { id: 'dptable', label: 'DP Table', icon: '▦' },
  { id: 'memoization', label: 'Memo', icon: '⇥' },
];

export function VisualizationPanel() {
  const { activeVisualizationTab, setActiveVisualizationTab, isAnalyzing } = useIdeStore();

  const renderPanel = () => {
    switch (activeVisualizationTab) {
      case 'memory':       return <MemoryPanel />;
      case 'ast':          return <AstPanel />;
      case 'flowchart':    return <FlowchartPanel />;
      case 'callgraph':    return <CallGraphPanel />;
      case 'classdiagram': return <ClassDiagramPanel />;
      case 'collections':  return <CollectionsPanel />;
      case 'streams':      return <StreamPipelinePanel />;
      case 'scope':        return <ScopePanel />;
      case 'looptrace':    return <LoopTracePanel />;
      case 'recursiontree':return <RecursionTreePanel />;
      case 'dptable':      return <DpTablePanel />;
      case 'memoization':  return <MemoizationPanel />;
      default:             return <MemoryPanel />;
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      borderLeft: '1px solid #21262d',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0d1117',
        borderBottom: '1px solid #21262d',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveVisualizationTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '0 14px',
              height: '36px',
              fontSize: '11px',
              fontWeight: 600,
              color: activeVisualizationTab === tab.id ? '#e6edf3' : '#6e7681',
              background: activeVisualizationTab === tab.id ? '#161b22' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeVisualizationTab === tab.id ? '#7c3aed' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '12px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        {isAnalyzing && (
          <div style={{
            marginLeft: 'auto',
            marginRight: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#7c3aed',
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: '#7c3aed',
              animation: 'pulse 1s ease-in-out infinite',
            }} />
            Analyzing...
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderPanel()}
      </div>
    </div>
  );
}
