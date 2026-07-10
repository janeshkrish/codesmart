import React, { useRef, useEffect, useState } from 'react';
import { Search, Copy, Download, Trash2 } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';
import { apiService } from '../../services/apiService';

export function ConsolePanel() {
  const { consoleLines, clearConsoleOutput, executionId, appendConsoleLine } = useIdeStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [stdinInput, setStdinInput] = useState('');

  // Auto-scroll
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLines, autoScroll]);

  const handleCopy = () => {
    const text = consoleLines.map(l => l.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    const text = consoleLines.map(l => l.text).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'console_output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStdinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stdinInput || !executionId) return;
    
    appendConsoleLine('stdin', stdinInput + '\n');
    await apiService.sendStdin(executionId, stdinInput);
    setStdinInput('');
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', borderLeft: '1px solid #21262d', borderTop: '1px solid #21262d',
    }}>
      {/* Header */}
      <div className="panel-header" style={{ justifyContent: 'space-between', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📟</span>
          <span className="panel-title">Console</span>
        </div>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: '#161b22', 
            border: '1px solid #30363d', borderRadius: '4px', padding: '2px 6px', gap: '4px'
          }}>
            <Search size={10} color="#8b949e" />
            <input 
              type="text" 
              placeholder="Filter..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e6edf3',
                fontSize: '10px', width: '80px', outline: 'none'
              }}
            />
          </div>
          
          <div style={{ width: '1px', height: '14px', background: '#30363d', margin: '0 4px' }} />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '10px', color: '#8b949e' }}>
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={e => setAutoScroll(e.target.checked)}
              style={{ accentColor: '#7c3aed' }}
            />
            Auto-scroll
          </label>

          <div style={{ width: '1px', height: '14px', background: '#30363d', margin: '0 4px' }} />

          <button className="btn btn-ghost btn-icon" onClick={handleCopy} title="Copy Output">
            <Copy size={12} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={handleExport} title="Export to File">
            <Download size={12} />
          </button>
          <button className="btn btn-ghost btn-icon" onClick={clearConsoleOutput} title="Clear Console">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 12px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', lineHeight: '1.6',
      }}>
        {consoleLines.length === 0 ? (
          <div style={{ color: '#444c56', fontStyle: 'italic' }}>
            No output yet. Run the program to see console output.
          </div>
        ) : (
          consoleLines.map((line, idx) => {
            if (search && !line.text.toLowerCase().includes(search.toLowerCase())) return null;
            
            return (
              <span key={idx} className={`console-line-${line.type}`} style={{ whiteSpace: 'pre-wrap' }}>
                {search ? highlightText(line.text, search) : line.text}
              </span>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area (Stdin) */}
      <form onSubmit={handleStdinSubmit} style={{
        display: 'flex', padding: '6px', background: '#161b22', borderTop: '1px solid #30363d'
      }}>
        <span style={{ color: '#06b6d4', padding: '4px 8px', fontWeight: 600 }}>❯</span>
        <input 
          type="text" 
          value={stdinInput}
          onChange={e => setStdinInput(e.target.value)}
          placeholder={executionId ? "Enter standard input here..." : "Program not running"}
          disabled={!executionId}
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#e6edf3',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', outline: 'none'
          }}
        />
      </form>
    </div>
  );
}

// Helper to highlight search matches
function highlightText(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} className="console-search-highlight">{part}</span> 
          : part
      )}
    </>
  );
}
