import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useIdeStore } from '../../store/ideStore';
import type { ExecutionSnapshot } from '../../services/executionEngine';
import { apiService } from '../../services/apiService';

interface TerminalRef {
  focus: () => void;
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  sendInput: (input: string) => void;
}

interface TerminalProps {
  executionId?: string | null;
  isExecuting?: boolean;
  onInput?: (input: string) => void;
}

export const Terminal = forwardRef<TerminalRef, TerminalProps>((props, ref) => {
  const { 
    consoleLines, 
    appendConsoleLine, 
    clearConsoleOutput,
    executionSnapshot,
    isExecuting,
    executionId 
  } = useIdeStore();

  const [localLines, setLocalLines] = useState<{ type: 'stdout' | 'stderr' | 'system' | 'stdin' | 'prompt'; text: string }[]>([]);
  const [inputBuffer, setInputBuffer] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [promptPrefix, setPromptPrefix] = useState('> ');

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const processRef = useRef<{ stdin: (data: string) => void; kill: () => void } | null>(null);

  // Sync with store console lines
  useEffect(() => {
    const mapped = consoleLines.map(line => ({
      type: line.type as 'stdout' | 'stderr' | 'system' | 'stdin',
      text: line.text
    }));
    setLocalLines(prev => {
      // Avoid duplicate if already in local state
      const existingTexts = new Set(prev.map(l => l.text));
      const newLines = mapped.filter(l => !existingTexts.has(l.text));
      return [...prev, ...newLines];
    });
  }, [consoleLines]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [localLines]);

  // Focus input on mount and when terminal gets focus
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    write: (data: string) => {
      appendConsoleLine('stdout', data);
    },
    writeln: (data: string) => {
      appendConsoleLine('stdout', data + '\n');
    },
    clear: () => {
      clearConsoleOutput();
      setLocalLines([]);
    },
    sendInput: (input: string) => {
      handleInputSubmit(input);
    },
  }));

  // Handle stdin requests from execution engine
  useEffect(() => {
    if (!executionSnapshot || !isExecuting) return;
    
    // Check if program is waiting for input (simplified heuristic)
    const output = executionSnapshot.consoleOutput || '';
    const lastLines = output.trim().split('\n').slice(-3).join('\n');
    const needsInput = lastLines.includes('Scanner') || 
                      lastLines.includes('System.in') ||
                      lastLines.includes('nextLine') ||
                      lastLines.includes('nextInt') ||
                      lastLines.includes('readLine');
    
    if (needsInput && !waitingForInput) {
      setWaitingForInput(true);
      setPromptPrefix('stdin> ');
    }
  }, [executionSnapshot, isExecuting, waitingForInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!waitingForInput) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleInputSubmit(inputBuffer);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (history.length > 0 && historyIndex < history.length - 1) {
          setHistoryIndex(i => Math.min(i + 1, history.length - 1));
          setInputBuffer(history[history.length - 1 - (historyIndex + 1)]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (historyIndex > 0) {
          setHistoryIndex(i => i - 1);
          setInputBuffer(history[history.length - 1 - (historyIndex - 1)]);
        } else if (historyIndex === 0) {
          setHistoryIndex(-1);
          setInputBuffer('');
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Could add tab completion here
        break;
    }
  }, [waitingForInput, inputBuffer, history, historyIndex]);

  const handleInputSubmit = useCallback(async (input: string) => {
    if (!waitingForInput) return;
    
    const trimmed = input.trim();
    if (trimmed) {
      appendConsoleLine('stdin', `${promptPrefix}${trimmed}\n`);
      setHistory(prev => [...prev, trimmed].slice(-100));
    }
    
    setInputBuffer('');
    setHistoryIndex(-1);
    setWaitingForInput(false);
    setPromptPrefix('> ');

    // Send to backend if executionId exists
    if (props.executionId && props.onInput) {
      props.onInput(trimmed + '\n');
    }
    
    // Resolve any waiting promise
    if (inputResolverRef.current) {
      inputResolverRef.current(trimmed);
      inputResolverRef.current = null;
    }
  }, [waitingForInput, promptPrefix, props.executionId, props.onInput, appendConsoleLine]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputBuffer(e.target.value);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    setInputBuffer(prev => prev + text);
  }, []);

  // Expose stdin interface for the execution engine
  const getStdinInterface = useCallback(() => ({
    readline: (): Promise<string> => {
      return new Promise((resolve) => {
        inputResolverRef.current = resolve;
        setWaitingForInput(true);
        setPromptPrefix('stdin> ');
      });
    },
    write: (data: string) => {
      appendConsoleLine('stdout', data);
    },
    writeln: (data: string) => {
      appendConsoleLine('stdout', data + '\n');
    },
  }), [appendConsoleLine]);

  return (
    <div 
      ref={terminalRef}
      className="terminal"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d1117',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#e6edf3',
        overflow: 'hidden',
        border: '1px solid #21262d',
        borderRadius: '6px',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
        fontSize: '11px',
        color: '#8b949e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: isExecuting ? '#3fb950' : '#f85149',
            boxShadow: isExecuting ? '0 0 8px #3fb95080' : 'none',
          }} />
          <span>{isExecuting ? 'Running' : 'Terminal'}</span>
          {waitingForInput && (
            <span style={{
              padding: '2px 6px',
              background: '#d2992220',
              border: '1px solid #d29922',
              borderRadius: '3px',
              color: '#d29922',
              fontSize: '10px',
            }}>Waiting for input...</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className="btn btn-ghost btn-xs"
            onClick={() => { clearConsoleOutput(); setLocalLines([]); }}
            title="Clear Terminal"
          >🗑</button>
          <button 
            className="btn btn-ghost btn-xs"
            onClick={() => { 
              if (props.executionId) {
                apiService.stopExecution(props.executionId);
              }
            }}
            title="Kill Process"
            disabled={!isExecuting}
          >⬜</button>
        </div>
      </div>

      {/* Output Area */}
      <div 
        ref={outputRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {localLines.map((line, idx) => (
          <div 
            key={idx}
            style={{
              display: 'flex',
              gap: '8px',
              padding: '1px 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <span style={{
              color: line.type === 'stderr' ? '#f85149' : 
                     line.type === 'stdin' ? '#d29922' :
                     line.type === 'system' ? '#7c3aed' :
                     line.type === 'prompt' ? '#8b949e' : '#e6edf3',
              userSelect: 'text',
            }}>
              {line.text}
            </span>
          </div>
        ))}
        {waitingForInput && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <span style={{ color: '#d29922' }}>{promptPrefix}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputBuffer}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#e6edf3',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                outline: 'none',
                caretColor: '#7c3aed',
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Input line when not waiting for stdin but executing */}
      {!waitingForInput && isExecuting && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#161b22',
          borderTop: '1px solid #21262d',
        }}>
          <span style={{ color: '#8b949e', fontSize: '12px' }}>Program running...</span>
          <input
            ref={inputRef}
            type="text"
            value={inputBuffer}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Input will be sent when program requests it..."
            style={{
              flex: 1,
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '4px',
              color: '#e6edf3',
              fontFamily: 'inherit',
              fontSize: '12px',
              padding: '4px 8px',
              outline: 'none',
            }}
            disabled
          />
        </div>
      )}

      {/* Interactive input when not executing */}
      {!isExecuting && !waitingForInput && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#161b22',
          borderTop: '1px solid #21262d',
        }}>
          <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>➜</span>
          <input
            ref={inputRef}
            type="text"
            value={inputBuffer}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type command or stdin input..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#e6edf3',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
});

