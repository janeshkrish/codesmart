// ============================================================
// CodeSmart Frontend Type Definitions
// Mirrors the backend domain model exactly
// ============================================================

export interface SourceRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  startOffset?: number;
  endOffset?: number;
}

export interface DiagnosticInfo {
  id: string;
  severity: 'ERROR' | 'WARNING' | 'INFO' | 'HINT';
  rawMessage: string;
  humanMessage: string;
  suggestion?: string;
  range?: SourceRange;
  code?: string;
}

export interface AstNode {
  id: string;
  type: string;
  label: string;
  sourceText?: string;
  range?: SourceRange;
  resolvedType?: string;
  scopeId?: string;
  children?: AstNode[];
  properties?: Record<string, unknown>;
  hasError?: boolean;
  errorMessage?: string;
  memoryRefId?: string;
  explanation?: string;
}

export interface ScopeInfo {
  id: string;
  name: string;
  type: ScopeType;
  parentScopeId?: string;
  childScopeIds: string[];
  range?: SourceRange;
  variables: VariableInfo[];
  methodIds: string[];
  depth: number;
  color: string;
}

export type ScopeType =
  | 'COMPILATION_UNIT' | 'CLASS' | 'INTERFACE' | 'METHOD'
  | 'CONSTRUCTOR' | 'BLOCK' | 'FOR_STMT' | 'WHILE_STMT'
  | 'DO_STMT' | 'TRY_STMT' | 'CATCH_CLAUSE' | 'LAMBDA' | 'SWITCH';

export type StorageKind =
  | 'PRIMITIVE_STACK' | 'REFERENCE_STACK' | 'STATIC_AREA'
  | 'STRING_POOL' | 'ARRAY_HEAP' | 'UNKNOWN';

export interface VariableInfo {
  id: string;
  name: string;
  type: string;
  resolvedType?: string;
  storageKind: StorageKind;
  scopeId?: string;
  declarationRange?: SourceRange;
  initializerRange?: SourceRange;
  staticValue?: string;
  parameter: boolean;
  field: boolean;
  staticField: boolean;
  finalVar: boolean;
  memoryLocationId?: string;
  heapObjectId?: string;
  explanation?: string;
}

export interface MethodInfo {
  id: string;
  name: string;
  returnType: string;
  resolvedReturnType?: string;
  parameters: VariableInfo[];
  modifiers: string[];
  owningClassId?: string;
  scopeId?: string;
  range?: SourceRange;
  bodyRange?: SourceRange;
  isConstructor: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  isOverride: boolean;
  thrownExceptions?: string[];
  calledMethodIds: string[];
  explanation?: string;
  isRecursive: boolean;
  cyclomaticComplexity: number;
}

export interface ClassInfo {
  id: string;
  name: string;
  fullyQualifiedName: string;
  kind: 'CLASS' | 'INTERFACE' | 'ABSTRACT_CLASS' | 'ENUM' | 'RECORD' | 'ANNOTATION';
  modifiers: string[];
  superclassId?: string;
  superclassName?: string;
  interfaceIds?: string[];
  interfaceNames?: string[];
  fields: VariableInfo[];
  methodIds: string[];
  innerClassIds?: string[];
  scopeId?: string;
  range?: SourceRange;
  explanation?: string;
  isGeneric: boolean;
  typeParameters?: string[];
}

export interface ImportInfo {
  id: string;
  importDeclaration: string;
  isStatic: boolean;
  isAsterisk: boolean;
  range?: SourceRange;
}

export interface SymbolTable {
  variables: Record<string, VariableInfo>;
  methods: Record<string, MethodInfo>;
  classes: Record<string, ClassInfo>;
  imports: ImportInfo[];
  packageName?: string;
}

// ============================================================
// Memory Model
// ============================================================

export interface StackFrame {
  id: string;
  methodName: string;
  className?: string;
  signature?: string;
  depth: number;
  localVariables: VariableInfo[];
  returnValue?: VariableInfo;
  range?: SourceRange;
  isActive: boolean;
  virtualAddress: number;
}

