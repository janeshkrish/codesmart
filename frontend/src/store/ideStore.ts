import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  AnalysisResult, AstNode, VisualizationTab, BottomTab,
  FileNode, StepResult, ScopeInfo, VariableInfo, HeapObject,
  LanguageId, EditorTab, TerminalInstance, DebugConfiguration,
  Breakpoint, Diagnostic, WorkspaceFolder, TaskDefinition
} from '../types';
import type { ExecutionSnapshot } from '../services/executionEngine';
import type { ServiceRegistry } from '../services/coreServices';

// ============================================================
// Extended IDE State Store
// ============================================================

interface IdeState {
  // ============================================================
  // Editor State
  // ============================================================
  sourceCode: string;
  sessionId: string;
  activeFile: FileNode | null;
  files: FileNode[];
  cursorPosition: { line: number; column: number };
  
  // Tabs
  editorTabs: EditorTab[];
  activeTabId: string | null;
  tabGroups: EditorTab[][]; // Split editor groups
  
  // ============================================================
  // Analysis
  // ============================================================
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  lastAnalysisTime: number;
  
  // Selection / Highlighting
  selectedAstNodeId: string | null;
  selectedScopeId: string | null;
  selectedVariableId: string | null;
  selectedHeapObjectId: string | null;
  highlightedRange: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
  
  // ============================================================
  // Workspace
  // ============================================================
  workspaceFolders: WorkspaceFolder[];
  fileTree: FileNode | null;
  
  // ============================================================
  // Visualization
  // ============================================================
  activeVisualizationTab: VisualizationTab;
  activeBottomTab: BottomTab;
  
  // ============================================================
  // Execution
  // ============================================================
  executionId: string | null;
  isExecuting: boolean;
  executionMode: 'run' | 'debug' | 'visualize';
  executionSteps: StepResult[];
  currentStepResult: StepResult | null;
  consoleLines: { type: 'stdout' | 'stderr' | 'system' | 'stdin'; text: string }[];
  breakpoints: Map<string, Breakpoint[]>; // file -> breakpoints
  currentExecutionLine: number | null;
  executionPaused: boolean;
  executionSnapshot: ExecutionSnapshot | null;
  executionSnapshots: ExecutionSnapshot[];
  currentSnapshotIndex: number;
  
  // ============================================================
  // Terminal
  // ============================================================
  terminals: TerminalInstance[];
  activeTerminalId: string | null;
  
  // ============================================================
  // Debug
  // ============================================================
  debugConfigurations: DebugConfiguration[];
  activeDebugSession: string | null;
  debugBreakpoints: Breakpoint[];
  debugCallStack: any[];
  debugVariables: any[];
  debugWatchExpressions: string[];
  
  // ============================================================
  // Problems / Diagnostics
  // ============================================================
  diagnostics: Diagnostic[];
  
  // ============================================================
  // Output Channels
  // ============================================================
  outputChannels: Map<string, { name: string; lines: string[] }>;
  activeOutputChannel: string | null;
  
  // ============================================================
  // Tasks
  // ============================================================
  tasks: TaskDefinition[];
  runningTasks: Map<string, { task: TaskDefinition; startTime: number }>;
  
  // ============================================================
  // Extensions
  // ============================================================
  installedExtensions: Map<string, any>; // ExtensionManifest
  enabledExtensions: Set<string>;
  
  // ============================================================
  // UI State
  // ============================================================
  showTooltip: boolean;
  tooltipContent: string | null;
  tooltipPosition: { x: number; y: number } | null;
  showExplanation: boolean;
  explanationText: string | null;
  explanationTitle: string | null;
  
  // Panels visibility
  panelVisibility: {
    explorer: boolean;
    search: boolean;
    sourceControl: boolean;
    runDebug: boolean;
    extensions: boolean;
    terminal: boolean;
    problems: boolean;
    output: boolean;
    debugConsole: boolean;
  };
  
  // Activity bar
  activeActivity: string;
  
  // Sidebar
  sidebarWidth: number;
  panelHeight: number;
  
  // Status bar
  statusBarItems: Map<string, any>;
  
  // Settings
  settings: Record<string, any>;
  
  // WebSocket
  wsConnected: boolean;
  
  // ============================================================
  // Services
  // ============================================================
  services: ServiceRegistry | null;
  
  // ============================================================
  // Actions
  // ============================================================
  
