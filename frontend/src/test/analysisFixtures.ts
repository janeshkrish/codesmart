import type { AnalysisResult, AstNode } from '../types';

const range = (line: number) => ({ startLine: line, startColumn: 1, endLine: line, endColumn: 1 });

function node(type: string, label: string, line: number, children: AstNode[] = [], sourceText?: string): AstNode {
  return { id: `${type}-${line}-${label}`, type, label, sourceText, range: range(line), children };
}

export function createLoopAnalysis(): AnalysisResult {
  const sourceCode = `public class Main {
  public static void main(String[] args) {
    int sum = 0;
    for (int i = 0; i < 3; i++) {
      sum += i;
      System.out.println(sum);
    }
  }
}`;

  const loop = node('ForStmt', 'for (...)', 4, [
    node('ForInit', 'int i = 0', 4, [], 'int i = 0'),
    node('ForCondition', 'i < 3', 4, [], 'i < 3'),
    node('ForUpdate', 'i++', 4, [], 'i++'),
    node('BlockStmt', 'loop body', 4, [
      node('ExpressionStmt', 'sum += i;', 5, [node('AssignExpr', 'sum += i', 5, [], 'sum += i')], 'sum += i;'),
      node('ExpressionStmt', 'System.out.println(sum);', 6, [node('MethodCallExpr', 'System.out.println(sum)', 6, [], 'System.out.println(sum)')], 'System.out.println(sum);'),
    ]),
  ], 'for (int i = 0; i < 3; i++) {');

  return {
    analysisId: 'loop-fixture', timestamp: 0, sourceCode, parseSuccess: true, diagnostics: [],
    astRoot: node('CompilationUnit', 'Compilation Unit', 1, [
      node('ClassDeclaration', 'Main', 1, [
        node('MethodDeclaration', 'main', 2, [node('BlockStmt', 'body', 2, [
          node('ExpressionStmt', 'int sum = 0;', 3, [node('VariableDeclaration', 'int sum = 0', 3, [], 'int sum = 0')], 'int sum = 0;'),
          loop,
        ])]),
      ]),
    ]),
    scopes: [], symbolTable: { variables: {}, methods: {}, classes: {}, imports: [] },
    memoryModel: { stackFrames: [], heapObjects: [], stringPool: [], staticArea: [], methodArea: [], references: [], gcEligibleIds: [] },
    callGraph: { nodes: [], edges: [] }, classDiagram: { classes: [], relationships: [] },
    controlFlowGraphs: {}, streamPipelines: [], collectionUsages: [],
  };
}
