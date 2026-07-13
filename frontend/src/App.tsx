import { useEffect, Component, type ReactNode } from 'react';
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Toolbar } from './components/Toolbar';
import { PackageExplorer } from './components/PackageExplorer';
import { JavaEditor } from './components/editor/JavaEditor';
import { VisualizationPanel } from './components/visualization/VisualizationPanel';
import { ConsolePanel } from './components/panels/ConsolePanel';
import { CallStackPanel } from './components/panels/CallStackPanel';
import { BottomPanel } from './components/panels/BottomPanel';
import { TooltipOverlay } from './components/ui/TooltipOverlay';
import { ExplanationOverlay } from './components/ui/ExplanationOverlay';
import { StatusBar } from './components/StatusBar';
import { useAnalysis } from './hooks/useAnalysis';
import { apiService } from './services/apiService';
import { useIdeStore } from './store/ideStore';

// ============================================================
// Error Boundary — catches render errors so you see details
// instead of a blank screen.
// ============================================================
interface ErrorBoundaryState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#0d1117',
          color: '#f85149', fontFamily: 'monospace', padding: '2rem', gap: '1rem',
        }}>
          <h2 style={{ color: '#e6edf3', marginBottom: '0.5rem' }}>⚠ CodeSmart encountered an error</h2>
          <pre style={{
            background: '#161b22', border: '1px solid #30363d', borderRadius: '8px',
            padding: '1rem', maxWidth: '900px', overflow: 'auto', fontSize: '12px',
            whiteSpace: 'pre-wrap', color: '#f85149',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              background: '#7c3aed', color: 'white', border: 'none',
              borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontSize: '13px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================
// Main IDE layout
// ============================================================
function IdeLayout() {
  const { sessionId, setAnalysisResult, setIsAnalyzing } = useIdeStore();

  useEffect(() => {
    // connect() is safe to call multiple times — idempotent
    apiService.connect();

    // subscribeToAnalysis is now safe to call before the connection is live.
    // It queues the subscription and applies it automatically in onConnect.
    const unsubscribe = apiService.subscribeToAnalysis(sessionId, (result) => {
      setAnalysisResult(result);
      setIsAnalyzing(false);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, setAnalysisResult, setIsAnalyzing]);

  useAnalysis();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      minWidth: 0,
      background: '#0d1117',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <Toolbar />

      {/* Main Content — fills all remaining height */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Outer vertical split */}
        <PanelGroup orientation="vertical" style={{ flex: 1, minHeight: 0, minWidth: 0 }}>

          {/* ── TOP ROW: Explorer + Editor + Visualization ── */}
          <Panel defaultSize="72%" minSize="40%">
            <PanelGroup orientation="horizontal" style={{ height: '100%', minWidth: 0 }}>

              <Panel defaultSize="16%" minSize="12%" maxSize="28%" style={{ minWidth: 0 }}>
                <PackageExplorer />
              </Panel>
              <PanelResizeHandle />

              <Panel defaultSize="49%" minSize="34%" style={{ minWidth: 0 }}>
                <JavaEditor />
              </Panel>
              <PanelResizeHandle />

              <Panel defaultSize="35%" minSize="25%" style={{ minWidth: 0 }}>
                <VisualizationPanel />
              </Panel>

            </PanelGroup>
          </Panel>

          <PanelResizeHandle />

          {/* ── BOTTOM ROW: Bottom tabs + Call Stack + Console ── */}
          <Panel defaultSize="28%" minSize="20%" maxSize="60%">
            <PanelGroup orientation="horizontal" style={{ height: '100%', minWidth: 0 }}>

              <Panel defaultSize="50%" minSize="30%" style={{ minWidth: 0 }}>
                <BottomPanel />
              </Panel>
              <PanelResizeHandle />

              <Panel defaultSize="25%" minSize="18%" style={{ minWidth: 0 }}>
                <CallStackPanel />
              </Panel>
              <PanelResizeHandle />

              <Panel defaultSize="25%" minSize="18%" style={{ minWidth: 0 }}>
                <ConsolePanel />
              </Panel>

            </PanelGroup>
          </Panel>

        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />

      {/* Overlays */}
      <TooltipOverlay />
      <ExplanationOverlay />
    </div>
  );
}

// ============================================================
// Root export — wrapped in ErrorBoundary
// ============================================================
export default function App() {
  return (
    <ErrorBoundary>
      <IdeLayout />
    </ErrorBoundary>
  );
}
