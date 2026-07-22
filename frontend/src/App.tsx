import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIdeStore } from './store/ideStore';
import { JavaEditor } from './components/editor/JavaEditor';
import { ActivityBar } from './components/ui/ActivityBar';
import { CommandPalette, useCommandPalette } from './components/ui/CommandPalette';
import { StatusBar } from './components/StatusBar';
import { Terminal } from './components/panels/Terminal';
import { ConsolePanel } from './components/panels/ConsolePanel';
import { ProblemsPanel } from './components/panels/ProblemsPanel';
import { OutputPanel } from './components/panels/OutputPanel';
import { DebugConsolePanel } from './components/panels/DebugConsolePanel';
import { VisualizationPanel } from './components/visualization/VisualizationPanel';
import { PackageExplorer } from './components/PackageExplorer';
import { SearchPanel } from './components/panels/SearchPanel';
import { Toolbar } from './components/Toolbar';
import { useExecution } from './hooks/useExecution';
import { apiService } from './services/apiService';
import { createDefaultServices } from './services/coreServices';

import './App.css';

function App() {
  const {
    activeActivity,
    setActiveActivity,
    panelVisibility,
    setPanelVisibility,
    sidebarWidth,
    setSidebarWidth,
    panelHeight,
    setPanelHeight,
    activeBottomTab,
    setActiveBottomTab,
    editorTabs,
    activeTabId,
    setActiveTab,
    openTab,
    closeTab,
    terminals,
    activeTerminalId,
    setActiveTerminal,
    createTerminal,
    closeTerminal,
    isExecuting,
    executionPaused,
    services,
    setServices,
    wsConnected,
    setWsConnected,
    sourceCode,
    activeFile,
    setActiveFile,
    files,
  } = useIdeStore();

  const { run, step, stepInto, stepOver, stepOut, stop, restart, pause, continueExecution } = useExecution();
  const commandPaletteOpened = useCommandPalette();
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  // Initialize services
  useEffect(() => {
    if (!services) {
      const newServices = createDefaultServices();
      setServices(newServices);
    }
  }, [services, setServices]);

  // Connect WebSocket
  useEffect(() => {
    apiService.connect();
    const unsubscribeWs = apiService.subscribeToExecution('local', (step) => {
      // Handle execution updates
    });
    return () => {
      unsubscribeWs();
      apiService.disconnect();
    };
  }, []);

  // Initialize layout
  useEffect(() => {
    setLayoutReady(true);
  }, []);

  // Handle resize for sidebar
  const handleSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (startX - moveEvent.clientX);
      setSidebarWidth(Math.max(200, Math.min(500, newWidth)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [sidebarWidth, setSidebarWidth]);

  // Handle resize for panel
  const handlePanelResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = startHeight + (startY - moveEvent.clientY);
      setPanelHeight(Math.max(150, Math.min(window.innerHeight * 0.6, newHeight)));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight, setPanelHeight]);

  // Get active panel content
  const getBottomPanelContent = useCallback(() => {
    switch (activeBottomTab) {
      case 'terminal':
        return <Terminal executionId={useIdeStore.getState().executionId} isExecuting={isExecuting} onInput={(input) => apiService.sendStdin(useIdeStore.getState().executionId || '', input)} />;
      case 'problems':
        return <ProblemsPanel />;
      case 'output':
        return <OutputPanel />;
      case 'debugConsole':
        return <DebugConsolePanel />;
      case 'console':
      default:
        return <ConsolePanel />;
    }
  }, [activeBottomTab, isExecuting]);

  // Get sidebar content
  const getSidebarContent = useCallback(() => {
    switch (activeActivity) {
      case 'explorer':
        return <PackageExplorer />;
      case 'search':
        return <SearchPanel />;
      case 'source-control':
        return <div style={{ padding: '16px', color: '#8b949e' }}>Source Control - Coming soon</div>;
      case 'run-debug':
        return <div style={{ padding: '16px', color: '#8b949e' }}>Run & Debug - Coming soon</div>;
      case 'extensions':
        return <div style={{ padding: '16px', color: '#8b949e' }}>Extensions - Coming soon</div>;
      case 'settings':
        return <div style={{ padding: '16px', color: '#8b949e' }}>Settings - Coming soon</div>;
      default:
        return <PackageExplorer />;
    }
  }, [activeActivity]);

  if (!layoutReady) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#8b949e',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <div>Loading CodeSmart...</div>
      </div>
    );
  }

  return (
    <div className="codesmart-app" style={{
      width: '100vw',
      height: '100vh',
      background: '#0d1117',
      color: '#e6edf3',
      fontFamily: 'JetBrains Mono, Fira Code, monospace',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Command Palette */}
      <CommandPalette />

      {/* Toolbar */}
      <Toolbar />

      {/* Main Layout */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Activity Bar */}
        <ActivityBar 
          activeActivity={activeActivity}
          onActivityChange={setActiveActivity}
        />

        {/* Sidebar */}
        <div style={{
          width: sidebarCollapsed ? 48 : sidebarWidth,
          minWidth: sidebarCollapsed ? 48 : 200,
          maxWidth: 500,
          height: '100%',
          background: '#161b22',
          borderRight: '1px solid #21262d',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
          {!sidebarCollapsed && (
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '8px 0',
            }}>
              {getSidebarContent()}
            </div>
          )}
          
          {/* Sidebar Resize Handle */}
          {!sidebarCollapsed && (
            <div
              className="resize-handle"
              onMouseDown={handleSidebarResize}
              style={{
                width: '4px',
                height: '100%',
                cursor: 'col-resize',
                background: 'transparent',
                position: 'relative',
                zIndex: 10,
              }}
            >
              <div style={{
                position: 'absolute',
                right: '1px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#30363d',
                borderRadius: '1px',
              }} />
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#0d1117',
          position: 'relative',
        }}>
          {/* Editor Tabs */}
          <div className="editor-tabs-bar" style={{
            height: '36px',
            background: '#161b22',
            borderBottom: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            padding: '0 8px',
            overflowX: 'auto',
            flexShrink: 0,
          }}>
            {editorTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 16px',
                  height: '100%',
                  background: activeTabId === tab.id ? '#0d1117' : 'transparent',
                  border: 'none',
                  borderBottom: activeTabId === tab.id ? '2px solid #7c3aed' : 'none',
                  color: activeTabId === tab.id ? '#e6edf3' : '#8b949e',
                  fontSize: '13px',
                  fontWeight: activeTabId === tab.id ? 500 : 400,
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  marginBottom: '-1px',
                  transition: 'all 0.1s',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Show context menu
                }}
              >
                <span style={{ color: '#06b6d4', fontSize: '11px', marginRight: '4px' }}>●</span>
                {tab.file.name}
                {tab.isDirty && <span style={{ color: '#d29922', marginLeft: '4px' }}>●</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                  style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  ×
                </button>
              </button>
            ))}
            <button
              onClick={() => { /* new file */ }}
              className="tab-new-button"
              style={{
                marginLeft: '8px',
                padding: '0 12px',
                height: '24px',
                background: 'transparent',
                border: '1px dashed #30363d',
                borderRadius: '4px',
                color: '#8b949e',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="New File (Ctrl+N)"
            >
              +
            </button>
          </div>

          {/* Active Editor */}
          <div style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <JavaEditor />
          </div>
        </div>

        {/* Panel Resize Handle */}
        {!panelCollapsed && (
          <div
            className="panel-resize-handle"
            onMouseDown={handlePanelResize}
            style={{
              height: '4px',
              width: '100%',
              cursor: 'row-resize',
              background: 'transparent',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '1px',
              left: 0,
              right: 0,
              height: '2px',
              background: '#30363d',
              borderRadius: '1px',
            }} />
          </div>
        )}

        {/* Bottom Panel */}
        <div style={{
          height: panelCollapsed ? 0 : panelHeight,
          minHeight: panelCollapsed ? 0 : 150,
          maxHeight: window.innerHeight * 0.6,
          background: '#0d1117',
          borderTop: panelCollapsed ? 'none' : '1px solid #21262d',
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 0.2s ease',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {!panelCollapsed && (
            <>
              {/* Panel Tabs */}
              <div className="panel-tabs" style={{
                display: 'flex',
                background: '#161b22',
                borderBottom: '1px solid #21262d',
                padding: '0 8px',
                height: '32px',
                alignItems: 'center',
                overflowX: 'auto',
                flexShrink: 0,
              }}>
                {[
                  { id: 'terminal', label: 'Terminal' },
                  { id: 'problems', label: 'Problems' },
                  { id: 'output', label: 'Output' },
                  { id: 'debugConsole', label: 'Debug Console' },
                  { id: 'console', label: 'Console' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveBottomTab(tab.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0 12px',
                      height: '28px',
                      background: activeBottomTab === tab.id ? '#0d1117' : 'transparent',
                      border: 'none',
                      borderBottom: activeBottomTab === tab.id ? '2px solid #7c3aed' : 'none',
                      color: activeBottomTab === tab.id ? '#e6edf3' : '#8b949e',
                      fontSize: '12px',
                      fontWeight: activeBottomTab === tab.id ? 500 : 400,
                      cursor: 'pointer',
                      borderRadius: '4px 4px 0 0',
                      marginBottom: '-1px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.1s',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setPanelCollapsed(true)}
                  className="panel-close"
                  style={{
                    padding: '0 8px',
                    height: '24px',
                    background: 'transparent',
                    border: 'none',
                    color: '#8b949e',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Close Panel"
                >
                  ▼
                </button>
              </div>

              {/* Panel Content */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                position: 'relative',
              }}>
                {getBottomPanelContent()}
              </div>
            </>
          )}
        </div>

        {/* Panel Toggle Button (when collapsed) */}
        {panelCollapsed && (
          <button
            onClick={() => setPanelCollapsed(false)}
            style={{
              position: 'absolute',
              bottom: 0,
              left: sidebarCollapsed ? 48 : sidebarWidth,
              right: 0,
              height: '28px',
              background: '#161b22',
              borderTop: '1px solid #21262d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#8b949e',
              fontSize: '12px',
              cursor: 'pointer',
              zIndex: 20,
            }}
          >
            ▲
            <span>Panel</span>
          </button>
        )}

        {/* Sidebar Toggle Button (when collapsed) */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 48,
              right: 0,
              bottom: panelCollapsed ? 28 : panelHeight,
              background: '#161b22',
              borderRight: '1px solid #21262d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 20,
            }}
          >
            ►
          </button>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;