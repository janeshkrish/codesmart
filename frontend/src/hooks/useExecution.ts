import { useEffect, useCallback, useRef } from 'react';
import { useIdeStore } from '../store/ideStore';
import { executionEngine, type ExecutionSnapshot } from '../services/executionEngine';
import { apiService } from '../services/apiService';

// ============================================================
// useExecution Hook
// Connects the frontend execution engine to the Zustand store.
// Dispatches step results to all panels when execution advances.
// ============================================================

export function useExecution() {
  const {
    addExecutionStep,
    syncExecutionState,
    setCurrentExecutionLine,
    appendConsoleLine,
    setIsExecuting,
    setExecutionPaused,
    setExecutionId,
    clearConsoleOutput,
    clearExecutionSteps,
    setActiveBottomTab,
  } = useIdeStore();

  const processedLinesRef = useRef(0);

  // Process a snapshot from the engine into the store
  const processSnapshot = useCallback((snapshot: ExecutionSnapshot) => {
    const stepResult = executionEngine.snapshotToStepResult(snapshot);
    addExecutionStep(stepResult);
    syncExecutionState(snapshot);

    if (snapshot.currentLine) {
      setCurrentExecutionLine(snapshot.currentLine);
    }

    // Sync console output (only new lines)
    if (snapshot.consoleOutput) {
      const lines = snapshot.consoleOutput.split('\n').filter(Boolean);
      if (lines.length > processedLinesRef.current) {
        for (let i = processedLinesRef.current; i < lines.length; i++) {
          appendConsoleLine('stdout', lines[i] + '\n');
        }
        processedLinesRef.current = lines.length;
      }
    }
  }, [addExecutionStep, syncExecutionState, setCurrentExecutionLine, appendConsoleLine]);

  // Register the callback on mount
  useEffect(() => {
    executionEngine.setOnStep(processSnapshot);
    return () => executionEngine.setOnStep(() => {});
  }, [processSnapshot]);

  // Sync breakpoints to engine whenever they change
  useEffect(() => {
    const breakpointsMap = useIdeStore.getState().breakpoints;
    const breakpoints = new Set<number>();
    breakpointsMap.forEach(bps => bps.forEach(bp => breakpoints.add(bp.line)));
    executionEngine.setBreakpoints(breakpoints);
  }, []);

  // Subscribe to breakpoint changes
  useEffect(() => {
    const unsubscribe = useIdeStore.subscribe(
      (state) => state.breakpoints,
      (breakpointsMap) => {
        const breakpoints = new Set<number>();
        breakpointsMap.forEach(bps => bps.forEach(bp => breakpoints.add(bp.line)));
        executionEngine.setBreakpoints(breakpoints);
      },
    );
    return unsubscribe;
  }, []);

  // Initialize the engine from the latest analysis result
  const initEngine = useCallback(async () => {
    let state = useIdeStore.getState();
    let analysis = state.analysisResult;
    const needsFreshAnalysis = !analysis || analysis.sourceCode !== state.sourceCode;

    if (needsFreshAnalysis) {
      state.setIsAnalyzing(true);
      try {
        analysis = await apiService.analyzeCode(state.sessionId, state.sourceCode);
        state.setAnalysisResult(analysis);
      } catch (error) {
        state.appendConsoleLine('stderr', `Cannot start visualization: ${error instanceof Error ? error.message : 'analysis service is unavailable'}\n`);
        return false;
      } finally {
        state.setIsAnalyzing(false);
      }
      state = useIdeStore.getState();
    }

    if (!analysis?.parseSuccess) {
      const message = analysis?.diagnostics.find(diagnostic => diagnostic.severity === 'ERROR')?.humanMessage
        ?? 'Fix Java errors before starting visualization.';
      state.appendConsoleLine('stderr', `Cannot start visualization: ${message}\n`);
      return false;
    }

    const breakpointsMap = state.breakpoints;
    const breakpoints = new Set<number>();
    breakpointsMap.forEach(bps => bps.forEach(bp => breakpoints.add(bp.line)));
    
    executionEngine.init(analysis, breakpoints);
    const id = 'local-' + Date.now();
    setExecutionId(id);
    processedLinesRef.current = 0;
    return true;
  }, [setExecutionId]);

  // ─── Execution control functions ───────────────────────────────────

  const run = useCallback(async () => {
    if (useIdeStore.getState().isExecuting) return;
    clearConsoleOutput();
    clearExecutionSteps();
    if (!(await initEngine())) return;
    setIsExecuting(true);
    setActiveBottomTab('timeline');
    await executionEngine.run();
    setIsExecuting(false);
  }, [initEngine, clearConsoleOutput, clearExecutionSteps, setIsExecuting, setActiveBottomTab]);

  const step = useCallback(async () => {
    if (!useIdeStore.getState().isExecuting) {
      clearConsoleOutput();
      clearExecutionSteps();
      if (!(await initEngine())) return;
      setIsExecuting(true);
    }
    const snapshot = executionEngine.stepInto();
    if (snapshot && executionEngine.isFinished()) {
      setIsExecuting(false);
    }
  }, [initEngine, clearConsoleOutput, clearExecutionSteps, setIsExecuting]);

  const stepInto = useCallback(async () => {
    if (!useIdeStore.getState().isExecuting) {
      clearConsoleOutput();
      clearExecutionSteps();
      if (!(await initEngine())) return;
      setIsExecuting(true);
    }
    const snapshot = executionEngine.stepInto();
    if (snapshot && executionEngine.isFinished()) {
      setIsExecuting(false);
    }
  }, [initEngine, clearConsoleOutput, clearExecutionSteps, setIsExecuting]);

  const stepOver = useCallback(async () => {
    if (!useIdeStore.getState().isExecuting) {
      clearConsoleOutput();
      clearExecutionSteps();
      if (!(await initEngine())) return;
      setIsExecuting(true);
    }
    const snapshot = executionEngine.stepOver();
    if (snapshot && executionEngine.isFinished()) {
      setIsExecuting(false);
    }
  }, [initEngine, clearConsoleOutput, clearExecutionSteps, setIsExecuting]);

  const stepOut = useCallback(() => {
    if (!useIdeStore.getState().isExecuting) return;
    const snapshot = executionEngine.stepOut();
    if (snapshot && executionEngine.isFinished()) {
      setIsExecuting(false);
    }
  }, [setIsExecuting]);

  const stepBack = useCallback(() => {
    if (!useIdeStore.getState().isExecuting) return;
    executionEngine.stepBack();
  }, []);

  const continueExecution = useCallback(async () => {
    if (!useIdeStore.getState().isExecuting) return;
    setExecutionPaused(false);
    await executionEngine.continueExecution();
    if (executionEngine.isFinished()) {
      setIsExecuting(false);
    } else {
      setExecutionPaused(true);
    }
  }, [setExecutionPaused, setIsExecuting]);

  const pause = useCallback(() => {
    executionEngine.pause();
    setExecutionPaused(true);
  }, [setExecutionPaused]);

  const resume = useCallback(() => {
    setExecutionPaused(false);
    executionEngine.resume();
  }, [setExecutionPaused]);

  const stop = useCallback(() => {
    executionEngine.pause();
    executionEngine.reset();
    setExecutionId(null);
    setIsExecuting(false);
    setExecutionPaused(false);
    setCurrentExecutionLine(null);
    processedLinesRef.current = 0;
  }, [setExecutionId, setIsExecuting, setExecutionPaused, setCurrentExecutionLine]);

  const restart = useCallback(() => {
    clearConsoleOutput();
    clearExecutionSteps();
    executionEngine.restart();
    setCurrentExecutionLine(null);
    setExecutionPaused(false);
    processedLinesRef.current = 0;
  }, [clearConsoleOutput, clearExecutionSteps, setCurrentExecutionLine, setExecutionPaused]);

  return {
    run,
    step,
    stepInto,
    stepOver,
    stepOut,
    stepBack,
    continueExecution,
    pause,
    resume,
    stop,
    restart,
    initEngine,
  };
}
