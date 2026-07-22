import React from 'react';
import { X, Copy, Download, Trash2, Filter, ChevronDown, MoreVertical } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

export function OutputPanel() {
  const { 
    outputChannels, 
    activeOutputChannel, 
    setActiveOutputChannel, 
    appendOutput, 
    clearOutput, 
    closeOutputChannel 
  } = useIdeStore();

  const [filter, setFilter] = React.useState('');

  const channelNames = Array.from(outputChannels.keys());
  const activeChannel = activeOutputChannel ? outputChannels.get(activeOutputChannel) : null;
  const lines = activeChannel?.lines || [];

  const filteredLines = React.useMemo(() => 
    lines.filter(line => !filter || line.toLowerCase().includes(filter.toLowerCase())),
    [lines, filter]
  );

  const handleClose = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    closeOutputChannel(name);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px', height: '32px', background: '#161b22',
        borderBottom: '1px solid #21262d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>📋</span>
          <span className="panel-title">Output</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Channel dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowChannels(!showChannels)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 10px', background: '#0d1117',
                border: '1px solid #30363d', borderRadius: '4px',
                color: '#e6edf3', fontSize: '11px', cursor: 'pointer',
              }}
            >
              {activeOutputChannel || 'Select Channel'}
              <ChevronDown size={12} />
            </button>
            {showChannels && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                background: '#161b22', border: '1px solid #30363d',
                borderRadius: '6px', minWidth: '200px', zIndex: 100,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              }}>
                {channelNames.map(name => (
                  <button
                    key={name}
                    onClick={() => { setActiveOutputChannel(name); setShowChannels(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', background: 'transparent', border: 'none',
                      color: activeOutputChannel === name ? '#7c3aed' : '#e6edf3',
                      fontSize: '12px', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {activeOutputChannel === name && <span style={{ color: '#7c3aed' }}>✓</span>}
                    {name}
                    <button
                      onClick={e => handleClose(e, name)}
                      style={{
                        marginLeft: 'auto', padding: '2px', background: 'transparent',
                        border: 'none', color: '#8b949e', cursor: 'pointer',
                        opacity: 0.6, borderRadius: '3px',
                      }}
                      title="Close"
                    >
                      <X size={12} />
                    </button>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #30363d', padding: '8px' }}>
                  <button
                    onClick={() => { /* create new channel */ }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '8px', background: 'transparent', border: 'none',
                      color: '#7c3aed', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>+</span>
                    New Output Channel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '16px', background: '#30363d', margin: '0 4px' }} />

          <div style={{
            display: 'flex', alignItems: 'center', background: '#0d1117', 
            border: '1px solid #30363d', borderRadius: '4px', padding: '2px 6px', gap: '4px'
          }}>
            <Filter size={10} color="#8b949e" />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e6edf3',
                fontSize: '10px', width: '120px', outline: 'none'
              }}
            />
          </div>

          <div style={{ width: '1px', height: '16px', background: '#30363d', margin: '0 4px' }} />

          <button className="btn btn-ghost btn-icon" title="Copy Output">
            <Copy size={12} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Save to File">
            <Download size={12} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => activeOutputChannel && clearOutput(activeOutputChannel)} title="Clear Output">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: '1.6',
      }}>
        {filteredLines.length === 0 ? (
          <div style={{ 
            color: '#444c56', fontStyle: 'italic', textAlign: 'center', 
            padding: '24px', height: '200px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            <div>{activeOutputChannel ? 'No output yet' : 'Select an output channel'}</div>
            {!activeOutputChannel && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { /* create channel */ }}
              >
                Create Output Channel
              </button>
            )}
          </div>
        ) : (
          filteredLines.map((line, idx) => (
            <div 
              key={idx} 
              style={{ 
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                padding: '2px 0', fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Additional state for the component
const [showChannels, setShowChannels] = React.useState(false);