// ============================================================
// Core Services - Modular Architecture
// ============================================================

// Type definitions for all services
export type LanguageId = 
  | 'java' | 'python' | 'c' | 'cpp' | 'javascript' | 'typescript'
  | 'go' | 'rust' | 'kotlin' | 'php' | 'csharp' | 'html' | 'css'
  | 'sql' | 'shell' | 'json' | 'markdown';

export interface LanguageConfig {
  id: LanguageId;
  name: string;
  extensions: string[];
  monacoLanguage: string;
  runner: {
    compile?: string[];      // Compile command
    execute: string[];       // Execute command
    args?: string[];         // Default args
    env?: Record<string, string>;
  };
  visualizer?: {
    supportsDP?: boolean;
    supportsRecursion?: boolean;
    supportsLoops?: boolean;
    customExtractors?: string[];
  };
  lsp?: {
    command: string[];
    initializationOptions?: any;
  };
  formatter?: {
    command: string[];
  };
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: LanguageId;
  children?: FileNode[];
  isOpen?: boolean;
  isActive?: boolean;
  size?: number;
  modified?: Date;
}

export interface WorkspaceFolder {
  uri: string;
  name: string;
  index: number;
}

export interface EditorTab {
  id: string;
  file: FileNode;
  isDirty: boolean;
  language: LanguageId;
  cursorPosition?: { line: number; column: number };
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  scrollPosition?: { top: number; left: number };
}

export interface TerminalInstance {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  processId?: string;
  isRunning: boolean;
  history: TerminalLine[];
}

export interface TerminalLine {
  type: 'stdout' | 'stderr' | 'stdin' | 'system' | 'prompt';
  text: string;
  timestamp: number;
}

export interface DebugConfiguration {
  name: string;
  type: LanguageId;
  request: 'launch' | 'attach';
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
  stopOnEntry?: boolean;
  preLaunchTask?: string;
}

export interface Breakpoint {
  id: string;
  file: string;
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  enabled: boolean;
  verified?: boolean;
}

export interface Diagnostic {
  id: string;
  file: string;
  range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  severity: 'error' | 'warning' | 'info' | 'hint';
  code?: string;
  message: string;
  source: string;
  relatedInformation?: Diagnostic[];
}