  // Editor
  setSourceCode: (code: string) => void;
  setSessionId: (id: string) => void;
  setCursorPosition: (pos: { line: number; column: number }) => void;
  
  // Tabs
  openTab: (file: FileNode) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
  closeAllTabs: () => Promise<void>;
  closeOtherTabs: (tabId: string) => Promise<void>;
  setActiveTab: (tabId: string) => void;
  updateTabDirty: (tabId: string, isDirty: boolean) => void;
  splitEditor: (tabId: string, direction: 'left' | 'right' | 'up' | 'down') => Promise<void>;
  mergeEditorGroups: () => void;
  moveTabToGroup: (tabId: string, groupIndex: number) => void;
  
  // Analysis
  setAnalysisResult: (result: AnalysisResult | null) => void;
  setIsAnalyzing: (val: boolean) => void;
  
  // Selection
  selectAstNode: (nodeId: string | null) => void;
  selectScope: (scopeId: string | null) => void;
  selectVariable: (variableId: string | null) => void;
  selectHeapObject: (objectId: string | null) => void;
  highlightRange: (range: { startLine: number; startColumn: number; endLine: number; endColumn: number } | null) => void;
  
  // Visualization
  setActiveVisualizationTab: (tab: VisualizationTab) => void;
  setActiveBottomTab: (tab: BottomTab) => void;
  
  // Execution
  setExecutionId: (id: string | null) => void;
  setIsExecuting: (val: boolean) => void;
  setExecutionMode: (mode: 'run' | 'debug' | 'visualize') => void;
  addExecutionStep: (step: StepResult) => void;
  setCurrentStepResult: (step: StepResult | null) => void;
  appendConsoleLine: (type: 'stdout' | 'stderr' | 'system' | 'stdin', text: string) => void;
  clearConsoleOutput: () => void;
  clearExecutionSteps: () => void;
  
  toggleBreakpoint: (file: string, line: number) => void;
  setBreakpoints: (file: string, breakpoints: Breakpoint[]) => void;
  clearBreakpoints: (file?: string) => void;
  setCurrentExecutionLine: (line: number | null) => void;
  setExecutionPaused: (val: boolean) => void;
  setExecutionSnapshot: (snapshot: ExecutionSnapshot | null) => void;
  addExecutionSnapshot: (snapshot: ExecutionSnapshot) => void;
  goToStep: (index: number) => void;
  syncExecutionState: (snapshot: ExecutionSnapshot) => void;
  
  // Terminal
  createTerminal: (options?: { name?: string; cwd?: string; shell?: string }) => Promise<string>;
  closeTerminal: (terminalId: string) => Promise<void>;
  closeAllTerminals: () => Promise<void>;
  setActiveTerminal: (terminalId: string) => void;
  appendTerminalOutput: (terminalId: string, type: 'stdout' | 'stderr' | 'stdin' | 'system', text: string) => void;
  clearTerminalOutput: (terminalId: string) => void;
  sendTerminalInput: (terminalId: string, input: string) => void;
  
  // Debug
  addDebugConfiguration: (config: DebugConfiguration) => void;
  removeDebugConfiguration: (name: string) => void;
  setActiveDebugSession: (sessionId: string | null) => void;
  setDebugCallStack: (callStack: any[]) => void;
  setDebugVariables: (variables: any[]) => void;
  addWatchExpression: (expr: string) => void;
  removeWatchExpression: (expr: string) => void;
  updateWatchExpression: (index: number, expr: string) => void;
  
  // Diagnostics
  setDiagnostics: (file: string, diagnostics: Diagnostic[]) => void;
  clearDiagnostics: (file?: string) => void;
  
  // Output
  createOutputChannel: (name: string) => void;
  appendOutput: (channel: string, text: string) => void;
  clearOutput: (channel: string) => void;
  setActiveOutputChannel: (channel: string | null) => void;
  closeOutputChannel: (channel: string) => void;
  
  // Tasks
  addTask: (task: TaskDefinition) => void;
  removeTask: (label: string) => void;
  startTask: (label: string) => void;
  stopTask: (label: string) => void;
  
  // Extensions
  installExtension: (manifest: any) => void;
  uninstallExtension: (extensionId: string) => void;
  enableExtension: (extensionId: string) => void;
  disableExtension: (extensionId: string) => void;
  
  // Workspace
  addWorkspaceFolder: (uri: string) => Promise<void>;
  removeWorkspaceFolder: (uri: string) => Promise<void>;
  setFileTree: (tree: FileNode) => void;
  addFile: (file: FileNode) => void;
  removeFile: (path: string) => void;
  renameFile: (oldPath: string, newPath: string) => void;
  
