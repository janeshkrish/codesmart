import React from 'react';
import {
  Play, StepForward, StepBack, Pause, RotateCcw, Square,
  Zap, Layout, BookOpen, Settings, GitBranch, Bug,
  Wifi, WifiOff, ArrowDownToLine, ArrowRightToLine, ArrowUpFromLine, PlayCircle
} from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import { apiService } from '../services/apiService';

export function Toolbar() {
  const {
    wsConnected, executionId, isExecuting,
    setExecutionId, setIsExecuting, addExecutionStep,
    clearConsoleOutput, sourceCode, setActiveBottomTab,
    setCurrentExecutionLine
  } = useIdeStore();

  const handleRun = async () => {
    if (isExecuting) return;
    clearConsoleOutput();
    setIsExecuting(true);
    try {
      const { executionId: id } = await apiService.startExecution(sourceCode, 'Main');
      setExecutionId(id);
      // Subscribe to execution events
      apiService.subscribeToExecution(id, (step) => {
        addExecutionStep(step);
        if (step.type === 'FINISHED' || step.type === 'ERROR') {
          setIsExecuting(false);
        }
      });
      await apiService.runToCompletion(id);
      setActiveBottomTab('debugger');
    } catch (e) {
      console.error('Run failed:', e);
      setIsExecuting(false);
    }
  };

  const handleStep = async () => {
    if (!executionId) {
      // Start session first
      const { executionId: id } = await apiService.startExecution(sourceCode, 'Main');
      setExecutionId(id);
      setIsExecuting(true);
    }
    if (executionId) {
      const { step } = await apiService.stepForward(executionId);
      addExecutionStep(step);
      if (step.currentLine) setCurrentExecutionLine(step.currentLine);
    }
  };

  const handleStepInto = async () => {
    if (!executionId) return;
    const { step } = await apiService.stepInto(executionId);
    addExecutionStep(step);
    if (step.currentLine) setCurrentExecutionLine(step.currentLine);
  };

  const handleStepOver = async () => {
    if (!executionId) return;
    const { step } = await apiService.stepOver(executionId);
    addExecutionStep(step);
    if (step.currentLine) setCurrentExecutionLine(step.currentLine);
  };

  const handleStepOut = async () => {
    if (!executionId) return;
    const { step } = await apiService.stepOut(executionId);
    addExecutionStep(step);
    if (step.currentLine) setCurrentExecutionLine(step.currentLine);
  };

  const handleContinue = async () => {
    if (!executionId) return;
    await apiService.continueExecution(executionId);
  };

  const handleStepBack = async () => {
    if (!executionId) return;
    const { step } = await apiService.stepBackward(executionId);
    addExecutionStep(step);
  };

  const handlePause = async () => {
    if (!executionId) return;
    await apiService.pauseExecution(executionId);
    setIsExecuting(false);
  };

  const handleResume = async () => {
    if (!executionId) return;
    await apiService.resumeExecution(executionId);
    setIsExecuting(true);
  };

  const handleStop = async () => {
    if (!executionId) return;
    await apiService.stopExecution(executionId);
    setExecutionId(null);
    setIsExecuting(false);
    setCurrentExecutionLine(null);
  };

  const handleRestart = async () => {
    if (!executionId) return;
    await apiService.restartExecution(executionId);
    clearConsoleOutput();
  };

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
        userSelect: 'none',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <ToolbarButton
          icon={<Play size={14} />}
          label="Run"
          onClick={handleRun}
          disabled={isExecuting}
          variant="success"
          tooltip="Run program"
        />
        <ToolbarButton
          icon={<StepForward size={14} />}
          label="Step"
          onClick={handleStep}
          tooltip="Step Forward (F6)"
        />
        <div className="toolbar-group">
          <ToolbarButton
            icon={<ArrowDownToLine size={14} />}
            label="Into"
            onClick={handleStepInto}
            disabled={!executionId}
            tooltip="Step Into (F7)"
          />
          <ToolbarButton
            icon={<ArrowRightToLine size={14} />}
            label="Over"
            onClick={handleStepOver}
            disabled={!executionId}
            tooltip="Step Over (F8)"
          />
          <ToolbarButton
            icon={<ArrowUpFromLine size={14} />}
            label="Out"
            onClick={handleStepOut}
            disabled={!executionId}
            tooltip="Step Out (Shift+F8)"
          />
        </div>
        <ToolbarButton
          icon={<StepBack size={14} />}
          label="Back"
          onClick={handleStepBack}
          disabled={!executionId}
          tooltip="Step Backward"
        />
        <div className="toolbar-group">
          <ToolbarButton
            icon={<Pause size={14} />}
            label="Pause"
            onClick={handlePause}
            disabled={!isExecuting || !executionId}
            tooltip="Pause Execution"
          />
          <ToolbarButton
            icon={<PlayCircle size={14} />}
            label="Resume"
            onClick={handleResume}
            disabled={isExecuting || !executionId}
            tooltip="Resume Execution (F9)"
          />
          <ToolbarButton
            icon={<Play size={14} style={{ color: '#d29922' }} />}
            label="Continue"
            onClick={handleContinue}
            disabled={!executionId}
            tooltip="Run to Next Breakpoint"
          />
        </div>
        <ToolbarButton
          icon={<RotateCcw size={14} />}
          label="Restart"
          onClick={handleRestart}
          disabled={!executionId}
          tooltip="Restart"
        />
        <ToolbarButton
          icon={<Square size={14} />}
          label="Stop"
          onClick={handleStop}
          disabled={!executionId}
          variant="danger"
          tooltip="Stop Execution"
        />
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '24px', background: '#30363d', margin: '0 8px' }} />

      {/* View shortcuts */}
      <VisualizationShortcuts />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
      <span>{label}</span>
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
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