export interface TaskDefinition {
  label: string;
  type: 'shell' | 'process';
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  group?: 'build' | 'test' | 'none';
  problemMatcher?: string | string[];
  presentation?: {
    echo?: boolean;
    reveal?: 'always' | 'silent' | 'never';
    panel?: 'shared' | 'dedicated' | 'new';
    clear?: boolean;
  };
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  description: string;
  main: string;
  contributes?: {
    commands?: ExtensionCommand[];
    menus?: Record<string, ExtensionMenuItem[]>;
    keybindings?: ExtensionKeybinding[];
    languages?: ExtensionLanguage[];
    themes?: ExtensionTheme[];
    snippets?: ExtensionSnippet[];
    views?: ExtensionView[];
    configuration?: ExtensionConfiguration;
  };
  activationEvents?: string[];
  engines?: { vscode: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ExtensionCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface ExtensionMenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface ExtensionKeybinding {
  command: string;
  key: string;
  mac?: string;
  when?: string;
}

export interface ExtensionLanguage {
  id: string;
  extensions: string[];
  aliases: string[];
  configuration?: string;
}

export interface ExtensionTheme {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

export interface ExtensionSnippet {
  language: string;
  path: string;
}

export interface ExtensionView {
  id: string;
  name: string;
  type: 'tree' | 'webview';
  when?: string;
}

export interface ExtensionConfiguration {
  title: string;
  properties: Record<string, any>;
}

// ============================================================
// Editor Service
// ============================================================

export interface EditorService {
  // Tab management
  openFile(file: FileNode): Promise<EditorTab>;
  closeTab(tabId: string): Promise<void>;
  closeAllTabs(): Promise<void>;
  closeOtherTabs(tabId: string): Promise<void>;
  closeTabsToRight(tabId: string): Promise<void>;
  getTabs(): EditorTab[];
  getActiveTab(): EditorTab | undefined;
  setActiveTab(tabId: string): Promise<void>;
  
  // Editor state
  getTabState(tabId: string): EditorTab | undefined;
  saveTab(tabId: string): Promise<boolean>;
  saveAllTabs(): Promise<void>;
  revertTab(tabId: string): Promise<void>;
  
  // Editor instances
  getEditor(tabId: string): any | undefined;
  registerEditor(tabId: string, editor: any): void;
  unregisterEditor(tabId: string): void;
  
  // Split editors
  splitEditor(tabId: string, direction: 'left' | 'right' | 'up' | 'down'): Promise<void>;
  mergeEditorGroups(): void;
  
  // Events
  onDidChangeActiveTab(listener: (tab: EditorTab | undefined) => void): () => void;
  onDidOpenTab(listener: (tab: EditorTab) => void): () => void;
  onDidCloseTab(listener: (tabId: string) => void): () => void;
  onDidChangeTabDirty(listener: (tabId: string, isDirty: boolean) => void): () => void;
}

// ============================================================
// Terminal Service
// ============================================================

export interface TerminalService {
  createTerminal(options?: {
    name?: string;
    cwd?: string;
    shell?: string;
    env?: Record<string, string>;
  }): Promise<TerminalInstance>;
  
  getTerminal(id: string): TerminalInstance | undefined;
  getAllTerminals(): TerminalInstance[];
  getActiveTerminal(): TerminalInstance | undefined;
  setActiveTerminal(id: string): void;
  
  closeTerminal(id: string): Promise<void>;
  closeAllTerminals(): Promise<void>;
  
  sendInput(terminalId: string, input: string): void;
  sendText(terminalId: string, text: string): void;
  
  resizeTerminal(terminalId: string, cols: number, rows: number): void;
  
  onDidCreateTerminal(listener: (term: TerminalInstance) => void): () => void;
  onDidCloseTerminal(listener: (id: string) => void): () => void;
  onDidChangeActiveTerminal(listener: (term: TerminalInstance | undefined) => void): () => void;
  onData(listener: (terminalId: string, line: TerminalLine) => void): () => void;
}

// ============================================================
// Runner Service (Execution)
// ============================================================

export interface RunResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  duration: number;
  pid?: number;
}

export interface RunOptions {
  language: LanguageId;
  file: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  stdin?: string;
}

export interface RunnerService {
  run(options: RunOptions): Promise<RunResult>;
  
  runInteractive(
    options: RunOptions,
    onOutput: (type: 'stdout' | 'stderr', data: string) => void,
    onInputRequest: () => Promise<string>,
    onExit: (code: number) => void
  ): { 
    stdin: (data: string) => void; 
    kill: () => void; 
    wait: () => Promise<number>;
  };
  
  stop(runId: string): Promise<void>;
  stopAll(): Promise<void>;
  
  getRunningProcesses(): Map<string, { id: string; options: RunOptions; startTime: number }>;
  
  onProcessStart(listener: (runId: string, options: RunOptions) => void): () => void;
  onProcessOutput(listener: (runId: string, type: 'stdout' | 'stderr', data: string) => void): () => void;
  onProcessExit(listener: (runId: string, code: number) => void): () => void;
}

// ============================================================
// Debugger Service
// ============================================================

export interface DebugSession {
  id: string;
  configuration: DebugConfiguration;
  state: 'initializing' | 'stopped' | 'running' | 'paused' | 'terminated';
  threads: DebugThread[];
  breakpoints: Breakpoint[];
  variables: DebugVariable[];
  callStack: DebugStackFrame[];
}

export interface DebugThread {
  id: number;
  name: string;
  state: 'running' | 'stopped' | 'exited';
  stoppedReason?: string;
}

export interface DebugStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
  module?: string;
  instructionPointer?: string;
}

export interface DebugVariable {
  name: string;
  value: string;
  type: string;
  variablesReference?: number;
  namedVariables?: number;
  indexedVariables?: number;
  memoryReference?: string;
}

export interface DebuggerService {
  startDebugging(config: DebugConfiguration): Promise<DebugSession>;
  stopDebugging(sessionId: string): Promise<void>;
  restartDebugging(sessionId: string): Promise<void>;
  