  // UI
  setPanelVisibility: (panel: keyof IdeState['panelVisibility'], visible: boolean) => void;
  setActiveActivity: (activity: string) => void;
  setSidebarWidth: (width: number) => void;
  setPanelHeight: (height: number) => void;
  
  // Status Bar
  setStatusBarItem: (id: string, item: any) => void;
  removeStatusBarItem: (id: string) => void;
  
  // Settings
  getSetting: <T>(key: string, defaultValue?: T) => T;
  setSetting: <T>(key: string, value: T) => Promise<void>;
  
  // Services
  setServices: (services: ServiceRegistry) => void;
  getService: <T>(token: string) => T | undefined;
  
  // WebSocket
  setWsConnected: (val: boolean) => void;
  
  // Helpers
  getSelectedAstNode: () => AstNode | null;
  getSelectedScope: () => ScopeInfo | null;
  getSelectedVariable: () => VariableInfo | null;
  getSelectedHeapObject: () => HeapObject | null;
  
  // File operations
  setActiveFile: (file: FileNode | null) => void;
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
    
    editorTabs: [{
      id: '1',
      file: { id: '1', name: 'Main.java', path: '/Main.java', type: 'file', language: 'java' },
      isDirty: false,
      language: 'java',
    }],
    activeTabId: '1',
    tabGroups: [[
      {
        id: '1',
        file: { id: '1', name: 'Main.java', path: '/Main.java', type: 'file', language: 'java' },
        isDirty: false,
        language: 'java',
      }
    ]],
    
    analysisResult: null,
    isAnalyzing: false,
    lastAnalysisTime: 0,
    
    selectedAstNodeId: null,
    selectedScopeId: null,
    selectedVariableId: null,
    selectedHeapObjectId: null,
    highlightedRange: null,
    
    workspaceFolders: [],
    fileTree: null,
    
    activeVisualizationTab: 'memory',
    activeBottomTab: 'terminal',
    
    executionId: null,
    isExecuting: false,
    executionMode: 'visualize',
    executionSteps: [],
    currentStepResult: null,
    consoleLines: [],
    breakpoints: new Map(),
    currentExecutionLine: null,
    executionPaused: false,
    executionSnapshot: null,
    executionSnapshots: [],
    currentSnapshotIndex: -1,
    
    terminals: [],
    activeTerminalId: null,
    
    debugConfigurations: [],
    activeDebugSession: null,
    debugBreakpoints: [],
    debugCallStack: [],
    debugVariables: [],
    debugWatchExpressions: [],
    
    diagnostics: [],
    
    outputChannels: new Map(),
    activeOutputChannel: null,
    
    tasks: [],
    runningTasks: new Map(),
    
    installedExtensions: new Map(),
    enabledExtensions: new Set(),
    
    showTooltip: false,
    tooltipContent: null,
    tooltipPosition: null,
    showExplanation: false,
    explanationText: null,
    explanationTitle: null,
    
    panelVisibility: {
      explorer: true,
      search: false,
      sourceControl: false,
      runDebug: false,
      extensions: false,
      terminal: true,
      problems: true,
      output: false,
      debugConsole: false,
    },
    
    activeActivity: 'explorer',
    
    sidebarWidth: 280,
    panelHeight: 300,
    
    statusBarItems: new Map(),
    
    settings: {
      'editor.fontSize': 14,
      'editor.fontFamily': "'JetBrains Mono', 'Fira Code', monospace",
      'editor.tabSize': 4,
      'editor.insertSpaces': true,
      'editor.wordWrap': 'off',
      'editor.minimap.enabled': true,
      'editor.formatOnSave': false,
      'editor.formatOnPaste': false,
      'terminal.integrated.shell.windows': 'powershell.exe',
      'terminal.integrated.shell.linux': '/bin/bash',
      'terminal.integrated.shell.osx': '/bin/zsh',
      'files.autoSave': 'off',
      'workbench.colorTheme': 'codesmart-dark',
      'workbench.activityBar.visible': true,
      'workbench.statusBar.visible': true,
      'debug.console.closeOnEnd': false,
    },
    
    services: null,
    
    wsConnected: false,
    
    // Actions
    setSourceCode: (code) => set({ sourceCode: code }),
    setSessionId: (id) => set({ sessionId: id }),
    setCursorPosition: (pos) => set({ cursorPosition: pos }),
    
