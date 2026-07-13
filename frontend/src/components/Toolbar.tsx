import React, { useEffect } from 'react';
import {
  Play, StepForward, StepBack, Pause, RotateCcw, Square,
  Zap, Layout, BookOpen, Settings, GitBranch, Bug,
  Wifi, WifiOff, ArrowDownToLine, ArrowRightToLine, ArrowUpFromLine, PlayCircle
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import { useExecution } from '../hooks/useExecution';

export function Toolbar() {
  const { wsConnected, isExecuting, executionPaused } = useIdeStore();

  const {
    run, step, stepInto, stepOver, stepOut, stepBack,
    continueExecution, pause, resume, stop, restart,
  } = useExecution();

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); run(); }
      if (e.key === 'F6') { e.preventDefault(); step(); }
      if (e.key === 'F7') { e.preventDefault(); stepInto(); }
      if (e.key === 'F8' && !e.shiftKey) { e.preventDefault(); stepOver(); }
      if (e.key === 'F8' && e.shiftKey) { e.preventDefault(); stepOut(); }
      if (e.key === 'F9') { e.preventDefault(); continueExecution(); }
      if (e.key === 'F10') { e.preventDefault(); restart(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const hasEngine = isExecuting;

  return (
    <div
      style={{
        height: '48px',
        background: '#0d1117',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '8px',
        flexShrink: 0,
        minWidth: 0,
        overflowX: 'auto',
        userSelect: 'none',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', flexShrink: 0 }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 800, color: 'white', letterSpacing: '-1px',
          boxShadow: '0 0 12px rgba(124,58,237,0.5)',
        }}>CS</div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', letterSpacing: '-0.3px' }}>
          CodeSmart
        </span>
        <span style={{ fontSize: '10px', color: '#7c3aed', background: 'rgba(124,58,237,0.15)',
          padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(124,58,237,0.3)' }}>
          IDE
        </span>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '24px', background: '#30363d', margin: '0 4px' }} />

      {/* Execution Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <ToolbarButton
          icon={<Play size={14} />}
          label="Run"
          onClick={run}
          disabled={isExecuting}
          variant="success"
          tooltip="Run program (F5)"
        />
        <ToolbarButton
          icon={<StepForward size={14} />}
          label="Step"
          onClick={step}
          tooltip="Step Forward (F6)"
        />
        <div className="toolbar-group">
          <ToolbarButton
            icon={<ArrowDownToLine size={14} />}
            label="Into"
            onClick={stepInto}
            tooltip="Step Into (F7)"
          />
          <ToolbarButton
            icon={<ArrowRightToLine size={14} />}
            label="Over"
            onClick={stepOver}
            tooltip="Step Over (F8)"
          />
          <ToolbarButton
            icon={<ArrowUpFromLine size={14} />}
            label="Out"
            onClick={stepOut}
            disabled={!hasEngine}
            tooltip="Step Out (Shift+F8)"
          />
        </div>
        <ToolbarButton
          icon={<StepBack size={14} />}
          label="Back"
          onClick={stepBack}
          disabled={!hasEngine}
          tooltip="Step Backward"
        />
        <div className="toolbar-group">
          <ToolbarButton
            icon={<Pause size={14} />}
            label="Pause"
            onClick={pause}
            disabled={!isExecuting || executionPaused}
            tooltip="Pause Execution"
          />
          <ToolbarButton
            icon={<PlayCircle size={14} />}
            label="Resume"
            onClick={resume}
            disabled={!executionPaused}
            tooltip="Resume Execution (F9)"
          />
          <ToolbarButton
            icon={<Play size={14} style={{ color: '#d29922' }} />}
            label="Continue"
            onClick={continueExecution}
            disabled={!hasEngine}
            tooltip="Run to Next Breakpoint (F9)"
          />
        </div>
        <ToolbarButton
          icon={<RotateCcw size={14} />}
          label="Restart"
          onClick={restart}
          disabled={!hasEngine}
          tooltip="Restart (F10)"
        />
        <ToolbarButton
          icon={<Square size={14} />}
          label="Stop"
          onClick={stop}
          disabled={!hasEngine}
          variant="danger"
          tooltip="Stop Execution"
        />
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '24px', background: '#30363d', margin: '0 8px' }} />

      {/* View shortcuts */}
      <VisualizationShortcuts />

      {/* Spacer */}
      <div style={{ flex: 1, minWidth: '12px' }} />

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Execution status */}
        {isExecuting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: executionPaused ? '#d29922' : '#3fb950' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: executionPaused ? '#d29922' : '#3fb950',
              animation: executionPaused ? 'none' : 'pulse-glow 1.5s ease infinite',
            }} />
            {executionPaused ? 'Paused' : 'Running'}
          </div>
        )}

        {/* WS Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '11px', color: wsConnected ? '#3fb950' : '#8b949e' }}>
          {wsConnected
            ? <Wifi size={12} style={{ color: '#3fb950' }} />
            : <WifiOff size={12} />}
          {wsConnected ? 'Live' : 'Offline'}
        </div>

        {/* Settings */}
        <button className="btn btn-ghost btn-icon" title="Settings">
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Toolbar Button
// ============================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'success' | 'danger';
  tooltip?: string;
}