  pause(sessionId: string): Promise<void>;
  continue(sessionId: string): Promise<void>;
  stepIn(sessionId: string, threadId: number): Promise<void>;
  stepOut(sessionId: string, threadId: number): Promise<void>;
  stepOver(sessionId: string, threadId: number): Promise<void>;
  
  setBreakpoints(file: string, breakpoints: Breakpoint[]): Promise<Breakpoint[]>;
  getBreakpoints(): Breakpoint[];
  
  evaluate(sessionId: string, expression: string, frameId?: number): Promise<DebugVariable>;
  setVariable(sessionId: string, variableRef: number, name: string, value: string): Promise<void>;
  
  getVariables(sessionId: string, variablesReference: number): Promise<DebugVariable[]>;
  getCallStack(sessionId: string, threadId: number): Promise<DebugStackFrame[]>;
  
  getSession(sessionId: string): DebugSession | undefined;
  getActiveSession(): DebugSession | undefined;
  
  onDidChangeSession(listener: (session: DebugSession | undefined) => void): () => void;
  onDidChangeState(listener: (sessionId: string, state: DebugSession['state']) => void): () => void;
  onDidHitBreakpoint(listener: (sessionId: string, breakpoint: Breakpoint) => void): () => void;
}

// ============================================================
// Visualizer Service
// ============================================================

export interface VisualizationData {
  type: 'dp' | 'recursion' | 'loop' | 'memory' | 'callgraph' | 'cfg' | 'ast' | 'heap';
  data: any;
  metadata: {
    stepIndex: number;
    currentLine: number;
    timestamp: number;
    language: LanguageId;
  };
}

export interface VisualizerService {
  // DP Table
  getDPTable(variables: Record<string, any>, stepData: any): VisualizationData | null;
  
  // Recursion Tree
  getRecursionTree(callStack: any[], variables: Record<string, any>): VisualizationData | null;
  
  // Loop Trace
  getLoopTrace(branchDecisions: any[], variables: Record<string, any>): VisualizationData | null;
  
  // Memory Model
  getMemoryModel(stackFrames: any[], heapObjects: any[]): VisualizationData;
  
  // Call Graph
  getCallGraph(callStack: any[]): VisualizationData;
  
  // Control Flow Graph
  getCFG(sourceCode: string, language: LanguageId): VisualizationData;
  
  // AST
  getAST(sourceCode: string, language: LanguageId): VisualizationData;
  
  // Heap Visualization
  getHeapSnapshot(variables: Record<string, any>): VisualizationData;
  
  // Subscribe to updates
  subscribe(listener: (data: VisualizationData) => void): () => void;
  
  // Control
  pause(): void;
  resume(): void;
  step(): void;
  reset(): void;
}

// ============================================================
// Workspace Service
// ============================================================

export interface WorkspaceService {
  // Folders
  getWorkspaceFolders(): WorkspaceFolder[];
  addWorkspaceFolder(uri: string): Promise<void>;
  removeWorkspaceFolder(uri: string): Promise<void>;
  updateWorkspaceFolders(folders: WorkspaceFolder[]): void;
  
  // Files
  getFileTree(uri: string): Promise<FileNode>;
  watchFile(uri: string): Promise<void>;
  unwatchFile(uri: string): Promise<void>;
  
  readFile(uri: string): Promise<string>;
  writeFile(uri: string, content: string): Promise<void>;
  deleteFile(uri: string): Promise<void>;
  renameFile(oldUri: string, newUri: string): Promise<void>;
  createDirectory(uri: string): Promise<void>;
  
  // Search
  searchFiles(pattern: string, options?: { 
    include?: string; 
    exclude?: string; 
    maxResults?: number;
  }): Promise<{ file: FileNode; matches: { line: number; text: string }[] }[]>;
  
  searchInFiles(query: string, options?: {
    include?: string;
    exclude?: string;
    caseSensitive?: boolean;
    regex?: boolean;
  }): Promise<{ file: FileNode; matches: { line: number; column: number; text: string }[] }[]>;
  
