import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIdeStore } from '../../store/ideStore';
import { 
  Search, Command, Keyboard, X, ChevronRight, 
  FileText, Terminal, Play, Bug, Box, Settings,
  GitBranch, Search as SearchIcon, Zap, List, Type
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category?: string;
  icon?: React.ReactNode;
  keybinding?: string;
  handler: () => void | Promise<void>;
  when?: string; // Context when clause
  score?: number; // For fuzzy matching ranking
}

export function CommandPalette() {
  const { 
    setActiveBottomTab, 
    setActiveActivity,
    clearConsoleOutput,
    clearExecutionSteps,
    setIsExecuting,
    setExecutionPaused,
    executionSteps,
    isExecuting,
    executionPaused,
  } = useIdeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build all available commands
  const allCommands = useMemo((): CommandItem[] => {
    const commands: CommandItem[] = [
      // File Operations
      { id: 'file.new', title: 'New File', category: 'File', icon: <FileText size={14} />, keybinding: 'Ctrl+N', handler: () => {} },
      { id: 'file.open', title: 'Open File...', category: 'File', icon: <FileText size={14} />, keybinding: 'Ctrl+O', handler: () => {} },
      { id: 'file.save', title: 'Save', category: 'File', icon: <FileText size={14} />, keybinding: 'Ctrl+S', handler: () => {} },
      { id: 'file.saveAll', title: 'Save All', category: 'File', keybinding: 'Ctrl+K S', handler: () => {} },
      { id: 'file.close', title: 'Close Editor', category: 'File', keybinding: 'Ctrl+W', handler: () => {} },
      { id: 'file.closeAll', title: 'Close All Editors', category: 'File', keybinding: 'Ctrl+K W', handler: () => {} },

      // Edit Operations
      { id: 'edit.undo', title: 'Undo', category: 'Edit', keybinding: 'Ctrl+Z', handler: () => {} },
      { id: 'edit.redo', title: 'Redo', category: 'Edit', keybinding: 'Ctrl+Y', handler: () => {} },
      { id: 'edit.cut', title: 'Cut', category: 'Edit', keybinding: 'Ctrl+X', handler: () => {} },
      { id: 'edit.copy', title: 'Copy', category: 'Edit', keybinding: 'Ctrl+C', handler: () => {} },
      { id: 'edit.paste', title: 'Paste', category: 'Edit', keybinding: 'Ctrl+V', handler: () => {} },
      { id: 'edit.find', title: 'Find', category: 'Edit', keybinding: 'Ctrl+F', handler: () => {} },
      { id: 'edit.replace', title: 'Replace', category: 'Edit', keybinding: 'Ctrl+H', handler: () => {} },
      { id: 'edit.findInFiles', title: 'Find in Files', category: 'Edit', keybinding: 'Ctrl+Shift+F', handler: () => {} },

      // Selection
      { id: 'selection.selectAll', title: 'Select All', category: 'Selection', keybinding: 'Ctrl+A', handler: () => {} },
      { id: 'selection.expand', title: 'Expand Selection', category: 'Selection', keybinding: 'Shift+Alt+Right', handler: () => {} },
      { id: 'selection.shrink', title: 'Shrink Selection', category: 'Selection', keybinding: 'Shift+Alt+Left', handler: () => {} },

      // View
      { id: 'view.toggleSidebar', title: 'Toggle Sidebar', category: 'View', keybinding: 'Ctrl+B', handler: () => {} },
      { id: 'view.togglePanel', title: 'Toggle Panel', category: 'View', keybinding: 'Ctrl+J', handler: () => {} },
      { id: 'view.toggleTerminal', title: 'Toggle Terminal', category: 'View', keybinding: 'Ctrl+`', handler: () => { setActiveBottomTab('terminal'); } },
      { id: 'view.toggleProblems', title: 'Toggle Problems', category: 'View', keybinding: 'Ctrl+Shift+M', handler: () => { setActiveBottomTab('problems'); } },
      { id: 'view.toggleOutput', title: 'Toggle Output', category: 'View', handler: () => { setActiveBottomTab('output'); } },
      { id: 'view.zoomIn', title: 'Zoom In', category: 'View', keybinding: 'Ctrl+=', handler: () => {} },
      { id: 'view.zoomOut', title: 'Zoom Out', category: 'View', keybinding: 'Ctrl+-', handler: () => {} },
      { id: 'view.resetZoom', title: 'Reset Zoom', category: 'View', keybinding: 'Ctrl+0', handler: () => {} },

      // Go
      { id: 'go.line', title: 'Go to Line...', category: 'Go', keybinding: 'Ctrl+G', handler: () => {} },
      { id: 'go.file', title: 'Go to File...', category: 'Go', keybinding: 'Ctrl+P', handler: () => {} },
      { id: 'go.symbol', title: 'Go to Symbol...', category: 'Go', keybinding: 'Ctrl+Shift+O', handler: () => {} },
      { id: 'go.definition', title: 'Go to Definition', category: 'Go', keybinding: 'F12', handler: () => {} },
      { id: 'go.references', title: 'Go to References', category: 'Go', keybinding: 'Shift+F12', handler: () => {} },

      // Run & Debug
      { id: 'run.run', title: 'Run', category: 'Run', icon: <Play size={14} />, keybinding: 'F5', handler: () => { setIsExecuting(true); } },
      { id: 'run.runWithoutDebug', title: 'Run Without Debugging', category: 'Run', keybinding: 'Ctrl+F5', handler: () => { setIsExecuting(true); } },
      { id: 'run.stop', title: 'Stop', category: 'Run', icon: <Box size={14} />, keybinding: 'Shift+F5', handler: () => { setIsExecuting(false); } },
      { id: 'run.restart', title: 'Restart', category: 'Run', keybinding: 'Ctrl+Shift+F5', handler: () => {} },
      { id: 'run.pause', title: 'Pause', category: 'Run', keybinding: 'F6', handler: () => { setExecutionPaused(true); } },
      { id: 'run.continue', title: 'Continue', category: 'Run', keybinding: 'F5', handler: () => { setExecutionPaused(false); } },
      { id: 'run.stepOver', title: 'Step Over', category: 'Run', keybinding: 'F10', handler: () => {} },
      { id: 'run.stepInto', title: 'Step Into', category: 'Run', keybinding: 'F11', handler: () => {} },
      { id: 'run.stepOut', title: 'Step Out', category: 'Run', keybinding: 'Shift+F11', handler: () => {} },
      { id: 'run.toggleBreakpoint', title: 'Toggle Breakpoint', category: 'Run', keybinding: 'F9', handler: () => {} },

      // Terminal
      { id: 'terminal.new', title: 'New Terminal', category: 'Terminal', icon: <Terminal size={14} />, keybinding: 'Ctrl+Shift+`', handler: () => {} },
      { id: 'terminal.kill', title: 'Kill Terminal', category: 'Terminal', handler: () => {} },
      { id: 'terminal.clear', title: 'Clear Terminal', category: 'Terminal', handler: () => { clearConsoleOutput(); } },

      // Extensions
      { id: 'extensions.install', title: 'Install Extension', category: 'Extensions', icon: <Box size={14} />, handler: () => { setActiveActivity('extensions'); } },
      { id: 'extensions.manage', title: 'Manage Extensions', category: 'Extensions', keybinding: 'Ctrl+Shift+X', handler: () => { setActiveActivity('extensions'); } },

      // Preferences
      { id: 'settings.open', title: 'Open Settings', category: 'Preferences', icon: <Settings size={14} />, keybinding: 'Ctrl+,', handler: () => { setActiveActivity('settings'); } },
      { id: 'settings.keybindings', title: 'Open Keyboard Shortcuts', category: 'Preferences', keybinding: 'Ctrl+K Ctrl+S', handler: () => {} },
      { id: 'settings.snippets', title: 'Configure User Snippets', category: 'Preferences', handler: () => {} },

      // Developer
      { id: 'dev.reload', title: 'Reload Window', category: 'Developer', handler: () => { window.location.reload(); } },
      { id: 'dev.toggleTools', title: 'Toggle Developer Tools', category: 'Developer', handler: () => {} },

      // CodeSmart Specific
      { id: 'codesmart.visualize', title: 'CodeSmart: Start Visualization', category: 'CodeSmart', icon: <Zap size={14} />, handler: () => { setIsExecuting(true); } },
      { id: 'codesmart.clearVisualization', title: 'CodeSmart: Clear Visualization', category: 'CodeSmart', handler: () => { clearExecutionSteps(); } },
      { id: 'codesmart.organizeImports', title: 'CodeSmart: Organize Java Imports', category: 'CodeSmart', handler: () => {} },
      { id: 'codesmart.formatDocument', title: 'CodeSmart: Format Document', category: 'CodeSmart', keybinding: 'Shift+Alt+F', handler: () => {} },
      { id: 'codesmart.rename', title: 'CodeSmart: Rename Symbol', category: 'CodeSmart', keybinding: 'F2', handler: () => {} },
      { id: 'codesmart.goToLine', title: 'CodeSmart: Go to Line', category: 'CodeSmart', keybinding: 'Ctrl+G', handler: () => {} },

      // Help
      { id: 'help.welcome', title: 'Welcome', category: 'Help', handler: () => {} },
      { id: 'help.shortcuts', title: 'Keyboard Shortcuts Reference', category: 'Help', keybinding: 'Ctrl+K Ctrl+R', handler: () => {} },
      { id: 'help.documentation', title: 'Documentation', category: 'Help', handler: () => {} },
    ];

    return commands;
  }, [isExecuting, executionPaused, setIsExecuting, setExecutionPaused, clearExecutionSteps, clearConsoleOutput, setActiveBottomTab, setActiveActivity]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent commands first, then all
      const recent = recentCommands.map(id => allCommands.find(c => c.id === id)).filter(Boolean) as CommandItem[];
      const others = allCommands.filter(c => !recentCommands.includes(c.id));
      return [...recent, ...others];
    }

    const lowerQuery = query.toLowerCase();
    return allCommands
      .map(cmd => {
        const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
        const categoryMatch = cmd.category?.toLowerCase().includes(lowerQuery);
        const keybindingMatch = cmd.keybinding?.toLowerCase().includes(lowerQuery);
        
        if (!titleMatch && !categoryMatch && !keybindingMatch) {
          return null;
        }

        // Simple scoring
        let score = 0;
        if (cmd.title.toLowerCase().startsWith(lowerQuery)) score += 100;
        if (titleMatch) score += 50;
        if (categoryMatch) score += 20;
        if (keybindingMatch) score += 10;
        if (recentCommands.includes(cmd.id)) score += 200;

        return { ...cmd, score };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.score || 0) - (a?.score || 0))
      .slice(0, 20) as CommandItem[];
  }, [query, allCommands, recentCommands]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closePalette();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Tab':
          e.preventDefault();
          // Could add command completion
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const executeCommand = useCallback((cmd: CommandItem) => {
    // Add to recent
    setRecentCommands(prev => {
      const filtered = prev.filter(id => id !== cmd.id);
      return [cmd.id, ...filtered].slice(0, 10);
    });

    // Execute handler
    try {
      cmd.handler();
    } catch (error) {
      console.error('Command execution failed:', error);
    }

    closePalette();
  }, [closePalette]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={closePalette} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '12vh',
    }}>
      <div className="command-palette" onClick={e => e.stopPropagation()} style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 24px',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
        animation: 'slideDown 0.15s ease-out',
      }}>
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          borderBottom: '1px solid #30363d',
          background: '#0d1117',
        }}>
          <Search size={18} color="#8b949e" style={{ marginRight: '12px', flexShrink: 0 }} />
          <Keyboard size={14} color="#6e7681" style={{ marginRight: '8px', opacity: 0.7 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#e6edf3',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              width: '100%',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'transparent',
              border: 'none',
              color: '#8b949e',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} style={{
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '8px 0',
        }}>
          {filteredCommands.length === 0 ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              color: '#8b949e',
              fontSize: '13px',
            }}>
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                data-index={index}
                onClick={() => executeCommand(cmd)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 16px',
                  background: index === selectedIndex ? '#264f78' : 'transparent',
                  border: 'none',
                  color: '#e6edf3',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.05s',
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {cmd.icon && (
                  <span style={{
                    display: 'flex',
                    width: '20px',
                    color: '#7c3aed',
                  }}>
                    {cmd.icon}
                  </span>
                )}
                {!cmd.icon && (
                  <span style={{ width: '20px' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: 500, 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                  }}>
                    {highlightMatch(cmd.title, query)}
                  </div>
                  {cmd.category && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#8b949e',
                      marginTop: '2px',
                    }}>
                      {cmd.category}
                    </div>
                  )}
                </div>
                {cmd.keybinding && (
                  <span style={{
                    background: '#21262d',
                    border: '1px solid #30363d',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    color: '#8b949e',
                    fontFamily: 'JetBrains Mono, monospace',
                    whiteSpace: 'nowrap',
                  }}>
                    {cmd.keybinding}
                  </span>
                )}
</button>
              )))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #30363d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#8b949e',
        }}>
          <span>{filteredCommands.length} commands</span>
          <span>↑↓ navigate • Enter run • Esc close</span>
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <span key={i} style={{ color: '#7c3aed', fontWeight: 600 }}>{part}</span>
          : part
      )}
    </>
  );
}

// Keyboard shortcut to open palette
export function useCommandPalette() {
  const { setActiveBottomTab } = useIdeStore();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+P or F1
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        // Dispatch custom event to open palette
        window.dispatchEvent(new CustomEvent('codesmart:open-command-palette'));
      }
      if (e.key === 'F1') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('codesmart:open-command-palette'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}