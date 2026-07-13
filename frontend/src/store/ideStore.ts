import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  AnalysisResult, AstNode, VisualizationTab, BottomTab,
  FileNode, StepResult, ScopeInfo, VariableInfo, HeapObject
} from '../types';
import type { ExecutionSnapshot } from '../services/executionEngine';

// ============================================================
// IDE State Store (Zustand)
// ============================================================

interface IdeState {
  // Editor
  sourceCode: string;
  sessionId: string;
  activeFile: FileNode | null;
  files: FileNode[];
  cursorPosition: { line: number; column: number };

  // Analysis
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  lastAnalysisTime: number;

  // Selection / Highlighting
  selectedAstNodeId: string | null;
  selectedScopeId: string | null;
  selectedVariableId: string | null;
  selectedHeapObjectId: string | null;
  highlightedRange: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;

  // Visualization
  activeVisualizationTab: VisualizationTab;
  activeBottomTab: BottomTab;

  // Execution
  executionId: string | null;
  isExecuting: boolean;
  executionSteps: StepResult[];
  currentStepResult: StepResult | null;
  consoleLines: { type: 'stdout' | 'stderr' | 'system' | 'stdin'; text: string }[];
  breakpoints: Set<number>;
  currentExecutionLine: number | null;
  executionPaused: boolean;
  executionSnapshot: ExecutionSnapshot | null;
  executionSnapshots: ExecutionSnapshot[];
  currentSnapshotIndex: number;

  // UI State
  showTooltip: boolean;
  tooltipContent: string | null;
  tooltipPosition: { x: number; y: number } | null;
  showExplanation: boolean;
  explanationText: string | null;
  explanationTitle: string | null;

  // WebSocket
  wsConnected: boolean;

  // Actions
  setSourceCode: (code: string) => void;
  setSessionId: (id: string) => void;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (val: boolean) => void;
  setCursorPosition: (pos: { line: number; column: number }) => void;

  selectAstNode: (nodeId: string | null) => void;
  selectScope: (scopeId: string | null) => void;
  selectVariable: (variableId: string | null) => void;
  selectHeapObject: (objectId: string | null) => void;
  highlightRange: (range: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;

  setActiveVisualizationTab: (tab: VisualizationTab) => void;
  setActiveBottomTab: (tab: BottomTab) => void;

  setExecutionId: (id: string | null) => void;
  setIsExecuting: (val: boolean) => void;
  addExecutionStep: (step: StepResult) => void;
  setCurrentStepResult: (step: StepResult | null) => void;
  appendConsoleLine: (type: 'stdout' | 'stderr' | 'system' | 'stdin', text: string) => void;
  clearConsoleOutput: () => void;
  clearExecutionSteps: () => void;

  toggleBreakpoint: (line: number) => void;
  clearBreakpoints: () => void;
  setCurrentExecutionLine: (line: number | null) => void;
  setExecutionPaused: (val: boolean) => void;
  setExecutionSnapshot: (snapshot: ExecutionSnapshot | null) => void;
  addExecutionSnapshot: (snapshot: ExecutionSnapshot) => void;
  goToStep: (index: number) => void;
  syncExecutionState: (snapshot: ExecutionSnapshot) => void;

  showTooltipAt: (content: string, pos: { x: number; y: number }) => void;
  hideTooltip: () => void;
  showExplanationPanel: (title: string, text: string) => void;
  hideExplanationPanel: () => void;

  setWsConnected: (val: boolean) => void;

  setActiveFile: (file: FileNode | null) => void;
  addFile: (file: FileNode) => void;

  // Computed helpers
  getSelectedAstNode: () => AstNode | null;
  getSelectedScope: () => ScopeInfo | null;
  getSelectedVariable: () => VariableInfo | null;
  getSelectedHeapObject: () => HeapObject | null;
}

// Default sample code
const DEFAULT_CODE = `import java.util.ArrayList;
import java.util.List;

public class Main {
    static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        int[] dp = new int[5];
        int[] memo = new int[5];
        List<Integer> values = new ArrayList<>();

        for (int i = 0; i < 5; i++) {
            dp[i] = i + 1;
            memo[i] = dp[i];
            values.add(dp[i]);
        }

        System.out.println(fib(4));
    }
}`;

const DEFAULT_SESSION = 'session-' + Math.random().toString(36).slice(2);

export const useIdeStore = create<IdeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    sourceCode: DEFAULT_CODE,
    sessionId: DEFAULT_SESSION,
    activeFile: { id: '1', name: 'Main.java', path: '/Main.java', type: 'file', language: 'java' },
    files: [
      { id: '1', name: 'Main.java', path: '/Main.java', type: 'file', language: 'java' },
    ],
    cursorPosition: { line: 1, column: 1 },