  // Events
  onDidChangeWorkspaceFolders(listener: (folders: WorkspaceFolder[]) => void): () => void;
  onDidChangeFile(listener: (uri: string, type: 'created' | 'changed' | 'deleted') => void): () => void;
}

// ============================================================
// Language Manager Service
// ============================================================

export interface LanguageManagerService {
  getLanguageConfig(id: LanguageId): LanguageConfig | undefined;
  getAllLanguageConfigs(): LanguageConfig[];
  registerLanguage(config: LanguageConfig): void;
  unregisterLanguage(id: LanguageId): void;
  
  getLanguageForFile(fileName: string): LanguageId | undefined;
  getLanguageForPath(path: string): LanguageId | undefined;
  
  getSupportedLanguages(): LanguageId[];
  
  // Runner
  getRunner(language: LanguageId): { compile?: string[]; execute: string[] } | undefined;
  
  // LSP
  getLSPConfig(language: LanguageId): LanguageConfig['lsp'] | undefined;
  
  // Formatter
  getFormatter(language: LanguageId): LanguageConfig['formatter'] | undefined;
  
  // Visualizer support
  getVisualizerCapabilities(language: LanguageId): LanguageConfig['visualizer'] | undefined;
}

// ============================================================
// Extensions Service
// ============================================================

export interface ExtensionsService {
  // Extension management
  installExtension(extensionId: string, source?: 'marketplace' | 'local' | 'url'): Promise<ExtensionManifest>;
  uninstallExtension(extensionId: string): Promise<void>;
  enableExtension(extensionId: string): Promise<void>;
  disableExtension(extensionId: string): Promise<void>;
  updateExtension(extensionId: string): Promise<ExtensionManifest>;
  
  // Query
  getInstalledExtensions(): ExtensionManifest[];
  getEnabledExtensions(): ExtensionManifest[];
  getExtension(extensionId: string): ExtensionManifest | undefined;
  isExtensionEnabled(extensionId: string): boolean;
  
  // Marketplace
  searchExtensions(query: string): Promise<ExtensionManifest[]>;
  getExtensionDetails(extensionId: string): Promise<ExtensionManifest>;
  downloadExtension(extensionId: string, version?: string): Promise<ArrayBuffer>;
  
  // API for extensions
  registerCommand(command: string, callback: (...args: any[]) => any): () => void;
  registerView(viewId: string, provider: any): () => void;
  registerLanguageClient(languageId: string, client: any): () => void;
  
  // Events
  onDidInstallExtension(listener: (manifest: ExtensionManifest) => void): () => void;
  onDidUninstallExtension(listener: (extensionId: string) => void): () => void;
  onDidEnableExtension(listener: (extensionId: string) => void): () => void;
  onDidDisableExtension(listener: (extensionId: string) => void): () => void;
}

// ============================================================
// Status Bar Service
// ============================================================

export interface StatusBarService {
  setItem(id: string, item: {
    text: string;
    tooltip?: string;
    command?: string;
    color?: string;
    backgroundColor?: string;
    priority?: number;
    alignment?: 'left' | 'right';
  }): void;
  
  removeItem(id: string): void;
  getItem(id: string): StatusBarItem | undefined;
  getAllItems(): StatusBarItem[];
  
  setMode(mode: string): void;
  setLanguage(language: LanguageId): void;
  setEncoding(encoding: string): void;
  setLineEnding(ending: 'LF' | 'CRLF'): void;
  setCursorPosition(line: number, column: number): void;
  setSelection(selection: { start: number; end: number } | null): void;
  setSyncStatus(status: 'synced' | 'pending' | 'error'): void;
}

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  command?: string;
  color?: string;
  backgroundColor?: string;
  priority: number;
  alignment: 'left' | 'right';
}

// ============================================================
// Activity Bar Service
// ============================================================

export interface ActivityBarService {
  registerView(view: {
    id: string;
    title: string;
    icon: string | React.ReactNode;
    component: React.ComponentType<any>;
    order?: number;
    when?: string;
  }): () => void;
  