export type HeapObjectKind = 'OBJECT' | 'ARRAY' | 'STRING' | 'WRAPPER' | 'COLLECTION' | 'MAP' | 'LAMBDA' | 'ANONYMOUS_CLASS';
export type CollectionKind =
  | 'ARRAY_LIST' | 'LINKED_LIST' | 'HASH_MAP' | 'HASH_SET' | 'TREE_MAP'
  | 'TREE_SET' | 'LINKED_HASH_MAP' | 'LINKED_HASH_SET' | 'PRIORITY_QUEUE'
  | 'ARRAY_DEQUE' | 'STACK' | 'VECTOR' | 'HASHTABLE' | 'NONE';

export interface HeapObject {
  id: string;
  className: string;
  fullyQualifiedClassName?: string;
  kind: HeapObjectKind;
  fields?: Record<string, unknown>;
  fieldTypes?: Record<string, string>;
  fieldRefs?: Record<string, string>;
  virtualAddress: number;
  allocationRange?: SourceRange;
  gcEligible: boolean;
  referenceCount: number;
  arrayElements?: unknown[];
  arrayComponentType?: string;
  arrayLength?: number;
  stringValue?: string;
  collectionKind?: CollectionKind;
  collectionInternalState?: unknown;
}

export interface StringPoolEntry {
  id: string;
  value: string;
  virtualAddress: number;
  referenceCount: number;
}

export interface StaticAreaEntry {
  id: string;
  className?: string;
  fieldName: string;
  type: string;
  value?: unknown;
  heapObjectId?: string;
  virtualAddress: number;
}

export interface MethodAreaEntry {
  id: string;
  className: string;
  fullyQualifiedName?: string;
  methodSignatures?: string[];
  fieldSignatures?: string[];
  virtualAddress: number;
}

export type ReferenceType = 'STACK_TO_HEAP' | 'FIELD_TO_HEAP' | 'ARRAY_ELEMENT' | 'STATIC_TO_HEAP';

export interface MemoryReference {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  type: ReferenceType;
}

export interface MemoryModel {
  stackFrames: StackFrame[];
  heapObjects: HeapObject[];
  stringPool: StringPoolEntry[];
  staticArea: StaticAreaEntry[];
  methodArea: MethodAreaEntry[];
  references: MemoryReference[];
  gcEligibleIds: string[];
}

// ============================================================
// Control Flow Graph
// ============================================================

export type CfgNodeType =
  | 'START' | 'END' | 'STATEMENT' | 'DECISION'
  | 'LOOP_INIT' | 'LOOP_CONDITION' | 'LOOP_UPDATE' | 'LOOP_BODY'
  | 'DO_WHILE_BODY' | 'SWITCH_HEADER' | 'CASE_LABEL'
  | 'TRY_BLOCK' | 'CATCH_BLOCK' | 'FINALLY_BLOCK'
  | 'THROW' | 'RETURN' | 'METHOD_CALL';

export type EdgeLabel = 'TRUE' | 'FALSE' | 'NORMAL' | 'BACK_EDGE' | 'EXCEPTION' | 'DEFAULT';

export interface CfgNode {
  id: string;
  type: CfgNodeType;
  label: string;
  sourceText?: string;
  range?: SourceRange;
  isEntry?: boolean;
  isExit?: boolean;
  condition?: string;
  loopVar?: string;
  loopInit?: string;
  loopCondition?: string;
  loopUpdate?: string;
}

export interface CfgEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: EdgeLabel;
  isBackEdge?: boolean;
}

export interface ControlFlowGraph {
  methodId: string;
  methodName: string;
  nodes: CfgNode[];
  edges: CfgEdge[];
}

// ============================================================
// Call Graph
// ============================================================

export interface CallGraphNode {
  id: string;
  methodName: string;
  className?: string;
  signature?: string;
  range?: SourceRange;
  isEntry?: boolean;
  isRecursive?: boolean;
  isExternal?: boolean;
}