function ToolbarButton({ icon, label, onClick, disabled, variant = 'default', tooltip }: ToolbarButtonProps) {
  const colors = {
    default: { bg: 'transparent', color: '#8b949e', hover: '#e6edf3', border: 'transparent' },
    success: { bg: 'rgba(63,185,80,0.1)', color: '#3fb950', hover: '#4cda60', border: 'rgba(63,185,80,0.3)' },
    danger: { bg: 'rgba(248,81,73,0.1)', color: '#f85149', hover: '#ff6b63', border: 'rgba(248,81,73,0.3)' },
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', borderRadius: '5px', border: `1px solid ${colors.border}`,
        background: colors.bg, color: disabled ? '#444c56' : colors.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '11px', fontWeight: 500, transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      <span className="cs-toolbar-label">{label}</span>
    </button>
  );
}

// ============================================================
// Visualization Tab Shortcuts
// ============================================================

function VisualizationShortcuts() {
  const { setActiveVisualizationTab, activeVisualizationTab } = useIdeStore();

  const tabs = [
    { id: 'memory' as const, icon: <Layout size={13} />, label: 'Memory' },
    { id: 'ast' as const, icon: <GitBranch size={13} />, label: 'AST' },
    { id: 'flowchart' as const, icon: <Zap size={13} />, label: 'Flow' },
    { id: 'callgraph' as const, icon: <Bug size={13} />, label: 'Calls' },
    { id: 'classdiagram' as const, icon: <BookOpen size={13} />, label: 'UML' },
    { id: 'collections' as const, icon: <Layout size={13} />, label: 'Collections' },
    { id: 'looptrace' as const, icon: <StepForward size={13} />, label: 'Loops' },
    { id: 'recursiontree' as const, icon: <GitBranch size={13} />, label: 'Recursion' },
    { id: 'dptable' as const, icon: <Layout size={13} />, label: 'DP' },
    { id: 'memoization' as const, icon: <Zap size={13} />, label: 'Memo' },
  ];

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveVisualizationTab(tab.id)}
          title={tab.label}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '5px',
            border: `1px solid ${activeVisualizationTab === tab.id ? '#7c3aed' : 'transparent'}`,
            background: activeVisualizationTab === tab.id ? 'rgba(124,58,237,0.15)' : 'transparent',
            color: activeVisualizationTab === tab.id ? '#a78bfa' : '#8b949e',
            cursor: 'pointer', fontSize: '11px', fontWeight: 500, transition: 'all 0.15s',
          }}
        >
          {tab.icon}
          <span className="cs-visualization-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