  unregisterView(viewId: string): void;
  setActiveView(viewId: string): void;
  getActiveView(): string | undefined;
  getViews(): { id: string; title: string; icon: any; order: number }[];
  
  setBadge(viewId: string, badge: string | number | undefined): void;
  setProgress(viewId: string, progress: number | undefined): void;
}

// ============================================================
// Command Palette Service
// ============================================================

export interface CommandPaletteService {
  registerCommand(command: {
    id: string;
    title: string;
    category?: string;
    icon?: string;
    keybinding?: string;
    when?: string;
    handler: (...args: any[]) => any;
  }): () => void;
  
  unregisterCommand(commandId: string): void;
  executeCommand(commandId: string, ...args: any[]): Promise<any>;
  
  getCommands(): { id: string; title: string; category?: string; keybinding?: string }[];
  searchCommands(query: string): { id: string; title: string; category?: string; keybinding?: string }[];
  
  open(): void;
  close(): void;
  
  onDidOpen(listener: () => void): () => void;
  onDidClose(listener: () => void): () => void;
}

// ============================================================
// Settings Service
// ============================================================

export interface SettingsService {
  get<T>(key: string, defaultValue?: T): T;
  set<T>(key: string, value: T): Promise<void>;
  update<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  
  getAll(): Record<string, any>;
  getSchema(): Record<string, any>;
  
  onDidChangeSetting(listener: (key: string, value: any) => void): () => void;
  
  // Workspace settings
  getWorkspaceSetting<T>(key: string, defaultValue?: T): T;
  setWorkspaceSetting<T>(key: string, value: T): Promise<void>;
  
  // User settings
  getUserSetting<T>(key: string, defaultValue?: T): T;
  setUserSetting<T>(key: string, value: T): Promise<void>;
  
  // Language-specific
  getLanguageSetting<T>(language: LanguageId, key: string, defaultValue?: T): T;
  setLanguageSetting<T>(language: LanguageId, key: string, value: T): Promise<void>;
}

// ============================================================
// Keybinding Service
// ============================================================

export interface KeybindingService {
  registerKeybinding(keybinding: {
    command: string;
    key: string;
    mac?: string;
    when?: string;
    weight?: number;
  }): () => void;
  
  unregisterKeybinding(command: string): void;
  getKeybindings(): { command: string; key: string; mac?: string; when?: string }[];
  
  resolveKeybinding(key: string, os: 'mac' | 'windows' | 'linux'): string | undefined;
  
  onDidChangeKeybindings(listener: () => void): () => void;
}

// ============================================================
// Problems Panel Service
// ============================================================

export interface ProblemsService {
  getDiagnostics(): Diagnostic[];
  getDiagnosticsForFile(file: string): Diagnostic[];
  
  setDiagnostics(file: string, diagnostics: Diagnostic[]): void;
  clearDiagnostics(file?: string): void;
  
  getDiagnosticsBySeverity(): { error: number; warning: number; info: number; hint: number };
  
  onDidChangeDiagnostics(listener: (diagnostics: Diagnostic[]) => void): () => void;
}

// ============================================================
// Output Channel Service
// ============================================================

export interface OutputChannelService {
  createChannel(name: string): OutputChannel;
  getChannel(name: string): OutputChannel | undefined;
  getAllChannels(): OutputChannel[];
  
  showChannel(name: string): void;
  closeChannel(name: string): void;
}

export interface OutputChannel {
  name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(): void;
  hide(): void;
  dispose(): void;
  
  onDidWrite(listener: (value: string) => void): () => void;
}

// ============================================================
// Service Registry (Dependency Injection Container)
// ============================================================

export interface ServiceRegistry {
  register<T>(token: string, service: T): void;
  get<T>(token: string): T | undefined;
  has(token: string): boolean;
  remove(token: string): void;
}

export class DefaultServiceRegistry implements ServiceRegistry {
  private services = new Map<string, any>();

  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  get<T>(token: string): T | undefined {
    return this.services.get(token);
  }

  has(token: string): boolean {
    return this.services.has(token);
  }

  remove(token: string): void {
    this.services.delete(token);
  }
}

