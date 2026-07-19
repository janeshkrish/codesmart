// ============================================================
// Frontend Java Execution Engine
// Interprets Java source code by walking the AST, producing
// StepResult objects with variables, stack frames, and memory
// snapshots for every statement.
// ============================================================

import type {
  AnalysisResult, AstNode, StepResult, StackFrame,
  VariableInfo, MemoryModel, HeapObject, MemoryReference,
  DiagnosticInfo,
} from '../types';

// ============================================================
// Public Types
// ============================================================

export type ExecutionMode = 'step_into' | 'step_over' | 'step_out' | 'continue' | 'run';

export interface ExecutionSnapshot {
  stepIndex: number;
  currentLine: number;
  currentStatement: string;
  variables: Record<string, unknown>;
  callStack: StackFrameState[];
  heapObjects: HeapObjectState[];
  consoleOutput: string;
  dpArrays: DpArrayState[];
  memoCache: MemoCacheState;
  collections: CollectionState[];
  visitedLines: Set<number>;
  branchDecisions: BranchDecision[];
}

export interface StackFrameState {
  id: string;
  methodName: string;
  className: string;
  depth: number;
  localVariables: Map<string, VariableValue>;
  parameters: Map<string, VariableValue>;
  returnValue?: unknown;
  callLine: number;
  isActive: boolean;
}

export interface VariableValue {
  name: string;
  type: string;
  value: unknown;
  storageKind: string;
}

export interface HeapObjectState {
  id: string;
  className: string;
  kind: string;
  fields: Record<string, unknown>;
  arrayElements?: unknown[];
  stringValue?: string;
  collectionKind?: string;
  collectionElements?: unknown[];
}

export interface DpArrayState {
  name: string;
  dimensions: number;
  values1D?: unknown[];
  values2D?: unknown[][];
  lastChangedIndex?: { row?: number; col?: number; index?: number };
}

export interface MemoCacheState {
  entries: Map<string, { value: unknown; hitCount: number }>;
  lastAction?: 'store' | 'hit' | 'miss';
  lastKey?: string;
}

export interface CollectionState {
  name: string;
  type: string;
  elements: unknown[];
  lastOperation?: string;
  lastOperationIndex?: number;
}

export interface BranchDecision {
  line: number;
  condition: string;
  result: boolean;
  type: 'if' | 'while' | 'for' | 'switch';
}

interface StructuredReturn {
  value: unknown;
}

// ============================================================
// Execution Engine
// ============================================================

export class FrontendExecutionEngine {
  private static readonly MAX_STRUCTURED_SNAPSHOTS = 5_000;
  private snapshots: ExecutionSnapshot[] = [];
  private currentIndex = -1;
  private callStack: StackFrameState[] = [];
  private globalVars: Map<string, VariableValue> = new Map();
  private heapObjects: HeapObjectState[] = [];
  private heapIdCounter = 0;
  private consoleOutput = '';
  private paused = false;
  private running = false;
  private breakpoints: Set<number> = new Set();
  private visitedLines: Set<number> = new Set();
  private branchDecisions: BranchDecision[] = [];
  private dpArrays: DpArrayState[] = [];
  private memoCache: MemoCacheState = { entries: new Map() };
  private collections: CollectionState[] = [];
  private statementNodes: AstNode[] = [];
  private statementIndex = 0;
  private sourceLines: string[] = [];
  private methods: Map<string, AstNode> = new Map();
  private onStep: ((snapshot: ExecutionSnapshot) => void) | null = null;
  private stepMode: ExecutionMode = 'step_into';
  private stepOverDepth = 0;
  private stepOutDepth = 0;
  private frameIdCounter = 0;
  private structuredPlayback = false;

  // ============================================================
  // Lifecycle
  // ============================================================

  init(analysisResult: AnalysisResult, breakpoints: Set<number>) {
    this.reset();
    this.breakpoints = new Set(breakpoints);
    this.sourceLines = analysisResult.sourceCode.split('\n');

    // Extract statement-level nodes from AST in execution order
    if (analysisResult.astRoot) {
      this.extractMethods(analysisResult.astRoot);
      this.extractStatements(analysisResult.astRoot);
      if (this.containsNumericForLoop(analysisResult.astRoot) || this.methods.size > 1) {
        this.initializeStaticFields(analysisResult.astRoot);
        this.prepareStructuredSnapshots();
      }
    }
  }

  reset() {
    this.snapshots = [];
    this.currentIndex = -1;
    this.callStack = [];
    this.globalVars = new Map();
    this.heapObjects = [];
    this.heapIdCounter = 0;
    this.consoleOutput = '';
    this.paused = false;
    this.running = false;
    this.visitedLines = new Set();
    this.branchDecisions = [];
    this.dpArrays = [];
    this.memoCache = { entries: new Map() };
    this.collections = [];
    this.statementNodes = [];
    this.statementIndex = 0;
    this.methods = new Map();
    this.stepMode = 'step_into';
    this.stepOverDepth = 0;
    this.stepOutDepth = 0;
    this.frameIdCounter = 0;
    this.structuredPlayback = false;
  }

  setOnStep(callback: (snapshot: ExecutionSnapshot) => void) {
    this.onStep = callback;
  }

  setBreakpoints(breakpoints: Set<number>) {
    this.breakpoints = new Set(breakpoints);
  }

  // ============================================================
  // Statement Extraction from AST
  // ============================================================

  private extractMethods(node: AstNode) {
    if (node.type === 'MethodDeclaration' || node.type === 'ConstructorDeclaration') {
      const signature = node.sourceText || node.label || '';
      const name = signature.match(/\b([A-Za-z_$][\w$]*)\s*\(/)?.[1]
        ?? node.properties?.name as string
        ?? node.label
        ?? 'unknown';
      this.methods.set(name, node);
    }
    if (node.children) {
      for (const child of node.children) {
        this.extractMethods(child);
      }
    }
  }

  private extractStatements(node: AstNode) {
    // Find the main method and extract its body statements
    const mainMethod = this.methods.get('main');
    if (mainMethod) {
      this.flattenStatements(mainMethod);
    } else {
      // If no main, just flatten all statements
      this.flattenStatements(node);
    }
  }

  private flattenStatements(node: AstNode) {
    if (!node) return;

    const statementTypes = new Set([
      'VariableDeclaration', 'ExpressionStmt', 'MethodCallExpr',
      'ReturnStmt', 'IfStmt', 'ForStmt', 'WhileStmt', 'DoWhileStmt',
      'ForEachStmt', 'SwitchStmt', 'TryStmt', 'ThrowStmt',
      'BreakStmt', 'ContinueStmt', 'AssignExpr', 'FieldDeclaration',
      'ObjectCreationExpr', 'ArrayCreationExpr',
    ]);

    if (statementTypes.has(node.type) && node.range) {
      this.statementNodes.push(node);
    }

    // Recurse into children for block-level statements
    if (node.children) {
      for (const child of node.children) {
        // Don't recurse into method declarations (they're called, not inlined)
        if (child.type !== 'MethodDeclaration' && child.type !== 'ConstructorDeclaration') {
          this.flattenStatements(child);
        }
      }
    }
  }

  // ============================================================
  // Execution Control
  // ============================================================

  stepInto(): ExecutionSnapshot | null {
    this.stepMode = 'step_into';
    if (this.structuredPlayback) return this.playPreparedSnapshot();
    return this.advanceOneStep();
  }

  stepOver(): ExecutionSnapshot | null {
    this.stepMode = 'step_over';
    this.stepOverDepth = this.callStack.length;
    return this.structuredPlayback ? this.playPreparedSnapshot() : this.advanceOneStep();
  }

  stepOut(): ExecutionSnapshot | null {
    if (this.structuredPlayback) return this.playPreparedSnapshot();
    if (this.callStack.length <= 1) {
      // At top-level, just step forward
      return this.advanceOneStep();
    }
    this.stepMode = 'step_out';
    this.stepOutDepth = this.callStack.length - 1;
    return this.advanceOneStep();
  }

  stepBack(): ExecutionSnapshot | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    this.statementIndex = Math.max(0, this.statementIndex - 1);
    const snapshot = this.snapshots[this.currentIndex];
    this.restoreFromSnapshot(snapshot);
    this.onStep?.(snapshot);
    return snapshot;
  }