    analysisResult: null,
    isAnalyzing: false,
    lastAnalysisTime: 0,

    selectedAstNodeId: null,
    selectedScopeId: null,
    selectedVariableId: null,
    selectedHeapObjectId: null,
    highlightedRange: null,

    activeVisualizationTab: 'memory',
    activeBottomTab: 'problems',

    executionId: null,
    isExecuting: false,
    executionSteps: [],
    currentStepResult: null,
    consoleLines: [],
    breakpoints: new Set<number>(),
    currentExecutionLine: null,
    executionPaused: false,
    executionSnapshot: null,
    executionSnapshots: [],
    currentSnapshotIndex: -1,

    showTooltip: false,
    tooltipContent: null,
    tooltipPosition: null,
    showExplanation: false,
    explanationText: null,
    explanationTitle: null,

    wsConnected: false,

    // Actions
    setSourceCode: (code) => set({ sourceCode: code }),
    setSessionId: (id) => set({ sessionId: id }),
    setAnalysisResult: (result) => set({ analysisResult: result, lastAnalysisTime: Date.now() }),
    setIsAnalyzing: (val) => set({ isAnalyzing: val }),
    setCursorPosition: (pos) => set({ cursorPosition: pos }),

    selectAstNode: (nodeId) => {
      set({ selectedAstNodeId: nodeId });
      if (nodeId) {
        const state = get();
        const node = findAstNode(state.analysisResult?.astRoot, nodeId);
        if (node?.range) {
          get().highlightRange(node.range);
        }
        if (node?.explanation) {
          get().showExplanationPanel(node.label ?? node.type, node.explanation);
        }
      }
    },

    selectScope: (scopeId) => {
      set({ selectedScopeId: scopeId });
      if (scopeId) {
        const scope = get().getSelectedScope();
        if (scope?.range) {
          get().highlightRange(scope.range);
        }
      }
    },

    selectVariable: (variableId) => {
      set({ selectedVariableId: variableId });
      if (variableId) {
        const v = get().getSelectedVariable();
        if (v?.declarationRange) {
          get().highlightRange(v.declarationRange);
        }
        if (v) {
          const explanation = buildVariableExplanation(v);
          get().showExplanationPanel(v.name, explanation);
        }
      }
    },

    selectHeapObject: (objectId) => set({ selectedHeapObjectId: objectId }),

    highlightRange: (range) => set({ highlightedRange: range }),

    setActiveVisualizationTab: (tab) => set({ activeVisualizationTab: tab }),
    setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

    setExecutionId: (id) => set({ executionId: id }),
    setIsExecuting: (val) => set({ isExecuting: val }),
    addExecutionStep: (step) => set((state) => ({
      executionSteps: [...state.executionSteps, step],
      currentStepResult: step,
    })),
    setCurrentStepResult: (step) => set({ currentStepResult: step }),
    appendConsoleLine: (type, text) => set((state) => ({
      consoleLines: [...state.consoleLines, { type, text }],
    })),
    clearConsoleOutput: () => set({ consoleLines: [] }),
    clearExecutionSteps: () => set({
      executionSteps: [],
      currentStepResult: null,
      currentExecutionLine: null,
      executionSnapshot: null,
      executionSnapshots: [],
      currentSnapshotIndex: -1,
    }),