export const serviceRegistry = new DefaultServiceRegistry();

// Pre-defined tokens
export const SERVICE_TOKENS = {
  editor: 'editor',
  terminal: 'terminal',
  runner: 'runner',
  debugger: 'debugger',
  visualizer: 'visualizer',
  workspace: 'workspace',
  languageManager: 'languageManager',
  extensions: 'extensions',
  statusBar: 'statusBar',
  activityBar: 'activityBar',
  commandPalette: 'commandPalette',
  settings: 'settings',
  keybindings: 'keybindings',
  problems: 'problems',
  output: 'output',
} as const;

// ============================================================
// Default Service Implementations
// ============================================================

export function createDefaultServices(): ServiceRegistry {
  const registry = new DefaultServiceRegistry();
  registry.register('editor', createEditorService());
  registry.register('terminal', createTerminalService());
  registry.register('runner', createRunnerService());
  registry.register('debugger', createDebuggerService());
  registry.register('visualizer', createVisualizerService());
  registry.register('workspace', createWorkspaceService());
  registry.register('languageManager', createLanguageManagerService());
  registry.register('extensions', createExtensionsService());
  registry.register('statusBar', createStatusBarService());
  registry.register('activityBar', createActivityBarService());
  registry.register('commandPalette', createCommandPaletteService());
  registry.register('settings', createSettingsService());
  registry.register('keybindings', createKeybindingService());
  registry.register('problems', createProblemsService());
  registry.register('output', createOutputChannelService());
  return registry;
}

// Placeholder implementations - to be filled with actual logic
function createEditorService(): EditorService {
  return {
    openFile: async () => { throw new Error('Not implemented'); },
    closeTab: async () => { throw new Error('Not implemented'); },
    closeAllTabs: async () => { throw new Error('Not implemented'); },
    closeOtherTabs: async () => { throw new Error('Not implemented'); },
    closeTabsToRight: async () => { throw new Error('Not implemented'); },
    getTabs: () => [],
    getActiveTab: () => undefined,
    setActiveTab: async () => { throw new Error('Not implemented'); },
    getTabState: () => undefined,
    saveTab: async () => false,
    saveAllTabs: async () => { throw new Error('Not implemented'); },
    revertTab: async () => { throw new Error('Not implemented'); },
    getEditor: () => undefined,
    registerEditor: () => { throw new Error('Not implemented'); },
    unregisterEditor: () => { throw new Error('Not implemented'); },
    splitEditor: async () => { throw new Error('Not implemented'); },
    mergeEditorGroups: () => { throw new Error('Not implemented'); },
    onDidChangeActiveTab: () => () => {},
    onDidOpenTab: () => () => {},
    onDidCloseTab: () => () => {},
    onDidChangeTabDirty: () => () => {},
  };
}

function createTerminalService(): TerminalService {
  return {
    createTerminal: async () => { throw new Error('Not implemented'); },
    getTerminal: () => undefined,
    getAllTerminals: () => [],
    getActiveTerminal: () => undefined,
    setActiveTerminal: () => { throw new Error('Not implemented'); },
    closeTerminal: async () => { throw new Error('Not implemented'); },
    closeAllTerminals: async () => { throw new Error('Not implemented'); },
    sendInput: () => { throw new Error('Not implemented'); },
    sendText: () => { throw new Error('Not implemented'); },
    resizeTerminal: () => { throw new Error('Not implemented'); },
    onDidCreateTerminal: () => () => {},
    onDidCloseTerminal: () => () => {},
    onDidChangeActiveTerminal: () => () => {},
    onData: () => () => {},
  };
}

function createRunnerService(): RunnerService {
  return {
    run: async () => { throw new Error('Not implemented'); },
    runInteractive: () => { throw new Error('Not implemented'); },
    stop: async () => { throw new Error('Not implemented'); },
    stopAll: async () => { throw new Error('Not implemented'); },
    getRunningProcesses: () => new Map(),
    onProcessStart: () => () => {},
    onProcessOutput: () => () => {},
    onProcessExit: () => () => {},
  };
}