  async continueExecution(): Promise<ExecutionSnapshot | null> {
    if (this.structuredPlayback) return this.playPreparedSnapshots();
    this.running = true;
    this.paused = false;
    let lastSnapshot: ExecutionSnapshot | null = null;

    while (this.running && !this.paused && this.statementIndex < this.statementNodes.length) {
      lastSnapshot = this.advanceOneStep();
      if (!lastSnapshot) break;

      // Check breakpoints
      if (this.breakpoints.has(lastSnapshot.currentLine) && this.currentIndex > 0) {
        this.paused = true;
        break;
      }

      // Small delay for animation
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    this.running = false;
    return lastSnapshot;
  }

  async run(): Promise<ExecutionSnapshot | null> {
    if (this.structuredPlayback) return this.playPreparedSnapshots();
    this.running = true;
    this.paused = false;
    let lastSnapshot: ExecutionSnapshot | null = null;

    while (this.running && !this.paused && this.statementIndex < this.statementNodes.length) {
      lastSnapshot = this.advanceOneStep();
      if (!lastSnapshot) break;

      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    this.running = false;
    return lastSnapshot;
  }

  pause() {
    this.paused = true;
    this.running = false;
  }

  resume() {
    this.paused = false;
    this.continueExecution();
  }

  restart() {
    const breakpoints = new Set(this.breakpoints);
    const sourceLines = [...this.sourceLines];
    const onStep = this.onStep;
    const stmts = [...this.statementNodes];
    const methods = new Map(this.methods);
    this.reset();
    this.breakpoints = breakpoints;
    this.sourceLines = sourceLines;
    this.onStep = onStep;
    this.statementNodes = stmts;
    this.methods = methods;
  }

  isFinished(): boolean {
    if (this.structuredPlayback) return this.currentIndex >= this.snapshots.length - 1;
    return this.statementIndex >= this.statementNodes.length;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isRunning(): boolean {
    return this.running;
  }

  getSnapshots(): ExecutionSnapshot[] {
    return this.snapshots;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  goToStep(index: number): ExecutionSnapshot | null {
    if (index < 0 || index >= this.snapshots.length) return null;
    this.currentIndex = index;
    const snapshot = this.snapshots[index];
    this.restoreFromSnapshot(snapshot);
    this.onStep?.(snapshot);
    return snapshot;
  }

  // ============================================================
  // Core Step Execution
  // ============================================================

  private advanceOneStep(): ExecutionSnapshot | null {
    if (this.statementIndex >= this.statementNodes.length) {
      // Produce a FINISHED snapshot
      const finishedSnapshot = this.captureSnapshot(
        this.sourceLines.length,
        'Program finished'
      );
      this.onStep?.(finishedSnapshot);
      return finishedSnapshot;
    }

    const node = this.statementNodes[this.statementIndex];
    this.statementIndex++;

    // Execute the statement and capture state
    const line = node.range?.startLine ?? 0;
    const statement = node.sourceText || node.label || node.type;
    this.visitedLines.add(line);

    // Simulate execution based on node type
    this.executeNode(node);

    const snapshot = this.captureSnapshot(line, statement);
    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;

    this.onStep?.(snapshot);
    return snapshot;
  }

  // ============================================================
  // Deterministic structured execution for numeric for-loops
  // ============================================================

  private containsNumericForLoop(node: AstNode): boolean {
    if (node.type === 'ForStmt' && node.children?.some(child => child.type === 'ForCondition')) return true;
    return node.children?.some(child => this.containsNumericForLoop(child)) ?? false;
  }

  private prepareStructuredSnapshots() {
    const main = this.methods.get('main');
    const body = main?.children?.find(child => child.type === 'BlockStmt');
    if (!main || !body) return;

    this.statementNodes = [];
    this.pushCallFrame('main', main.range?.startLine ?? 1);
    for (const statement of body.children ?? []) {
      this.executeStructuredStatement(statement);
    }
    this.structuredPlayback = this.snapshots.length > 0;
    this.currentIndex = -1;
  }

  private async playPreparedSnapshots(): Promise<ExecutionSnapshot | null> {
    this.running = true;
    this.paused = false;
    let lastSnapshot: ExecutionSnapshot | null = null;
    while (this.running && !this.paused && !this.isFinished()) {
      lastSnapshot = this.playPreparedSnapshot();
      if (lastSnapshot && this.breakpoints.has(lastSnapshot.currentLine)) {
        this.paused = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    this.running = false;
    return lastSnapshot;
  }

  private playPreparedSnapshot(): ExecutionSnapshot | null {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.snapshots.length) return null;
    this.currentIndex = nextIndex;
    const snapshot = this.snapshots[nextIndex];
    this.restoreFromSnapshot(snapshot);
    this.onStep?.(snapshot);
    return snapshot;
  }

  private initializeStaticFields(node: AstNode) {
    if (node.type === 'FieldDeclaration') {
      this.executeStructuredDeclaration(node.sourceText || node.label || '');
    }
    node.children?.forEach(child => this.initializeStaticFields(child));
  }

  private executeStructuredStatement(node: AstNode): StructuredReturn | null {
    if (node.type === 'VariableDeclaration') {
      this.executeStructuredDeclaration(node.sourceText || node.label || '');
      this.recordStructuredSnapshot(node);
      return null;
    }

    if (node.type === 'ExpressionStmt' && node.children?.[0]?.type === 'VariableDeclaration') {
      const source = node.sourceText || node.children[0].sourceText || '';
      // JavaParser wraps local declarations in ExpressionStmt nodes. Route
      // primitives and common collections through the evaluator so values
      // such as `coins.length` and `Integer.MAX_VALUE - 1` are resolved.
      if (/^\s*(?:(?:public|private|protected|static|final)\s+)*(?:int|long|double|float|boolean|char|byte|short|List|Set|Queue|Deque|Stack|Map)\b/.test(source)) {
        this.executeStructuredDeclaration(source);
      } else {
        this.executeVariableDeclaration(node.children[0], source);
      }
      this.recordStructuredSnapshot(node);
      return null;
    }

    if (node.type === 'ForStmt') {
      return this.executeStructuredForLoop(node);
    }

    if (node.type === 'IfStmt') {
      return this.executeStructuredIf(node);
    }

    if (node.type === 'ReturnStmt') {
      const expression = (node.sourceText || node.label || '').replace(/^\s*return\s+|;\s*$/g, '').trim();
      const value = this.evaluateMethodExpression(expression);
      this.recordStructuredSnapshot(node);
      return { value };
    }

    const source = node.sourceText || node.label || '';
    this.executeStructuredSource(source);
    this.recordStructuredSnapshot(node);
    return null;
  }

  private executeStructuredIf(node: AstNode): StructuredReturn | null {
    const conditionNode = node.children?.find(child => child.type === 'Condition');
    const condition = conditionNode?.sourceText || node.sourceText?.match(/if\s*\((.*)\)/)?.[1] || '';
    const matched = this.evaluateCondition(condition);
    this.branchDecisions.push({ line: node.range?.startLine ?? 0, condition, result: matched, type: 'if' });
    const branches = node.children?.filter(child => child.type !== 'Condition') ?? [];
    // The parser represents an else body as its normal AST node and prefixes
    // its label with "else:" (rather than wrapping it in an ElseStmt node).
    const thenBranch = branches.find(child => !child.label.trim().startsWith('else:'));
    const elseNode = branches.find(child => child.type === 'ElseStmt' || child.label.trim().startsWith('else:'));
    const branch = matched ? thenBranch : (elseNode?.children?.[0] ?? elseNode);
    if (!branch) return null;
    if (branch.type === 'BlockStmt') {
      for (const child of branch.children ?? []) {
        const result = this.executeStructuredStatement(child);
        if (result) return result;
      }
      return null;
    }
    return this.executeStructuredStatement(branch);
  }

  private executeStructuredForLoop(node: AstNode): StructuredReturn | null {
    const initNode = node.children?.find(child => child.type === 'ForInit');
    const condition = node.children?.find(child => child.type === 'ForCondition')?.sourceText || '';
    const updateNode = node.children?.find(child => child.type === 'ForUpdate');
    const init = this.extractForFragment(initNode, 0);
    const update = this.extractForFragment(updateNode, 2);
    let body = node.children?.find(child => child.type === 'BlockStmt');
    if (!body) {
      // Braceless for-loop: the body is a bare statement (e.g. ExpressionStmt)
      const metaTypes = new Set(['ForInit', 'ForCondition', 'ForUpdate']);
      const bareBody = node.children?.find(child => !metaTypes.has(child.type));
      if (bareBody) {
        body = { id: 'synth-block', type: 'BlockStmt', label: '', children: [bareBody] } as AstNode;
      }
    }
    if (!init || !condition || !update || !body) return null;

    this.executeStructuredDeclaration(init);
    let guard = 0;
    while (
      this.evaluateCondition(condition)
      && guard++ < 1_000
      && this.snapshots.length < FrontendExecutionEngine.MAX_STRUCTURED_SNAPSHOTS
    ) {
      this.branchDecisions.push({
        line: node.range?.startLine ?? 0,
        condition,
        result: true,
        type: 'for',
      });
      for (const child of body.children ?? []) {
        const result = this.executeStructuredStatement(child);
        if (result) return result;
      }
      this.executeStructuredUpdate(update);
    }
    this.branchDecisions.push({
      line: node.range?.startLine ?? 0,
      condition,
      result: false,
      type: 'for',
    });
    return null;
  }

  private extractForFragment(node: AstNode | undefined, position: 0 | 2): string {
    if (!node) return '';
    const bracketed = node.label?.match(/\[([^\]]+)\]/)?.[1];
    if (bracketed) return bracketed.trim();
    const header = node.sourceText?.match(/for\s*\(([^;]+);([^;]+);([^)]+)\)/);
    return header?.[position + 1]?.trim() ?? node.sourceText?.trim() ?? '';
  }

  private executeStructuredDeclaration(source: string) {
    source = source.trim();
    const arrayMatch = source.match(/int\s*(\[\])\s*(\[\])?\s+(\w+)\s*=\s*new\s+int\s*\[\s*(.+?)\s*\](?:\s*\[\s*(.+?)\s*\])?/);
    if (arrayMatch) {
      const [, , secondDimension, name, firstSize, secondSize] = arrayMatch;
      const rows = Math.max(0, Number(this.evaluateExpression(firstSize)) || 0);
      const columns = secondDimension ? Math.max(0, Number(this.evaluateExpression(secondSize ?? '0')) || 0) : 0;
      const dimensions = secondDimension ? 2 : 1;
      const values1D = dimensions === 1 ? Array.from({ length: rows }, () => 0) : undefined;
      const values2D = dimensions === 2 ? Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0)) : undefined;
      this.setVariable(name, dimensions === 1 ? values1D : values2D);
      this.dpArrays = [...this.dpArrays.filter(array => array.name !== name), { name, dimensions, values1D, values2D }];
      return;
    }
    const literalArrayMatch = source.match(/(?:(?:public|private|protected|static|final)\s+)*int\s*\[\]\s+(\w+)\s*=\s*\{([^}]*)\}/);
    if (literalArrayMatch) {
      const [, name, values] = literalArrayMatch;
      const parsed = values.split(',').map(value => this.evaluateExpression(value.trim()));
      this.setVariable(name, parsed);
      this.dpArrays = [...this.dpArrays.filter(array => array.name !== name), { name, dimensions: 1, values1D: parsed }];
      return;
    }
    const collectionMatch = source.match(/(?:List|Set|Queue|Deque|Stack|Map)(?:\s*<[^;=]+>)?\s+(\w+)\s*=\s*new\s+(\w+)/);
    if (collectionMatch) {
      const [, name, type] = collectionMatch;
      this.collections = [...this.collections.filter(collection => collection.name !== name), { name, type, elements: [] }];
      this.setVariable(name, []);
      return;
    }
    const match = source.match(/(?:(?:public|private|protected|static|final)\s+)*(int|long|double|float|boolean|char|byte|short)\s+(\w+)\s*=\s*(.+?);?$/);
    if (!match) return;
    const [, type, name, expression] = match;
    const methodCall = expression.trim().match(/^(?:\w+\s*\.\s*)?(\w+)\s*\((.*)\)$/);
    const value = methodCall && this.methods.has(methodCall[1])
      ? this.invokeStructuredMethod(methodCall[1], methodCall[2])
      : this.evaluateExpression(expression);
    this.setVariable(name, value);
    const frame = this.callStack[this.callStack.length - 1];
    if (frame) frame.localVariables.set(name, { name, type, value: this.getVariable(name), storageKind: this.inferStorageKind(type) });
  }