    openTab: async (file) => {
      const state = get();
      const existingTab = state.editorTabs.find(t => t.file.path === file.path);
      if (existingTab) {
        set({ activeTabId: existingTab.id });
        return;
      }
      
      const newTab: EditorTab = {
        id: `tab-${Date.now()}`,
        file,
        isDirty: false,
        language: file.language || 'plaintext',
      };
      
      set((state) => ({
        editorTabs: [...state.editorTabs, newTab],
        activeTabId: newTab.id,
        sourceCode: '', // Will be loaded when tab activates
      }));
      
      // Load file content
      const content = await state.services?.get('workspace')?.readFile(file.path);
      if (content !== undefined) {
        set({ sourceCode: content });
      }
    },
    
    closeTab: async (tabId) => {
      set((state) => {
        const tabIndex = state.editorTabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return state;
        
        const newTabs = state.editorTabs.filter(t => t.id !== tabId);
        let newActiveTabId = state.activeTabId;
        
        if (state.activeTabId === tabId) {
          // Activate adjacent tab
          if (tabIndex < newTabs.length) {
            newActiveTabId = newTabs[tabIndex].id;
          } else if (newTabs.length > 0) {
            newActiveTabId = newTabs[newTabs.length - 1].id;
          } else {
            newActiveTabId = null;
          }
        }
        
        // Also remove from tab groups
        const newGroups = state.tabGroups.map(group => 
          group.filter(t => t.id !== tabId)
        ).filter(group => group.length > 0);
        
        return {
          editorTabs: newTabs,
          tabGroups: newGroups.length > 0 ? newGroups : [[]],
          activeTabId: newActiveTabId,
        };
      });
    },
    
    closeAllTabs: async () => {
      set({ editorTabs: [], activeTabId: null, tabGroups: [[]] });
    },
    
    closeOtherTabs: async (tabId) => {
      set((state) => {
        const tab = state.editorTabs.find(t => t.id === tabId);
        if (!tab) return state;
        
        return {
          editorTabs: [tab],
          activeTabId: tabId,
          tabGroups: [[tab]],
        };
      });
    },
    
    setActiveTab: (tabId) => {
      const state = get();
      const tab = state.editorTabs.find(t => t.id === tabId);
      if (tab) {
        set({ 
          activeTabId: tabId,
          sourceCode: tab.file.path ? '' : '', // Would load from file
        });
      }
    },
    
    updateTabDirty: (tabId, isDirty) => {
      set((state) => ({
        editorTabs: state.editorTabs.map(t => 
          t.id === tabId ? { ...t, isDirty } : t
        ),
      }));
    },
    
    splitEditor: async (tabId, direction) => {
      // Implementation would split the editor group
      console.log('Split editor:', tabId, direction);
    },
    
    mergeEditorGroups: () => {
      set((state) => ({
        tabGroups: [state.tabGroups.flat()],
      }));
    },
    
    moveTabToGroup: (tabId, groupIndex) => {
      // Implementation
    },
    
    setAnalysisResult: (result) => set({ analysisResult: result, lastAnalysisTime: Date.now() }),
    setIsAnalyzing: (val) => set({ isAnalyzing: val }),
    
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
    setExecutionMode: (mode) => set({ executionMode: mode }),
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
    
    toggleBreakpoint: (file, line) => {
      set((state) => {
        const newBreakpoints = new Map(state.breakpoints);
        const fileBreakpoints = newBreakpoints.get(file) || [];
        const existingIndex = fileBreakpoints.findIndex(b => b.line === line);
        
        if (existingIndex >= 0) {
          fileBreakpoints.splice(existingIndex, 1);
        } else {
          fileBreakpoints.push({
            id: `bp-${Date.now()}`,
            file,
            line,
            enabled: true,
          });
        }
        
        if (fileBreakpoints.length === 0) {
          newBreakpoints.delete(file);
        } else {
          newBreakpoints.set(file, fileBreakpoints);
        }
        
        return { breakpoints: newBreakpoints };
      });
    },
    
    setBreakpoints: (file, breakpoints) => {
      set((state) => {
        const newBreakpoints = new Map(state.breakpoints);
        if (breakpoints.length === 0) {
          newBreakpoints.delete(file);
        } else {
          newBreakpoints.set(file, breakpoints);
        }
        return { breakpoints: newBreakpoints };
      });
    },
    