function createDebuggerService(): DebuggerService {
  return {
    startDebugging: async () => { throw new Error('Not implemented'); },
    stopDebugging: async () => { throw new Error('Not implemented'); },
    restartDebugging: async () => { throw new Error('Not implemented'); },
    pause: async () => { throw new Error('Not implemented'); },
    continue: async () => { throw new Error('Not implemented'); },
    stepIn: async () => { throw new Error('Not implemented'); },
    stepOut: async () => { throw new Error('Not implemented'); },
    stepOver: async () => { throw new Error('Not implemented'); },
    setBreakpoints: async () => [],
    getBreakpoints: () => [],
    evaluate: async () => { throw new Error('Not implemented'); },
    setVariable: async () => { throw new Error('Not implemented'); },
    getVariables: async () => [],
    getCallStack: async () => [],
    getSession: () => undefined,
    getActiveSession: () => undefined,
    onDidChangeSession: () => () => {},
    onDidChangeState: () => () => {},
    onDidHitBreakpoint: () => () => {},
  };
}

function createVisualizerService(): VisualizerService {
  return {
    getDPTable: () => null,
    getRecursionTree: () => null,
    getLoopTrace: () => null,
    getMemoryModel: () => ({ type: 'memory', data: {}, metadata: { stepIndex: 0, currentLine: 0, timestamp: 0, language: 'java' } }),
    getCallGraph: () => ({ type: 'callgraph', data: {}, metadata: { stepIndex: 0, currentLine: 0, timestamp: 0, language: 'java' } }),
    getCFG: () => ({ type: 'cfg', data: {}, metadata: { stepIndex: 0, currentLine: 0, timestamp: 0, language: 'java' } }),
    getAST: () => ({ type: 'ast', data: {}, metadata: { stepIndex: 0, currentLine: 0, timestamp: 0, language: 'java' } }),
    getHeapSnapshot: () => ({ type: 'heap', data: {}, metadata: { stepIndex: 0, currentLine: 0, timestamp: 0, language: 'java' } }),
    subscribe: () => () => {},
    pause: () => {},
    resume: () => {},
    step: () => {},
    reset: () => {},
  };
}

function createWorkspaceService(): WorkspaceService {
  return {
    getWorkspaceFolders: () => [],
    addWorkspaceFolder: async () => { throw new Error('Not implemented'); },
    removeWorkspaceFolder: async () => { throw new Error('Not implemented'); },
    updateWorkspaceFolders: () => { throw new Error('Not implemented'); },
    getFileTree: async () => { throw new Error('Not implemented'); },
    watchFile: async () => { throw new Error('Not implemented'); },
    unwatchFile: async () => { throw new Error('Not implemented'); },
    readFile: async () => { throw new Error('Not implemented'); },
    writeFile: async () => { throw new Error('Not implemented'); },
    deleteFile: async () => { throw new Error('Not implemented'); },
    renameFile: async () => { throw new Error('Not implemented'); },
    createDirectory: async () => { throw new Error('Not implemented'); },
    searchFiles: async () => [],
    searchInFiles: async () => [],
    onDidChangeWorkspaceFolders: () => () => {},
    onDidChangeFile: () => () => {},
  };
}

function createLanguageManagerService(): LanguageManagerService {
  return {
    getLanguageConfig: () => undefined,
    getAllLanguageConfigs: () => [],
    registerLanguage: () => { throw new Error('Not implemented'); },
    unregisterLanguage: () => { throw new Error('Not implemented'); },
    getLanguageForFile: () => undefined,
    getLanguageForPath: () => undefined,
    getSupportedLanguages: () => [],
    getRunner: () => undefined,
    getLSPConfig: () => undefined,
    getFormatter: () => undefined,
    getVisualizerCapabilities: () => undefined,
  };
}

