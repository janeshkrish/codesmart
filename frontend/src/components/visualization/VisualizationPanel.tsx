import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Play, StepBack, StepForward, Pause, RotateCcw, Square, ArrowDownToLine, ArrowRightToLine, ArrowUpFromLine } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';
import { useExecution } from '../../hooks/useExecution';
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
  const { activeVisualizationTab, setActiveVisualizationTab, isAnalyzing, isExecuting, executionPaused } = useIdeStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const controls = useExecution();

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await panelRef.current?.requestFullscreen();
  };

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
    <div ref={panelRef} style={{
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
        {isFullscreen && <VisualizationControls controls={controls} isExecuting={isExecuting} executionPaused={executionPaused} />}

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
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen' : 'Open visualizer in full screen'}
          style={{
            marginLeft: 'auto', marginRight: '8px', width: '28px', height: '28px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: '#8b949e', background: 'transparent', border: '1px solid #30363d', borderRadius: '4px',
          }}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {renderPanel()}
      </div>
    </div>
  );
}

function VisualizationControls({
  controls,
  isExecuting,
  executionPaused,
}: {
  controls: ReturnType<typeof useExecution>;
  isExecuting: boolean;
  executionPaused: boolean;
}) {
  const actions = [
    ['Run', <Play size={13} />, controls.run, !isExecuting],
    ['Step', <StepForward size={13} />, controls.step, false],
    ['Into', <ArrowDownToLine size={13} />, controls.stepInto, false],
    ['Over', <ArrowRightToLine size={13} />, controls.stepOver, false],
    ['Out', <ArrowUpFromLine size={13} />, controls.stepOut, !isExecuting],
    ['Back', <StepBack size={13} />, controls.stepBack, !isExecuting],
    ['Pause', <Pause size={13} />, controls.pause, !isExecuting || executionPaused],
    ['Resume', <Play size={13} />, controls.resume, !executionPaused],
    ['Restart', <RotateCcw size={13} />, controls.restart, !isExecuting],
    ['Stop', <Square size={13} />, controls.stop, !isExecuting],
  ] as const;

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center', padding: '0 8px', borderRight: '1px solid #30363d', flexShrink: 0 }}>
      {actions.map(([label, icon, onClick, disabled]) => (
        <button key={label} onClick={onClick} disabled={disabled} title={label} style={{
          height: '25px', display: 'flex', alignItems: 'center', gap: '3px', padding: '0 6px',
          background: label === 'Run' ? 'rgba(63,185,80,0.12)' : 'transparent',
          color: disabled ? '#484f58' : label === 'Run' ? '#3fb950' : '#c9d1d9',
          border: '1px solid #30363d', borderRadius: '4px', fontSize: '10px', cursor: disabled ? 'not-allowed' : 'pointer',
        }}>
          {icon}{label}
        </button>
      ))}
    </div>
  );
}