    clearBreakpoints: (file) => {
      set((state) => {
        const newBreakpoints = new Map(state.breakpoints);
        if (file) {
          newBreakpoints.delete(file);
        } else {
          newBreakpoints.clear();
        }
        return { breakpoints: newBreakpoints };
      });
    },
    
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
    
    createTerminal: async (options) => {
      const terminalId = `term-${Date.now()}`;
      const terminal: TerminalInstance = {
        id: terminalId,
        name: options?.name || `Terminal ${get().terminals.length + 1}`,
        cwd: options?.cwd || '/',
        shell: options?.shell || 'bash',
        isRunning: true,
        history: [],
      };
      
      set((state) => ({
        terminals: [...state.terminals, terminal],
        activeTerminalId: terminalId,
      }));
      
      return terminalId;
    },
    
    closeTerminal: async (terminalId) => {
      set((state) => {
        const newTerminals = state.terminals.filter(t => t.id !== terminalId);
        let newActiveId = state.activeTerminalId;
        if (state.activeTerminalId === terminalId) {
          newActiveId = newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null;
        }
        return {
          terminals: newTerminals,
          activeTerminalId: newActiveId,
        };
      });
    },
    
    closeAllTerminals: async () => {
      set({ terminals: [], activeTerminalId: null });
    },
    
    setActiveTerminal: (terminalId) => set({ activeTerminalId: terminalId }),
    
    appendTerminalOutput: (terminalId, type, text) => {
      set((state) => ({
        terminals: state.terminals.map(t => 
          t.id === terminalId 
            ? { ...t, history: [...t.history, { type, text, timestamp: Date.now() }] }
            : t
        ),
      }));
    },
    
    clearTerminalOutput: (terminalId) => {
      set((state) => ({
        terminals: state.terminals.map(t => 
          t.id === terminalId ? { ...t, history: [] } : t
        ),
      }));
    },
    
    sendTerminalInput: (terminalId, input) => {
      // Send to backend
      const state = get();
      const terminalService = state.services?.get('terminal');
      if (terminalService) {
        terminalService.sendInput(terminalId, input);
      }
    },
    
    addDebugConfiguration: (config) => {
      set((state) => ({
        debugConfigurations: [...state.debugConfigurations, config],
      }));
    },
    
    removeDebugConfiguration: (name) => {
      set((state) => ({
        debugConfigurations: state.debugConfigurations.filter(c => c.name !== name),
      }));
    },
    
    setActiveDebugSession: (sessionId) => set({ activeDebugSession: sessionId }),
    setDebugCallStack: (callStack) => set({ debugCallStack: callStack }),
    setDebugVariables: (variables) => set({ debugVariables: variables }),
    addWatchExpression: (expr) => set((state) => ({
      debugWatchExpressions: [...state.debugWatchExpressions, expr],
    })),
    removeWatchExpression: (expr) => set((state) => ({
      debugWatchExpressions: state.debugWatchExpressions.filter(e => e !== expr),
    })),
    updateWatchExpression: (index, expr) => set((state) => ({
      debugWatchExpressions: state.debugWatchExpressions.map((e, i) => i === index ? expr : e),
    })),
    
    setDiagnostics: (file, diagnostics) => {
      set((state) => {
        const newDiagnostics = state.diagnostics.filter(d => d.file !== file);
        return { diagnostics: [...newDiagnostics, ...diagnostics] };
      });
    },
    
    clearDiagnostics: (file) => {
      set((state) => ({
        diagnostics: file 
          ? state.diagnostics.filter(d => d.file !== file)
          : [],
      }));
    },
    
    createOutputChannel: (name) => {
      set((state) => {
        const newChannels = new Map(state.outputChannels);
        newChannels.set(name, { name, lines: [] });
        return { outputChannels: newChannels, activeOutputChannel: name };
      });
    },
    
    appendOutput: (channel, text) => {
      set((state) => {
        const newChannels = new Map(state.outputChannels);
        const ch = newChannels.get(channel);
        if (ch) {
          newChannels.set(channel, { ...ch, lines: [...ch.lines, text] });
        }
        return { outputChannels: newChannels };
      });
    },
    
    clearOutput: (channel) => {
      set((state) => {
        const newChannels = new Map(state.outputChannels);
        const ch = newChannels.get(channel);
        if (ch) {
          newChannels.set(channel, { ...ch, lines: [] });
        }
        return { outputChannels: newChannels };
      });
    },
    