    toggleBreakpoint: (line) => set((state) => {
      const newBreakpoints = new Set(state.breakpoints);
      if (newBreakpoints.has(line)) {
        newBreakpoints.delete(line);
      } else {
        newBreakpoints.add(line);
      }
      return { breakpoints: newBreakpoints };
    }),
    clearBreakpoints: () => set({ breakpoints: new Set() }),
    setCurrentExecutionLine: (line) => set({ currentExecutionLine: line }),
    setExecutionPaused: (val) => set({ executionPaused: val }),
    setExecutionSnapshot: (snapshot) => set({ executionSnapshot: snapshot }),
    addExecutionSnapshot: (snapshot) => set((state) => ({
      executionSnapshots: [...state.executionSnapshots, snapshot],
      currentSnapshotIndex: state.executionSnapshots.length,
    })),
    goToStep: (index) => set((state) => {
      if (index < 0 || index >= state.executionSnapshots.length) return state;
      const snapshot = state.executionSnapshots[index];
      return {
        currentSnapshotIndex: index,
        executionSnapshot: snapshot,
        currentExecutionLine: snapshot.currentLine,
      };
    }),
    syncExecutionState: (snapshot) => {
      set((state) => ({
        executionSnapshot: snapshot,
        currentExecutionLine: snapshot.currentLine,
        executionSnapshots: state.executionSnapshots.some(existing => existing.stepIndex === snapshot.stepIndex)
          ? state.executionSnapshots
          : [...state.executionSnapshots, snapshot],
        currentSnapshotIndex: state.executionSnapshots.findIndex(existing => existing.stepIndex === snapshot.stepIndex) >= 0
          ? state.executionSnapshots.findIndex(existing => existing.stepIndex === snapshot.stepIndex)
          : state.executionSnapshots.length,
      }));
    },

    showTooltipAt: (content, pos) => set({ showTooltip: true, tooltipContent: content, tooltipPosition: pos }),
    hideTooltip: () => set({ showTooltip: false, tooltipContent: null, tooltipPosition: null }),
    showExplanationPanel: (title, text) => set({ showExplanation: true, explanationTitle: title, explanationText: text }),
    hideExplanationPanel: () => set({ showExplanation: false }),

    setWsConnected: (val) => set({ wsConnected: val }),

    setActiveFile: (file) => set({ activeFile: file }),
    addFile: (file) => set((state) => ({ files: [...state.files, file] })),

    // Computed
    getSelectedAstNode: () => {
      const { selectedAstNodeId, analysisResult } = get();
      if (!selectedAstNodeId || !analysisResult?.astRoot) return null;
      return findAstNode(analysisResult.astRoot, selectedAstNodeId);
    },
    getSelectedScope: () => {
      const { selectedScopeId, analysisResult } = get();
      if (!selectedScopeId || !analysisResult) return null;
      return analysisResult.scopes.find(s => s.id === selectedScopeId) ?? null;
    },
    getSelectedVariable: () => {
      const { selectedVariableId, analysisResult } = get();
      if (!selectedVariableId || !analysisResult) return null;
      return analysisResult.symbolTable.variables[selectedVariableId] ?? null;
    },
    getSelectedHeapObject: () => {
      const { selectedHeapObjectId, analysisResult } = get();
      if (!selectedHeapObjectId || !analysisResult) return null;
      return analysisResult.memoryModel.heapObjects.find(o => o.id === selectedHeapObjectId) ?? null;
    },
  }))
);

// ============================================================
// Helpers
// ============================================================

function findAstNode(root: AstNode | undefined, id: string): AstNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findAstNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function buildVariableExplanation(v: VariableInfo): string {
  const storage = {
    PRIMITIVE_STACK: 'stored directly on the stack frame (no heap allocation)',
    REFERENCE_STACK: 'a reference stored on the stack; the actual object lives on the heap',
    STRING_POOL: 'a reference on the stack; the String value lives in the String Pool (heap)',
    ARRAY_HEAP: 'a reference on the stack; the array lives on the heap',
    STATIC_AREA: 'stored in the Static Area (shared across all instances)',
    UNKNOWN: 'storage location unknown',
  }[v.storageKind] ?? 'storage location unknown';

  const lines = [
    `**Type**: \`${v.type}\``,
    `**Storage**: ${storage}`,
    v.staticValue ? `**Value**: \`${v.staticValue}\`` : '',
    v.parameter ? '**Role**: Method parameter — passed by the caller' : '',
    v.field ? '**Role**: Class field — belongs to the object instance' : '',
    v.staticField ? '**Modifier**: static — one copy shared across all instances' : '',
    v.finalVar ? '**Modifier**: final — cannot be reassigned after initialization' : '',
  ].filter(Boolean).join('\n');

  return lines;
}
