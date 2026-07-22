import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bug, Terminal, Play, Square, ArrowRight, ArrowUp, RotateCcw, Search, X, Copy, Trash2, ChevronDown, Zap, ArrowDown } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

export function DebugConsolePanel() {
  const { 
    debugVariables, 
    debugWatchExpressions, 
    debugCallStack,
    addWatchExpression,
    removeWatchExpression,
    updateWatchExpression,
    activeDebugSession,
  } = useIdeStore();

  const [filter, setFilter] = useState('');
  const [showVariables, setShowVariables] = useState(true);
  const [showWatch, setShowWatch] = useState(true);
  const [showCallStack, setShowCallStack] = useState(true);
  const [expandedRefs, setExpandedRefs] = useState<Set<string>>(new Set());
  const [editingWatchIndex, setEditingWatchIndex] = useState<number | null>(null);
  const [watchInput, setWatchInput] = useState('');

  const toggleExpand = (key: string) => {
    setExpandedRefs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isExpanded = (key: string) => expandedRefs.has(key);

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (watchInput.trim()) {
      addWatchExpression(watchInput.trim());
      setWatchInput('');
    }
  };

  const handleEditWatch = (index: number, newValue: string) => {
    if (newValue.trim()) {
      updateWatchExpression(index, newValue.trim());
    }
    setEditingWatchIndex(null);
  };

  const startEditWatch = (index: number, current: string) => {
    setEditingWatchIndex(index);
    setWatchInput(current);
  };

  const variables = useMemo(() => 
    debugVariables.filter(v => 
      !filter || v.name.toLowerCase().includes(filter.toLowerCase()) ||
      v.value.toLowerCase().includes(filter.toLowerCase()) ||
      v.type.toLowerCase().includes(filter.toLowerCase())
    ),
  [debugVariables, filter]);

  const watches = useMemo(() => 
    debugWatchExpressions.filter(w => 
      !filter || w.toLowerCase().includes(filter.toLowerCase())
    ),
  [debugWatchExpressions, filter]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', borderLeft: '1px solid #21262d', borderTop: '1px solid #21262d',
    }}>
      {/* Header */}
      <div className="panel-header" style={{ 
        justifyContent: 'space-between', 
        padding: '0 8px',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bug size={14} color="#d29922" />
          <span className="panel-title">Debug Console</span>
          {activeDebugSession && (
            <span style={{
              padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
              fontWeight: 600, background: '#3fb95020', color: '#3fb950',
              border: '1px solid #3fb95040',
            }}>
              {activeDebugSession}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', background: '#0d1117', 
            border: '1px solid #30363d', borderRadius: '4px', padding: '2px 8px', gap: '4px'
          }}>
            <Search size={12} color="#8b949e" />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e6edf3',
                fontSize: '11px', width: '140px', outline: 'none',
              }}
            />
          </div>
          
          <div style={{ width: '1px', height: '16px', background: '#30363d', margin: '0 4px' }} />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: '#8b949e' }}>
            <input 
              type="checkbox" 
              checked={showVariables} 
              onChange={e => setShowVariables(e.target.checked)}
              style={{ accentColor: '#7c3aed' }}
            />
            Variables
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: '#8b949e' }}>
            <input 
              type="checkbox" 
              checked={showWatch} 
              onChange={e => setShowWatch(e.target.checked)}
              style={{ accentColor: '#7c3aed' }}
            />
            Watch
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: '#8b949e' }}>
            <input 
              type="checkbox" 
              checked={showCallStack} 
              onChange={e => setShowCallStack(e.target.checked)}
              style={{ accentColor: '#7c3aed' }}
            />
            Call Stack
          </label>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Variables */}
        {showVariables && (
          <DebugSection 
            title="Variables" 
            icon={<Terminal size={12} />}
            expanded={isExpanded('variables')}
            onToggle={() => toggleExpand('variables')}
            count={variables.length}
          >
            {variables.length === 0 ? (
              <div style={{ color: '#6e7681', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                No variables in scope
              </div>
            ) : (
              variables.map((v, idx) => (
                <DebugVariableRow 
                  key={`${v.name}-${idx}`}
                  name={v.name}
                  value={v.value}
                  type={v.type}
                  variablesReference={v.variablesReference}
                  onExpand={toggleExpand}
                  isExpanded={isExpanded(v.name)}
                />
              ))
            )}
          </DebugSection>
        )}

        {/* Watch Expressions */}
        {showWatch && (
          <DebugSection 
            title="Watch" 
            icon={<Zap size={12} />}
            expanded={isExpanded('watch')}
            onToggle={() => toggleExpand('watch')}
            count={watches.length}
            action={
              <form onSubmit={handleAddWatch} style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                <input
                  type="text"
                  value={watchInput}
                  onChange={e => setWatchInput(e.target.value)}
                  placeholder={editingWatchIndex !== null ? 'Edit expression...' : 'Add expression...'}
                  style={{
                    flex: 1, background: '#0d1117', border: '1px solid #30363d',
                    borderRadius: '4px', color: '#e6edf3', fontSize: '11px',
                    padding: '4px 8px', outline: 'none', width: '180px',
                  }}
                  onBlur={() => editingWatchIndex !== null && handleAddWatch({ preventDefault: () => {} } as React.FormEvent<HTMLFormElement>)}
                  onKeyDown={e => e.key === 'Escape' && setEditingWatchIndex(null)}
                  autoFocus={editingWatchIndex !== null}
                />
              </form>
            }
          >
            {watches.length === 0 ? (
              <div style={{ color: '#6e7681', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                No watch expressions. Add one above.
              </div>
            ) : (
              watches.map((watch, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '4px 8px', margin: '2px 0',
                    borderRadius: '4px',
                    background: editingWatchIndex === idx ? '#7c3aed20' : 'transparent',
                  }}
                >
                  {editingWatchIndex === idx ? (
                    <form onSubmit={(e) => { e.preventDefault(); handleEditWatch(idx, watchInput); }} style={{ flex: 1, display: 'flex', gap: '4px' }}>
                      <input
                        ref={el => el?.focus()}
                        type="text"
                        value={watchInput}
                        onChange={e => setWatchInput(e.target.value)}
                        style={{
                          flex: 1, background: '#0d1117', border: '1px solid #7c3aed',
                          borderRadius: '3px', color: '#e6edf3', fontSize: '11px',
                          padding: '2px 6px', outline: 'none', fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </form>
                  ) : (
                    <>
                      <span style={{ 
                        flex: 1, fontFamily: 'JetBrains Mono, monospace', 
                        fontSize: '12px', color: '#e6edf3',
                        wordBreak: 'break-all',
                      }}>
                        {watch}
                      </span>
                      <button
                        onClick={() => startEditWatch(idx, watch)}
                        className="btn btn-ghost btn-icon btn-xs"
                        style={{ opacity: 0.6 }}
                        title="Edit"
                      >
                        <span style={{ fontSize: '10px' }}>✎</span>
                      </button>
                      <button
                        onClick={() => removeWatchExpression(watch)}
                        className="btn btn-ghost btn-icon btn-xs"
                        style={{ opacity: 0.6 }}
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </DebugSection>
        )}

        {/* Call Stack */}
        {showCallStack && (
          <DebugSection 
            title="Call Stack" 
            icon={<Zap size={12} />}
            expanded={isExpanded('callstack')}
            onToggle={() => toggleExpand('callstack')}
            count={debugCallStack.length}
          >
            {debugCallStack.length === 0 ? (
              <div style={{ color: '#6e7681', fontStyle: 'italic', padding: '8px', textAlign: 'center' }}>
                Not debugging
              </div>
            ) : (
              debugCallStack.map((frame, idx) => (
                <div 
                  key={`${frame.id}-${idx}`}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '6px 8px', margin: '2px 0',
                    borderRadius: '4px',
                    background: idx === 0 ? '#7c3aed15' : 'transparent',
                    borderLeft: idx === 0 ? '2px solid #7c3aed' : 'none',
                  }}
                >
                  <span style={{ 
                    color: idx === 0 ? '#7c3aed' : '#8b949e',
                    fontSize: '12px', fontWeight: idx === 0 ? 600 : 400,
                  }}>
                    {frame.name || 'anonymous'}
                  </span>
                  <span style={{ 
                    color: '#6e7681', fontSize: '10px', 
                    fontFamily: 'JetBrains Mono, monospace',
                    marginLeft: 'auto',
                  }}>
                    {frame.file}:{frame.line}
                  </span>
                </div>
              ))
            )}
          </DebugSection>
        )}
      </div>
    </div>
  );
}

// Debug Section Component
function DebugSection({ 
  title, icon, children, expanded, onToggle, count, action 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  expanded: boolean; 
  onToggle: () => void; 
  count?: number; 
  action?: React.ReactNode;
}) {
  return (
    <div style={{ border: '1px solid #21262d', borderRadius: '6px', background: '#161b22' }}>
      <button 
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 10px', background: 'transparent', border: 'none',
          borderRadius: '6px 6px 0 0', cursor: 'pointer',
          color: expanded ? '#e6edf3' : '#8b949e',
          fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', textAlign: 'left',
        }}
      >
        <span style={{ 
          display: 'inline-block', transition: 'transform 0.15s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        }}>
          <ChevronDown size={12} />
        </span>
        {icon}
        <span style={{ marginLeft: '4px' }}>{title}</span>
        {count !== undefined && (
          <span style={{ 
            marginLeft: 'auto', padding: '1px 6px', borderRadius: '8px', 
            fontSize: '9px', fontWeight: 600,
            background: '#30363d', color: '#8b949e',
          }}>
            {count}
          </span>
        )}
        {action && <span style={{ marginLeft: 'auto' }}>{action}</span>}
      </button>
      {expanded && (
        <div style={{ padding: '4px 8px', borderTop: '1px solid #21262d' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Variable Row Component
function DebugVariableRow({ 
  name, value, type, variablesReference, onExpand, isExpanded 
}: { 
  name: string; value: string; type: string; 
  variablesReference?: number; onExpand: (key: string) => void; 
  isExpanded: boolean; 
}) {
  const hasChildren = variablesReference && variablesReference > 0;
  const key = `var-${name}`;

  return (
    <div style={{ 
      display: 'flex', gap: '8px', padding: '4px 8px', 
      margin: '2px 0', borderRadius: '4px',
      background: 'transparent',
    }}>
      {hasChildren && (
        <button 
          onClick={() => onExpand(key)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '18px', height: '18px', border: 'none', background: 'transparent',
            color: '#8b949e', cursor: 'pointer', borderRadius: '3px',
          }}
        >
          <ChevronDown size={10} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
        </button>
      )}
      
      <span style={{ 
        fontWeight: 500, color: '#e6edf3', fontSize: '12px',
        minWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      <span style={{ color: '#6e7681', fontSize: '10px', marginTop: '1px' }}>
        = {value}
      </span>
      <span style={{ 
        color: '#7c3aed', fontSize: '10px', marginLeft: '8px',
        fontStyle: 'italic',
      }}>
        {type}
      </span>
    </div>
  );
}