    setActiveOutputChannel: (channel) => set({ activeOutputChannel: channel }),
    closeOutputChannel: (channel) => {
      set((state) => {
        const newChannels = new Map(state.outputChannels);
        newChannels.delete(channel);
        return { outputChannels: newChannels };
      });
    },
    
    addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
    removeTask: (label) => set((state) => ({ tasks: state.tasks.filter(t => t.label !== label) })),
    startTask: (label) => {
      const task = get().tasks.find(t => t.label === label);
      if (task) {
        set((state) => ({
          runningTasks: new Map(state.runningTasks).set(label, { task, startTime: Date.now() }),
        }));
      }
    },
    stopTask: (label) => {
      set((state) => {
        const newRunning = new Map(state.runningTasks);
        newRunning.delete(label);
        return { runningTasks: newRunning };
      });
    },
    
    installExtension: (manifest) => {
      set((state) => {
        const newInstalled = new Map(state.installedExtensions);
        newInstalled.set(manifest.id, manifest);
        return { installedExtensions: newInstalled };
      });
    },
    
    uninstallExtension: (extensionId) => {
      set((state) => {
        const newInstalled = new Map(state.installedExtensions);
        newInstalled.delete(extensionId);
        const newEnabled = new Set(state.enabledExtensions);
        newEnabled.delete(extensionId);
        return { installedExtensions: newInstalled, enabledExtensions: newEnabled };
      });
    },
    
    enableExtension: (extensionId) => {
      set((state) => {
        const newEnabled = new Set(state.enabledExtensions);
        newEnabled.add(extensionId);
        return { enabledExtensions: newEnabled };
      });
    },
    
    disableExtension: (extensionId) => {
      set((state) => {
        const newEnabled = new Set(state.enabledExtensions);
        newEnabled.delete(extensionId);
        return { enabledExtensions: newEnabled };
      });
    },
    
    addWorkspaceFolder: async (uri) => {
      // Implementation
    },
    
    removeWorkspaceFolder: async (uri) => {
      // Implementation
    },
    
    setFileTree: (tree) => set({ fileTree: tree }),
    
    addFile: (file) => set((state) => ({ 
      files: [...state.files, file],
      fileTree: state.fileTree ? { ...state.fileTree, children: [...(state.fileTree.children || []), file] } : file,
    })),
    
    removeFile: (path) => {
      set((state) => ({
        files: state.files.filter(f => f.path !== path),
      }));
    },
    
    renameFile: (oldPath, newPath) => {
      set((state) => ({
        files: state.files.map(f => f.path === oldPath ? { ...f, path: newPath, name: newPath.split('/').pop() || newPath } : f),
      }));
    },
    
    setPanelVisibility: (panel, visible) => set((state) => ({
      panelVisibility: { ...state.panelVisibility, [panel]: visible },
    })),
    
    setActiveActivity: (activity) => set({ activeActivity: activity }),
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    setPanelHeight: (height) => set({ panelHeight: height }),
    
    setStatusBarItem: (id, item) => set((state) => {
      const newItems = new Map(state.statusBarItems);
      newItems.set(id, item);
      return { statusBarItems: newItems };
    }),
    
    removeStatusBarItem: (id) => set((state) => {
      const newItems = new Map(state.statusBarItems);
      newItems.delete(id);
      return { statusBarItems: newItems };
    }),
    
    getSetting: <T>(key: string, defaultValue?: T) => {
      const keys = key.split('.');
      let value: any = get().settings;
      for (const k of keys) {
        value = value?.[k];
      }
      return value !== undefined ? value : defaultValue;
    },
    
    setSetting: async <T>(key: string, value: T) => {
      set((state) => {
        const keys = key.split('.');
        const newSettings = { ...state.settings };
        let current: any = newSettings;
        for (let i = 0; i < keys.length - 1; i++) {
          current[keys[i]] = { ...current[keys[i]] };
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        return { settings: newSettings };
      });
    },
    
    setServices: (services) => set({ services }),
    getService: <T>(token: string) => get().services?.get(token) as T | undefined,
    
setWsConnected: (val) => set({ wsConnected: val }),
    
    showExplanationPanel: (title: string, text: string) => set({ showExplanation: true, explanationTitle: title, explanationText: text }),
    hideExplanationPanel: () => set({ showExplanation: false }),
     
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
    
    setActiveFile: (file) => set({ activeFile: file }),
  }))
);

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