Terminal.displayName = 'Terminal';

// ============================================================
// Terminal Service - Backend Process Management
// ============================================================

export class TerminalService {
  private processes: Map<string, {
    process: {
      stdin: (data: string) => void;
      kill: () => void;
    };
    stdin: (data: string) => void;
    kill: () => void;
    onOutput: (type: 'stdout' | 'stderr', data: string) => void;
    onExit: (code: number) => void;
  }> = new Map();

  async startProcess(
    executionId: string,
    command: string[],
    cwd: string,
    onOutput: (type: 'stdout' | 'stderr', data: string) => void,
    onExit: (code: number) => void
  ): Promise<{ stdin: (data: string) => void; kill: () => void }> {
    // This would integrate with Electron's child_process or the backend API
    // For now, we use the backend REST API
    
    const stdinQueue: string[] = [];
    let stdinResolver: ((value: string) => void) | null = null;

    const stdin = (data: string) => {
      stdinQueue.push(data);
      if (stdinResolver) {
        stdinResolver(data);
        stdinResolver = null;
      }
    };

    const kill = () => {
      // Send kill signal to backend
      fetch(`/api/execution/${executionId}`, { method: 'DELETE' });
    };

    // Track the process
    const procInterface = { stdin, kill };
    this.processes.set(executionId, {
      process: procInterface,
      stdin,
      kill,
      onOutput,
      onExit,
    });

    return procInterface;
  }

  async sendStdin(executionId: string, input: string): Promise<void> {
    const proc = this.processes.get(executionId);
    if (proc) {
      proc.stdin(input);
    }
  }

  async killProcess(executionId: string): Promise<void> {
    const proc = this.processes.get(executionId);
    if (proc) {
      proc.kill();
      this.processes.delete(executionId);
    }
  }

  dispose(): void {
    for (const [, proc] of this.processes) {
      proc.kill();
    }
    this.processes.clear();
  }
}

export const terminalService = new TerminalService();