  private executeStructuredSource(source: string) {
    // AST statement text preserves line breaks. Normalising it lets the
    // evaluator handle readable multi-line expressions such as Math.min(...).
    source = source
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\r\n]*/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    this.trackCollectionOperation(source);
    if (source.includes('System.out.print')) {
      const printMatch = source.match(/System\.out\.println?\s*\((.+)\)\s*;?$/);
      // Accept both direct/static calls (coinChange(...)) and instance calls
      // (solver.coinChange(...)).  The visualizer models the method execution;
      // the receiver name does not affect this local execution state.
      const callMatch = printMatch?.[1].match(/^(?:\w+\s*\.\s*)?(\w+)\s*\((.*)\)$/);
      if (callMatch && this.methods.has(callMatch[1])) {
        const unresolvedArgument = callMatch[2]
          .split(',')
          .map(argument => argument.trim())
          .find(argument => /^[A-Za-z_]\w*$/.test(argument) && this.getVariable(argument) === undefined);
        if (unresolvedArgument) {
          this.consoleOutput += `Cannot run ${callMatch[1]}: '${unresolvedArgument}' is not declared. Did you mean a variable with a similar name?\n`;
          return;
        }
        const value = this.invokeStructuredMethod(callMatch[1], callMatch[2]);
        this.consoleOutput += `${String(value)}${source.includes('println') ? '\n' : ''}`;
        return;
      }
      this.executeExpression({ id: 'print', type: 'ExpressionStmt', label: source, sourceText: source }, source);
      return;
    }
    const allocation = source.match(/^(\w+)\s*=\s*new\s+int\s*\[\s*(.+?)\s*\]\s*\[\s*(.+?)\s*\]\s*;?$/);
    if (allocation) {
      const [, name, rowExpression, columnExpression] = allocation;
      const rows = Number(this.evaluateExpression(rowExpression));
      const columns = Number(this.evaluateExpression(columnExpression));
      const values2D = Array.from({ length: Math.max(0, rows) }, () => Array.from({ length: Math.max(0, columns) }, () => 0));
      this.setVariable(name, values2D);
      this.dpArrays = [...this.dpArrays.filter(array => array.name !== name), { name, dimensions: 2, values2D }];
      return;
    }
    const arrayAssignment = source.match(/^(\w+)\s*\[\s*(.+?)\s*\](?:\s*\[\s*(.+?)\s*\])?\s*=\s*(.+?);?$/);
    if (arrayAssignment) {
      const [, name, firstIndex, secondIndex, expression] = arrayAssignment;
      const value = this.evaluateExpression(expression);
      const index = Number(this.evaluateExpression(firstIndex));
      const dp = this.dpArrays.find(array => array.name === name);
      if (dp?.dimensions === 2 && secondIndex !== undefined) {
        const column = Number(this.evaluateExpression(secondIndex));
        dp.values2D ??= [];
        dp.values2D[index] ??= [];
        dp.values2D[index][column] = value;
        dp.lastChangedIndex = { row: index, col: column };
      } else if (dp?.dimensions === 1) {
        dp.values1D ??= [];
        dp.values1D[index] = value;
        dp.lastChangedIndex = { index };
      }
      if (this.isMemoArray(name, 'int[]')) {
        const key = String(index);
        const existing = this.memoCache.entries.get(key);
        this.memoCache.entries.set(key, { value, hitCount: existing?.hitCount ?? 0 });
        this.memoCache.lastAction = existing ? 'hit' : 'store';
        this.memoCache.lastKey = key;
      }
      return;
    }
    const assignment = source.match(/^(\w+)\s*([+\-*/]?=)\s*(.+?);?$/);
    if (!assignment) return;
    const [, name, operator, expression] = assignment;
    const rhs = this.evaluateExpression(expression);
    const previous = this.getVariable(name);
    const value = operator === '+=' ? Number(previous ?? 0) + Number(rhs)
      : operator === '-=' ? Number(previous ?? 0) - Number(rhs)
      : operator === '*=' ? Number(previous ?? 0) * Number(rhs)
      : operator === '/=' ? Number(previous ?? 0) / Number(rhs)
      : rhs;
    this.setVariable(name, value);
  }

  private executeStructuredUpdate(source: string) {
    const increment = source.match(/^(\w+)(\+\+|--)$/);
    if (increment) {
      const [, name, operator] = increment;
      this.setVariable(name, Number(this.getVariable(name) ?? 0) + (operator === '++' ? 1 : -1));
      return;
    }
    this.executeStructuredSource(source.endsWith(';') ? source : `${source};`);
  }

  private invokeStructuredMethod(methodName: string, rawArguments: string): unknown {
    const method = this.methods.get(methodName);
    const body = method?.children?.find(child => child.type === 'BlockStmt');
    if (!method || !body) return undefined;

    const argumentsList = rawArguments.trim() ? rawArguments.split(',').map(argument => this.evaluateExpression(argument)) : [];
    this.pushCallFrame(methodName, method.range?.startLine ?? 0);
    const frame = this.callStack[this.callStack.length - 1];
    const parameters = method.children?.filter(child => child.type === 'Parameter') ?? [];
    parameters.forEach((parameter, index) => {
      const match = (parameter.sourceText || parameter.label).match(/(?:\w+(?:\[\])?)\s+(\w+)/);
      if (!match) return;
      frame.parameters.set(match[1], {
        name: match[1], type: 'int', value: argumentsList[index], storageKind: 'PRIMITIVE_STACK',
      });
    });
    this.recordStructuredSnapshot(method);

    let result: StructuredReturn | null = null;
    for (const statement of body.children ?? []) {
      result = this.executeStructuredStatement(statement);
      if (result) break;
    }
    const value = result?.value;
    frame.returnValue = value;
    this.popCallFrame();
    return value;
  }

  private evaluateMethodExpression(expression: string): unknown {
    let resolved = expression;
    for (let guard = 0; guard < 1_000; guard++) {
      const match = resolved.match(/(\w+)\s*\(([^()]*)\)/);
      if (!match || !this.methods.has(match[1])) break;
      const value = this.invokeStructuredMethod(match[1], match[2]);
      resolved = `${resolved.slice(0, match.index)}${String(value)}${resolved.slice((match.index ?? 0) + match[0].length)}`;
    }
    return this.evaluateExpression(resolved);
  }

  private evaluateCondition(expression: string): boolean {
    const value = this.evaluateExpression(expression);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      if (value.trim() === 'true') return true;
      if (value.trim() === 'false') return false;
    }
    // An unparsed expression must never become a truthy string and turn into
    // hundreds of synthetic iterations on the UI thread.
    return false;
  }

  private evaluateExpression(expression: string): unknown {
    const trimmed = expression.trim();
    // Preserve arrays and object references when they are passed as arguments.
    // Replacing only numbers would otherwise turn coinChange(coins, amount)
    // into the literal string "coins".
    if (/^[A-Za-z_]\w*$/.test(trimmed)) {
      const value = this.getVariable(trimmed);
      if (value !== undefined) return value;
    }

    let substituted = trimmed
      .replace(/Integer\.MAX_VALUE\b/g, String(2_147_483_647))
      .replace(/(\w+)\.length\b/g, (_match, name) => {
      const value = this.getVariable(name);
      return Array.isArray(value) || typeof value === 'string' ? String(value.length) : '0';
      });
    // Resolve innermost array lookups repeatedly, so expressions such as
    // dp[i][j - coins[i - 1]] work just like their Java counterparts.
    for (let pass = 0; pass < 10 && substituted.includes('['); pass++) {
      // Resolve complete two-dimensional access first. A 1D match must not
      // consume just `dp[i]` when the remaining column expression contains
      // another array access (for example, coins[i - 1]).
      let next = substituted.replace(/(\w+)\s*\[\s*([^\[\]]+)\s*\]\s*\[\s*([^\[\]]+)\s*\]/g, (_match, name, firstIndex, secondIndex) => {
        const value = this.getVariable(name);
        const row = Number(this.evaluateExpression(firstIndex));
        if (!Array.isArray(value)) return 'undefined';
        const column = Number(this.evaluateExpression(secondIndex));
        return String((value[row] as unknown[] | undefined)?.[column] ?? 0);
      });
      next = next.replace(/(\w+)\s*\[\s*([^\[\]]+)\s*\](?!\s*\[)/g, (_match, name, indexExpression) => {
        const value = this.getVariable(name);
        const index = Number(this.evaluateExpression(indexExpression));
        return Array.isArray(value) ? String(value[index] ?? 0) : 'undefined';
      });
      if (next === substituted) break;
      substituted = next;
    }
    substituted = substituted.replace(/Math\.min\s*\(([^,]+),\s*([^)]+)\)/g, 'Math.min($1,$2)');
    substituted = substituted.replace(/\b[A-Za-z_]\w*\b/g, token => {
      const value = this.getVariable(token);
      return typeof value === 'number' || typeof value === 'boolean' ? String(value) : token;
    }).trim();
    if (!/^[\d\s+\-*/%()<>!=&|.,?:A-Za-z]+$/.test(substituted)) return this.parseValue(expression.trim());
    try {
      return Function(`"use strict"; return (${substituted});`)();
    } catch {
      return this.parseValue(expression.trim());
    }
  }

  private recordStructuredSnapshot(node: AstNode) {
    const line = node.range?.startLine ?? 0;
    this.visitedLines.add(line);
    const snapshot = this.captureSnapshot(line, node.sourceText || node.label || node.type);
    this.snapshots.push(snapshot);
  }

  private executeNode(node: AstNode) {
    const sourceText = node.sourceText || node.label || '';

    switch (node.type) {
      case 'VariableDeclaration':
        this.executeVariableDeclaration(node, sourceText);
        break;
      case 'ExpressionStmt':
      case 'MethodCallExpr':
        this.executeExpression(node, sourceText);
        break;
      case 'AssignExpr':
        this.executeAssignment(node, sourceText);
        break;
      case 'ReturnStmt':
        this.executeReturn(node, sourceText);
        break;
      case 'IfStmt':
        this.executeIf(node, sourceText);
        break;
      case 'ForStmt':
      case 'WhileStmt':
      case 'DoWhileStmt':
      case 'ForEachStmt':
        this.executeLoop(node, sourceText);
        break;
      case 'ObjectCreationExpr':
      case 'ArrayCreationExpr':
        this.executeObjectCreation(node, sourceText);
        break;
      default:
        // Generic statement tracking
        break;
    }
  }

  private executeVariableDeclaration(node: AstNode, sourceText: string) {
    // Parse variable name and value from source text or AST properties
    const resolvedType = node.resolvedType || 'unknown';
    const name = this.extractVarName(sourceText);
    const value = this.extractVarValue(sourceText);

    if (name) {
      const varValue: VariableValue = {
        name,
        type: resolvedType,
        value,
        storageKind: this.inferStorageKind(resolvedType),
      };

      // Add to current scope
      if (this.callStack.length > 0) {
        this.callStack[this.callStack.length - 1].localVariables.set(name, varValue);
      } else {
        this.globalVars.set(name, varValue);
      }

      // Track DP arrays
      if (this.isDpArray(resolvedType, name)) {
        this.trackDpArray(name, resolvedType, value);
      }

      // Track collections
      if (this.isCollection(resolvedType)) {
        this.trackCollection(name, resolvedType);
      }

      // Track memo arrays
      if (this.isMemoArray(name, resolvedType)) {
        this.trackMemoArray(name, value);
      }
    }
  }

  private executeExpression(node: AstNode, sourceText: string) {
    // Check for System.out.println
    if (sourceText.includes('System.out.print')) {
      const content = this.extractPrintContent(sourceText);
      this.consoleOutput += content + (sourceText.includes('println') ? '\n' : '');
    }

    // Check for method calls that might be function invocations
    if (node.type === 'MethodCallExpr' || sourceText.includes('(')) {
      const methodName = this.extractMethodName(sourceText);
      if (methodName && this.methods.has(methodName)) {
        this.pushCallFrame(methodName, node.range?.startLine ?? 0);
      }

      // Track collection operations
      this.trackCollectionOperation(sourceText);
    }

    // Track array assignments (dp[i][j] = ...)
    this.trackDpUpdate(sourceText);
    this.trackMemoUpdate(sourceText);
  }

  private executeAssignment(node: AstNode, sourceText: string) {
    const parts = sourceText.split('=').map(s => s.trim());
    if (parts.length >= 2) {
      const name = parts[0];
      const valueStr = parts.slice(1).join('=').replace(';', '').trim();
      const value = this.parseValue(valueStr);

      // Update variable
      this.setVariable(name, value);

      // Track DP/memo updates
      this.trackDpUpdate(sourceText);
      this.trackMemoUpdate(sourceText);
    }
  }

  private executeReturn(node: AstNode, sourceText: string) {
    const valueStr = sourceText.replace('return', '').replace(';', '').trim();
    const value = this.parseValue(valueStr);

    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].returnValue = value;
      this.popCallFrame();
    }
  }

  private executeIf(node: AstNode, sourceText: string) {
    const condition = this.extractCondition(sourceText);
    // Simulate branch decision
    const result = Math.random() > 0.3; // Heuristic - could be improved with actual evaluation
    this.branchDecisions.push({
      line: node.range?.startLine ?? 0,
      condition,
      result,
      type: 'if',
    });
  }

  private executeLoop(node: AstNode, sourceText: string) {
    const condition = this.extractCondition(sourceText);
    this.branchDecisions.push({
      line: node.range?.startLine ?? 0,
      condition,
      result: true,
      type: node.type === 'ForStmt' ? 'for' : 'while',
    });
  }

  private executeObjectCreation(node: AstNode, sourceText: string) {
    const className = this.extractClassName(sourceText);
    const heapObj: HeapObjectState = {
      id: `heap-${this.heapIdCounter++}`,
      className,
      kind: this.isCollection(className) ? 'COLLECTION' : 'OBJECT',
      fields: {},
    };

    if (this.isCollection(className)) {
      heapObj.collectionKind = this.mapCollectionKind(className);
      heapObj.collectionElements = [];
    }

    this.heapObjects.push(heapObj);
  }

  // ============================================================
  // Call Stack Management
  // ============================================================

  private pushCallFrame(methodName: string, callLine: number) {
    const frame: StackFrameState = {
      id: `frame-${this.frameIdCounter++}`,
      methodName,
      className: 'Main',
      depth: this.callStack.length,
      localVariables: new Map(),
      parameters: new Map(),
      callLine,
      isActive: true,
    };

    // Deactivate previous top frame
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].isActive = false;
    }

    this.callStack.push(frame);
  }

  private popCallFrame(): StackFrameState | undefined {
    const frame = this.callStack.pop();
    if (frame) {
      frame.isActive = false;
    }
    // Reactivate new top frame
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].isActive = true;
    }
    return frame;
  }

  // ============================================================
  // Snapshot Capture & Restore
  // ============================================================

  private captureSnapshot(line: number, statement: string): ExecutionSnapshot {
    // Build variables record
    const variables: Record<string, unknown> = {};
    for (const [name, v] of this.globalVars) {
      variables[name] = v.value;
    }
    for (const frame of this.callStack) {
      for (const [name, v] of frame.localVariables) {
        variables[name] = v.value;
      }
      for (const [name, v] of frame.parameters) {
        variables[name] = v.value;
      }
    }

    return {
      stepIndex: this.snapshots.length,
      currentLine: line,
      currentStatement: statement,
      variables: { ...variables },
      callStack: this.callStack.map(f => ({
        ...f,
        localVariables: new Map(f.localVariables),
        parameters: new Map(f.parameters),
      })),
      heapObjects: this.heapObjects.map(o => ({ ...o })),
      consoleOutput: this.consoleOutput,
      dpArrays: this.dpArrays.map(d => ({
        ...d,
        values1D: d.values1D ? [...d.values1D] : undefined,
        values2D: d.values2D ? d.values2D.map(r => [...r]) : undefined,
      })),
      memoCache: {
        entries: new Map(this.memoCache.entries),
        lastAction: this.memoCache.lastAction,
        lastKey: this.memoCache.lastKey,
      },
      collections: this.collections.map(c => ({
        ...c,
        elements: [...c.elements],
      })),
      visitedLines: new Set(this.visitedLines),
      branchDecisions: [...this.branchDecisions],
    };
  }

  private restoreFromSnapshot(snapshot: ExecutionSnapshot) {
    // Restore mutable state from snapshot
    this.visitedLines = new Set(snapshot.visitedLines);
    this.branchDecisions = [...snapshot.branchDecisions];
    this.consoleOutput = snapshot.consoleOutput;
    this.dpArrays = snapshot.dpArrays.map(d => ({
      ...d,
      values1D: d.values1D ? [...d.values1D] : undefined,
      values2D: d.values2D ? d.values2D.map(r => [...r]) : undefined,
      lastChangedIndex: d.lastChangedIndex ? { ...d.lastChangedIndex } : undefined,
    }));
    this.memoCache = {
      entries: new Map(snapshot.memoCache.entries),
      lastAction: snapshot.memoCache.lastAction,
      lastKey: snapshot.memoCache.lastKey,
    };
    this.collections = snapshot.collections.map(c => ({ ...c, elements: [...c.elements] }));
    this.heapObjects = snapshot.heapObjects.map(o => ({ ...o }));

    // Restore call stack
    this.callStack = snapshot.callStack.map(f => ({
      ...f,
      localVariables: new Map(f.localVariables),
      parameters: new Map(f.parameters),
    }));

    // Restore global variables
    this.globalVars.clear();
    for (const [name, value] of Object.entries(snapshot.variables)) {
      this.globalVars.set(name, {
        name,
        type: 'unknown',
        value,
        storageKind: 'UNKNOWN',
      });
    }
  }

  // ============================================================
  // Convert to StepResult for Store Compatibility
  // ============================================================

  snapshotToStepResult(snapshot: ExecutionSnapshot): StepResult {
    const stackFrames: StackFrame[] = snapshot.callStack.map(f => ({
      id: f.id,
      methodName: f.methodName,
      className: f.className,
      depth: f.depth,
      localVariables: Array.from(f.localVariables.values()).map(v => ({
        id: `${f.id}-${v.name}`,
        name: v.name,
        type: v.type,
        storageKind: v.storageKind as any,
        parameter: false,
        field: false,
        staticField: false,
        finalVar: false,
        staticValue: v.value != null ? String(v.value) : undefined,
      })),
      isActive: f.isActive,
      virtualAddress: f.depth * 0x100 + 0x1000,
      range: { startLine: f.callLine, startColumn: 1, endLine: f.callLine, endColumn: 1 },
    }));

    // Build a memory snapshot with DP/memo arrays as heap objects
    const heapObjects: HeapObject[] = [];

    // Add DP arrays
    for (const dp of snapshot.dpArrays) {
      if (dp.dimensions === 2 && dp.values2D) {
        const rowHeapIds: string[] = [];
        for (let i = 0; i < dp.values2D.length; i++) {
          const rowId = `dp-row-${dp.name}-${i}`;
          heapObjects.push({
            id: rowId,
            className: 'int[]',
            kind: 'ARRAY',
            virtualAddress: 0x3000 + i * 0x10,
            gcEligible: false,
            referenceCount: 1,
            arrayElements: [...dp.values2D[i]],
            arrayComponentType: 'int',
            arrayLength: dp.values2D[i].length,
          });
          rowHeapIds.push(rowId);
        }
        heapObjects.push({
          id: `dp-${dp.name}`,
          className: 'int[][]',
          kind: 'ARRAY',
          virtualAddress: 0x2000,
          gcEligible: false,
          referenceCount: 1,
          arrayElements: rowHeapIds,
          arrayComponentType: 'int[]',
          arrayLength: dp.values2D.length,
        });
      } else if (dp.dimensions === 1 && dp.values1D) {
        heapObjects.push({
          id: `dp-${dp.name}`,
          className: 'int[]',
          kind: 'ARRAY',
          virtualAddress: 0x2000,
          gcEligible: false,
          referenceCount: 1,
          arrayElements: [...dp.values1D],
          arrayComponentType: 'int',
          arrayLength: dp.values1D.length,
        });
      }
    }

    const memorySnapshot: MemoryModel = {
      stackFrames,
      heapObjects,
      stringPool: [],
      staticArea: [],
      methodArea: [],
      references: [],
      gcEligibleIds: [],
    };

    // Build variable info for the top stack frame
    const topFrameVars: VariableInfo[] = [];
    if (snapshot.callStack.length > 0) {
      const topFrame = snapshot.callStack[snapshot.callStack.length - 1];
      for (const [, v] of topFrame.localVariables) {
        topFrameVars.push({
          id: `var-${v.name}`,
          name: v.name,
          type: v.type,
          storageKind: v.storageKind as any,
          parameter: false,
          field: false,
          staticField: false,
          finalVar: false,
          staticValue: v.value != null ? String(v.value) : undefined,
        });
      }
    }

    // Add DP array variables to stack frame for variable lookup
    for (const dp of snapshot.dpArrays) {
      const varInfo: VariableInfo = {
        id: `var-${dp.name}`,
        name: dp.name,
        type: dp.dimensions === 2 ? 'int[][]' : 'int[]',
        storageKind: 'ARRAY_HEAP',
        parameter: false,
        field: false,
        staticField: false,
        finalVar: false,
        heapObjectId: `dp-${dp.name}`,
      };
      topFrameVars.push(varInfo);
    }

    // Ensure the memory snapshot stack frames contain variables
    if (memorySnapshot.stackFrames.length > 0) {
      memorySnapshot.stackFrames[memorySnapshot.stackFrames.length - 1].localVariables = topFrameVars;
    } else if (topFrameVars.length > 0 || Object.keys(snapshot.variables).length > 0) {
      // Create a synthetic frame with all vars
      const allVars: VariableInfo[] = topFrameVars.length > 0 ? topFrameVars :
        Object.entries(snapshot.variables).map(([name, value]) => ({
          id: `var-${name}`,
          name,
          type: typeof value === 'number' ? 'int' : typeof value === 'string' ? 'String' : 'Object',
          storageKind: (typeof value === 'number' ? 'PRIMITIVE_STACK' : 'REFERENCE_STACK') as any,
          parameter: false,
          field: false,
          staticField: false,
          finalVar: false,
          staticValue: value != null ? String(value) : undefined,
        }));

      memorySnapshot.stackFrames.push({
        id: 'frame-main',
        methodName: 'main',
        className: 'Main',
        depth: 0,
        localVariables: allVars,
        isActive: true,
        virtualAddress: 0x1000,
      });
    }

    return {
      type: this.isFinished() ? 'FINISHED' : 'STEP_FORWARD',
      message: snapshot.currentStatement,
      currentLine: snapshot.currentLine,
      currentStatement: snapshot.currentStatement,
      variables: snapshot.variables,
      stackFrames,
      memorySnapshot,
      output: snapshot.consoleOutput,
    };
  }

  // ============================================================
  // Helper Methods
  // ============================================================

  private extractVarName(source: string): string | null {
    // Match: `Type name =` or `Type name;`
    const match = source.match(/(?:int|long|double|float|boolean|char|byte|short|String|var|\w+(?:<[^>]*>)?(?:\[\])*)\s+(\w+)\s*[=;]/);
    return match?.[1] ?? null;
  }

  private extractVarValue(source: string): unknown {
    const eqIdx = source.indexOf('=');
    if (eqIdx === -1) return undefined;
    const valueStr = source.substring(eqIdx + 1).replace(';', '').trim();
    return this.parseValue(valueStr);
  }

  private parseValue(str: string): unknown {
    if (!str) return undefined;
    str = str.trim();
    if (str === 'null') return null;
    if (str === 'true') return true;
    if (str === 'false') return false;
    if (/^-?\d+$/.test(str)) return parseInt(str, 10);
    if (/^-?\d+\.\d+f?$/.test(str)) return parseFloat(str);
    if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
    if (str.startsWith("'") && str.endsWith("'")) return str.slice(1, -1);
    // Evaluate simple arithmetic
    if (/^[\d\s+\-*/()]+$/.test(str)) {
      try { return new Function('return ' + str)(); } catch { /* ignore */ }
    }
    return str;
  }

  private extractPrintContent(source: string): string {
    const match = source.match(/println\s*\((.*)\)|print\s*\((.*)\)/);
    if (!match) return '';
    const arg = (match[1] || match[2] || '').trim();

    // Resolve variable references
    if (arg.startsWith('"') && arg.endsWith('"')) {
      // String literal
      let result = arg.slice(1, -1);
      return result;
    }

    // String concatenation
    if (arg.includes('+')) {
      const parts = arg.split('+').map(p => {
        p = p.trim();
        if (p.startsWith('"') && p.endsWith('"')) return p.slice(1, -1);
        const val = this.getVariable(p);
        return val !== undefined ? String(val) : p;
      });
      return parts.join('');
    }

    // Single variable
    const val = this.getVariable(arg);
    return val !== undefined ? String(val) : arg;
  }

  private extractMethodName(source: string): string | null {
    const match = source.match(/(\w+)\s*\(/);
    return match?.[1] ?? null;
  }

  private extractCondition(source: string): string {
    const match = source.match(/\((.*)\)/);
    return match?.[1] ?? '';
  }

  private extractClassName(source: string): string {
    const match = source.match(/new\s+(\w+(?:<[^>]*>)?)/);
    return match?.[1]?.replace(/<.*>/, '') ?? 'Object';
  }

  private setVariable(name: string, value: unknown) {
    // Check current frame first
    if (this.callStack.length > 0) {
      const frame = this.callStack[this.callStack.length - 1];
      if (frame.localVariables.has(name)) {
        const existing = frame.localVariables.get(name)!;
        frame.localVariables.set(name, { ...existing, value });
        return;
      }
    }
    // Check globals
    if (this.globalVars.has(name)) {
      const existing = this.globalVars.get(name)!;
      this.globalVars.set(name, { ...existing, value });
      return;
    }
    // Create new variable in current scope
    const v: VariableValue = { name, type: 'unknown', value, storageKind: 'UNKNOWN' };
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].localVariables.set(name, v);
    } else {
      this.globalVars.set(name, v);
    }
  }

  private getVariable(name: string): unknown {
    // Search frames top-down
    for (let i = this.callStack.length - 1; i >= 0; i--) {
      const frame = this.callStack[i];
      if (frame.localVariables.has(name)) return frame.localVariables.get(name)!.value;
      if (frame.parameters.has(name)) return frame.parameters.get(name)!.value;
    }
    if (this.globalVars.has(name)) return this.globalVars.get(name)!.value;
    return undefined;
  }

  private inferStorageKind(type: string): string {
    const primitives = new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']);
    if (primitives.has(type)) return 'PRIMITIVE_STACK';
    if (type === 'String') return 'STRING_POOL';
    if (type.includes('[]')) return 'ARRAY_HEAP';
    return 'REFERENCE_STACK';
  }

  // ============================================================
  // DP Array Tracking
  // ============================================================

  private isDpArray(type: string, name: string): boolean {
    const dpNames = new Set(['dp', 'memo', 'cache', 'table', 'grid', 'matrix', 'cost', 'f', 'opt']);
    return (type.includes('[]') && dpNames.has(name.toLowerCase())) || type.includes('[][]');
  }

  private trackDpArray(name: string, type: string, value: unknown) {
    const dimensions = (type.match(/\[\]/g) || []).length;
    const dpState: DpArrayState = {
      name,
      dimensions,
      values1D: dimensions === 1 ? (Array.isArray(value) ? value : []) : undefined,
      values2D: dimensions === 2 ? (Array.isArray(value) ? value : []) : undefined,
    };
    // Remove old entry if exists
    this.dpArrays = this.dpArrays.filter(d => d.name !== name);
    this.dpArrays.push(dpState);
  }

  private trackDpUpdate(source: string) {
    // Match dp[i][j] = value or dp[i] = value
    const match2D = source.match(/(\w+)\s*\[\s*(\d+)\s*\]\s*\[\s*(\d+)\s*\]\s*=\s*(.+)/);
    if (match2D) {
      const [, name, rowStr, colStr, valStr] = match2D;
      const dp = this.dpArrays.find(d => d.name === name);
      if (dp && dp.dimensions === 2) {
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);
        const val = this.parseValue(valStr.replace(';', ''));
        if (!dp.values2D) dp.values2D = [];
        while (dp.values2D.length <= row) dp.values2D.push([]);
        while (dp.values2D[row].length <= col) dp.values2D[row].push(0);
        dp.values2D[row][col] = val;
        dp.lastChangedIndex = { row, col };
      }
      return;
    }

    const match1D = source.match(/(\w+)\s*\[\s*(\d+)\s*\]\s*=\s*(.+)/);
    if (match1D) {
      const [, name, idxStr, valStr] = match1D;
      const dp = this.dpArrays.find(d => d.name === name);
      if (dp && dp.dimensions === 1) {
        const idx = parseInt(idxStr, 10);
        const val = this.parseValue(valStr.replace(';', ''));
        if (!dp.values1D) dp.values1D = [];
        while (dp.values1D.length <= idx) dp.values1D.push(0);
        dp.values1D[idx] = val;
        dp.lastChangedIndex = { index: idx };
      }
    }
  }

  // ============================================================
  // Memoization Tracking
  // ============================================================

  private isMemoArray(name: string, type: string): boolean {
    const memoNames = new Set(['memo', 'cache', 'dp', 'mem', 'seen', 'visited']);
    return type.includes('[]') && memoNames.has(name.toLowerCase());
  }

  private trackMemoArray(name: string, value: unknown) {
    // Initialize or update memo cache entries
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v !== undefined && v !== null && v !== 0 && v !== -1) {
          this.memoCache.entries.set(String(i), { value: v, hitCount: 0 });
        }
      });
    }
  }

  private trackMemoUpdate(source: string) {
    // Match memo[key] = value
    const match = source.match(/(?:memo|cache|dp|mem)\s*\[\s*(.+?)\s*\]\s*=\s*(.+)/);
    if (match) {
      const key = match[1].trim();
      const valStr = match[2].replace(';', '').trim();
      const value = this.parseValue(valStr);

      if (this.memoCache.entries.has(key)) {
        const entry = this.memoCache.entries.get(key)!;
        entry.hitCount++;
        this.memoCache.lastAction = 'hit';
      } else {
        this.memoCache.entries.set(key, { value, hitCount: 0 });
        this.memoCache.lastAction = 'store';
      }
      this.memoCache.lastKey = key;
    }

    // Match memo[key] lookups (reads)
    const readMatch = source.match(/(?:memo|cache|dp|mem)\s*\[\s*(.+?)\s*\]/);
    if (readMatch && !match) {
      const key = readMatch[1].trim();
      if (this.memoCache.entries.has(key)) {
        this.memoCache.lastAction = 'hit';
        this.memoCache.entries.get(key)!.hitCount++;
      } else {
        this.memoCache.lastAction = 'miss';
      }
      this.memoCache.lastKey = key;
    }
  }

  // ============================================================
  // Collection Tracking
  // ============================================================

  private isCollection(type: string): boolean {
    const collTypes = new Set([
      'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap',
      'TreeSet', 'LinkedHashMap', 'LinkedHashSet', 'PriorityQueue',
      'ArrayDeque', 'Stack', 'Vector', 'Queue', 'Deque', 'List', 'Set', 'Map',
    ]);
    return collTypes.has(type.replace(/<.*>/, ''));
  }

  private mapCollectionKind(className: string): string {
    const base = className.replace(/<.*>/, '');
    const map: Record<string, string> = {
      ArrayList: 'ARRAY_LIST', LinkedList: 'LINKED_LIST',
      HashMap: 'HASH_MAP', HashSet: 'HASH_SET',
      TreeMap: 'TREE_MAP', TreeSet: 'TREE_SET',
      LinkedHashMap: 'LINKED_HASH_MAP', LinkedHashSet: 'LINKED_HASH_SET',
      PriorityQueue: 'PRIORITY_QUEUE', ArrayDeque: 'ARRAY_DEQUE',
      Stack: 'STACK', Vector: 'VECTOR',
    };
    return map[base] ?? 'NONE';
  }

  private trackCollection(name: string, type: string) {
    this.collections = this.collections.filter(c => c.name !== name);
    this.collections.push({
      name,
      type: type.replace(/<.*>/, ''),
      elements: [],
    });
  }

  private trackCollectionOperation(source: string) {
    // Match: list.add(x), map.put(k, v), set.add(x), stack.push(x), queue.offer(x)
    const addMatch = source.match(/(\w+)\.(add|push|offer|put|enqueue)\s*\((.+)\)/);
    if (addMatch) {
      const [, varName, op, args] = addMatch;
      const coll = this.collections.find(c => c.name === varName);
      if (coll) {
        const val = this.parseValue(args.split(',')[0].trim());
        coll.elements.push(val);
        coll.lastOperation = op;
        coll.lastOperationIndex = coll.elements.length - 1;
      }
    }

    // Match: list.remove(), stack.pop(), queue.poll()
    const removeMatch = source.match(/(\w+)\.(remove|pop|poll|dequeue)\s*\(/);
    if (removeMatch) {
      const [, varName, op] = removeMatch;
      const coll = this.collections.find(c => c.name === varName);
      if (coll && coll.elements.length > 0) {
        if (op === 'pop' || op === 'poll' || op === 'dequeue') {
          coll.elements.shift();
        } else {
          coll.elements.pop();
        }
        coll.lastOperation = op;
        coll.lastOperationIndex = 0;
      }
    }
  }
}

// Singleton instance
export const executionEngine = new FrontendExecutionEngine();
