import React from 'react';
import { Play, Bug, Square, RotateCcw, SkipForward, SkipBack, ArrowDown, Zap, X, Plus, Minus, List, Settings, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';
import type { LanguageId, DebugConfiguration } from '../../types';

export function RunDebugPanel({ onRun, onDebug }: { onRun: () => void; onDebug: () => void }) {
  const { debugConfigurations, addDebugConfiguration, removeDebugConfiguration } = useIdeStore();
  const [newConfigName, setNewConfigName] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);

  const handleAddConfig = () => {
    if (newConfigName.trim()) {
      addDebugConfiguration({
        name: newConfigName.trim(),
        type: 'java' as LanguageId,
        request: 'launch',
        program: '',
        args: [],
        cwd: '${workspaceFolder}',
        console: 'internalConsole',
        stopOnEntry: false,
      });
      setNewConfigName('');
    }
  };

  const defaultConfigs: DebugConfiguration[] = [
    { name: 'Java: Run Main', type: 'java' as LanguageId, request: 'launch' as const, mainClass: 'Main', program: '', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Java: Debug Main', type: 'java' as LanguageId, request: 'launch' as const, mainClass: 'Main', program: '', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Python: Run File', type: 'python' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Python: Debug File', type: 'python' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Node: Run', type: 'node' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Node: Debug', type: 'node' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Go: Run', type: 'go' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
    { name: 'Go: Debug', type: 'go' as LanguageId, request: 'launch' as const, program: '${file}', args: [], cwd: '${workspaceFolder}', console: 'internalConsole', stopOnEntry: false },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div className="panel-header" style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px', background: '#161b22', borderBottom: '1px solid #21262d'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bug size={14} color="#d29922" />
          <span className="panel-title">Run and Debug</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn btn-ghost btn-icon" title="Create launch.json" style={{ padding: '4px' }}>
            <Plus size={12} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Open Configurations" style={{ padding: '4px' }}>
            <Settings size={12} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {/* Run/Debug Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={onRun}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          >
            <Play size={14} />
            <span>Run</span>
            <kbd style={{ marginLeft: '8px', fontSize: '10px', background: '#21262d', padding: '1px 4px', borderRadius: '3px' }}>F5</kbd>
          </button>
          <button
            className="btn btn-secondary"
            onClick={onDebug}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          >
            <Bug size={14} />
            <span>Debug</span>
            <kbd style={{ marginLeft: '8px', fontSize: '10px', background: '#21262d', padding: '1px 4px', borderRadius: '3px' }}>Ctrl+F5</kbd>
          </button>
        </div>

        {/* Configurations */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', color: '#8b949e' }}>
              Configurations
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="New configuration name..."
                value={newConfigName}
                onChange={e => setNewConfigName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddConfig()}
                style={{
                  flex: 1,
                  maxWidth: '200px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '4px',
                  color: '#e6edf3',
                  fontSize: '11px',
                  padding: '4px 8px',
                  outline: 'none',
                }}
              />
              <button className="btn btn-secondary btn-sm" onClick={handleAddConfig}>Add</button>
            </div>
          </div>

          {debugConfigurations.map((config, index) => (
            <div key={config.name} style={{ marginBottom: '8px', padding: '8px', background: '#161b22', borderRadius: '4px', border: '1px solid #21262d' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 500 }}>{config.name}</span>
                  <span style={{ fontSize: '10px', color: '#8b949e', background: '#21262d', padding: '1px 6px', borderRadius: '3px' }}>
                    {config.type}:{config.request}
                  </span>
                </div>
                <button className="btn btn-ghost btn-icon btn-xs" onClick={() => removeDebugConfiguration(config.name)} title="Delete">
                  <X size={12} />
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#8b949e', fontFamily: 'JetBrains Mono, monospace' }}>
                {config.mainClass && `Main: ${config.mainClass}`}
                {config.program && `Program: ${config.program}`}
              </div>
            </div>
          ))}

          {debugConfigurations.length === 0 && defaultConfigs.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', color: '#8b949e' }}>
                Quick Start
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', marginTop: '8px' }}>
                {defaultConfigs.map(config => (
                  <button
                    key={config.name}
                    className="btn btn-ghost"
                    style={{ padding: '8px 12px', textAlign: 'left', justifyContent: 'flex-start' }}
                    onClick={() => {
                      addDebugConfiguration({
                        name: config.name,
                        type: config.type as LanguageId,
                        request: config.request as 'launch' | 'attach',
                        program: config.program,
                        mainClass: config.mainClass,
                        cwd: '${workspaceFolder}',
                        console: 'internalConsole',
                        stopOnEntry: false,
                      });
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{config.name}</span>
                    <span style={{ fontSize: '10px', color: '#8b949e', marginLeft: '8px' }}>
                      {config.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Breakpoints */}
        <div style={{ borderTop: '1px solid #21262d', paddingTop: '16px' }}>
          <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', color: '#8b949e' }}>
            Breakpoints
          </span>
          <div style={{ marginTop: '8px', color: '#8b949e', fontSize: '12px' }}>
            No breakpoints set
          </div>
        </div>

        {/* Variables / Watch / Call Stack collapsed sections */}
        <div style={{ marginTop: '16px' }}>
          {['Variables', 'Watch', 'Call Stack', 'Breakpoints'].map(section => (
            <div key={section} style={{ border: '1px solid #21262d', borderRadius: '4px', marginBottom: '8px' }}>
              <button
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: '#161b22', border: 'none', borderRadius: '4px 4px 0 0',
                  color: '#e6edf3', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <ChevronRight size={12} />
                <span>{section}</span>
                <span style={{ fontSize: '9px', color: '#8b949e' }}>0</span>
              </button>
              <div style={{ padding: '8px', color: '#8b949e', fontSize: '12px' }}>
                {section === 'Watch' ? (
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                    <Plus size={12} /> Add Expression
                  </button>
                ) : (
                  'Not available'
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}