export interface CallGraphEdge {
  id: string;
  callerId: string;
  calleeId: string;
  callSiteRange?: SourceRange;
  isRecursiveCall?: boolean;
  argumentTypes?: string[];
}

export interface CallGraph {
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
}

// ============================================================
// Class Diagram
// ============================================================

export type RelationshipType =
  | 'INHERITANCE' | 'IMPLEMENTATION' | 'COMPOSITION'
  | 'AGGREGATION' | 'DEPENDENCY' | 'ASSOCIATION' | 'REALIZATION';

export interface ClassDiagramNode {
  id: string;
  name: string;
  fullyQualifiedName?: string;
  kind: ClassInfo['kind'];
  fields?: string[];
  methods?: string[];
  typeParameters?: string[];
}

export interface ClassDiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  label?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
}

export interface ClassDiagram {
  classes: ClassDiagramNode[];
  relationships: ClassDiagramEdge[];
}

// ============================================================
// Stream Pipeline
// ============================================================

export type StageType =
  | 'SOURCE' | 'FILTER' | 'MAP' | 'FLAT_MAP' | 'DISTINCT'
  | 'SORTED' | 'PEEK' | 'LIMIT' | 'SKIP' | 'COLLECT'
  | 'FOR_EACH' | 'REDUCE' | 'COUNT' | 'ANY_MATCH' | 'ALL_MATCH'
  | 'FIND_FIRST' | 'MIN' | 'MAX' | 'TO_LIST';

export interface StreamStage {
  id: string;
  type: StageType;
  label: string;
  operationCode?: string;
  range?: SourceRange;
  inputType?: string;
  outputType?: string;
}

export interface StreamPipeline {
  id: string;
  range?: SourceRange;
  stages: StreamStage[];
}

// ============================================================
// Collection Usage
// ============================================================

export interface CollectionUsage {
  id: string;
  variableId: string;
  variableName: string;
  collectionKind: CollectionKind;
  elementType?: string;
  keyType?: string;
  valueType?: string;
  declarationRange?: SourceRange;
}

// ============================================================
// Thread Model
// ============================================================

export type ThreadState = 'NEW' | 'RUNNABLE' | 'BLOCKED' | 'WAITING' | 'TIMED_WAITING' | 'TERMINATED';

export interface ThreadModel {
  id: string;
  name: string;
  state: ThreadState;
  declarationRange?: SourceRange;
  synchronizedOnIds?: string[];
  lockedMonitorIds?: string[];
  isVirtual?: boolean;
}

// ============================================================
// Complete Analysis Result
// ============================================================

export interface AnalysisResult {
  analysisId: string;
  timestamp: number;
  sourceCode: string;
  parseSuccess: boolean;
  diagnostics: DiagnosticInfo[];
  astRoot?: AstNode;
  scopes: ScopeInfo[];
  symbolTable: SymbolTable;
  memoryModel: MemoryModel;
  callGraph: CallGraph;
  classDiagram: ClassDiagram;
  controlFlowGraphs: Record<string, ControlFlowGraph>;
  streamPipelines: StreamPipeline[];
  collectionUsages: CollectionUsage[];
  explanations?: Record<string, string>;
  threadModels?: ThreadModel[];
}

// ============================================================
// Execution Types
// ============================================================

export type StepType = 'STEP_FORWARD' | 'STEP_BACKWARD' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'AT_START' | 'ERROR';

export interface StepResult {
  type: StepType;
  message: string;
  currentLine?: number;
  currentStatement?: string;
  variables?: Record<string, unknown>;
  stackFrames?: StackFrame[];
  memorySnapshot?: MemoryModel;
  output?: string;
  exitCode?: number;
  diagnostics?: DiagnosticInfo[];
}

// ============================================================
// IDE UI State Types
// ============================================================

export type VisualizationTab =
  | 'memory' | 'ast' | 'flowchart' | 'callgraph'
  | 'classdiagram' | 'collections' | 'streams' | 'scope' | 'threads';

export type BottomTab = 'symtable' | 'problems' | 'explanation' | 'debugger' | 'search';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileNode[];
  isOpen?: boolean;
}