function createExtensionsService(): ExtensionsService {
  return {
    installExtension: async () => { throw new Error('Not implemented'); },
    uninstallExtension: async () => { throw new Error('Not implemented'); },
    enableExtension: async () => { throw new Error('Not implemented'); },
    disableExtension: async () => { throw new Error('Not implemented'); },
    updateExtension: async () => { throw new Error('Not implemented'); },
    getInstalledExtensions: () => [],
    getEnabledExtensions: () => [],
    getExtension: () => undefined,
    isExtensionEnabled: () => false,
    searchExtensions: async () => [],
    getExtensionDetails: async () => { throw new Error('Not implemented'); },
    downloadExtension: async () => { throw new Error('Not implemented'); },
    registerCommand: () => () => {},
    registerView: () => () => {},
    registerLanguageClient: () => () => {},
    onDidInstallExtension: () => () => {},
    onDidUninstallExtension: () => () => {},
    onDidEnableExtension: () => () => {},
    onDidDisableExtension: () => () => {},
  };
}

function createStatusBarService(): StatusBarService {
  return {
    setItem: () => { throw new Error('Not implemented'); },
    removeItem: () => { throw new Error('Not implemented'); },
    getItem: () => undefined,
    getAllItems: () => [],
    setMode: () => { throw new Error('Not implemented'); },
    setLanguage: () => { throw new Error('Not implemented'); },
    setEncoding: () => { throw new Error('Not implemented'); },
    setLineEnding: () => { throw new Error('Not implemented'); },
    setCursorPosition: () => { throw new Error('Not implemented'); },
    setSelection: () => { throw new Error('Not implemented'); },
    setSyncStatus: () => { throw new Error('Not implemented'); },
  };
}

function createActivityBarService(): ActivityBarService {
  return {
    registerView: () => () => {},
    unregisterView: () => { throw new Error('Not implemented'); },
    setActiveView: () => { throw new Error('Not implemented'); },
    getActiveView: () => undefined,
    getViews: () => [],
    setBadge: () => { throw new Error('Not implemented'); },
    setProgress: () => { throw new Error('Not implemented'); },
  };
}

function createCommandPaletteService(): CommandPaletteService {
  return {
    registerCommand: () => () => {},
    unregisterCommand: () => { throw new Error('Not implemented'); },
    executeCommand: async () => { throw new Error('Not implemented'); },
    getCommands: () => [],
    searchCommands: () => [],
    open: () => { throw new Error('Not implemented'); },
    close: () => { throw new Error('Not implemented'); },
    onDidOpen: () => () => {},
    onDidClose: () => () => {},
  };
}

function createSettingsService(): SettingsService {
  return {
    get: () => undefined as any,
    set: async () => { throw new Error('Not implemented'); },
    update: async () => { throw new Error('Not implemented'); },
    delete: async () => { throw new Error('Not implemented'); },
    getAll: () => ({}),
    getSchema: () => ({}),
    onDidChangeSetting: () => () => {},
    getWorkspaceSetting: () => undefined as any,
    setWorkspaceSetting: async () => { throw new Error('Not implemented'); },
    getUserSetting: () => undefined as any,
    setUserSetting: async () => { throw new Error('Not implemented'); },
    getLanguageSetting: () => undefined as any,
    setLanguageSetting: async () => { throw new Error('Not implemented'); },
  };
}

function createKeybindingService(): KeybindingService {
  return {
    registerKeybinding: () => () => {},
    unregisterKeybinding: () => { throw new Error('Not implemented'); },
    getKeybindings: () => [],
    resolveKeybinding: () => undefined,
    onDidChangeKeybindings: () => () => {},
  };
}

function createProblemsService(): ProblemsService {
  return {
    getDiagnostics: () => [],
    getDiagnosticsForFile: () => [],
    setDiagnostics: () => { throw new Error('Not implemented'); },
    clearDiagnostics: () => { throw new Error('Not implemented'); },
    getDiagnosticsBySeverity: () => ({ error: 0, warning: 0, info: 0, hint: 0 }),
    onDidChangeDiagnostics: () => () => {},
  };
}

function createOutputChannelService(): OutputChannelService {
  return {
    createChannel: () => { throw new Error('Not implemented'); },
    getChannel: () => undefined,
    getAllChannels: () => [],
    showChannel: () => { throw new Error('Not implemented'); },
    closeChannel: () => { throw new Error('Not implemented'); },
  };
}