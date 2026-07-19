import { describe, expect, it } from 'vitest';
import { FrontendExecutionEngine } from './executionEngine';
import { createLoopAnalysis } from '../test/analysisFixtures';

describe('FrontendExecutionEngine', () => {
  it('emits one snapshot for each numeric for-loop iteration', async () => {
    const engine = new FrontendExecutionEngine();
    engine.init(createLoopAnalysis(), new Set());

    await engine.run();

    const loopSnapshots = engine.getSnapshots().filter(snapshot => snapshot.currentLine === 6);
    expect(loopSnapshots).toHaveLength(3);
    expect(loopSnapshots.map(snapshot => snapshot.variables.i)).toEqual([0, 1, 2]);
    expect(loopSnapshots.map(snapshot => snapshot.consoleOutput.trim())).toEqual(['0', '0\n1', '0\n1\n3']);
  });

  it('tracks dynamic-programming array writes with the evaluated loop index', async () => {
    const analysis = createLoopAnalysis();
    analysis.sourceCode = analysis.sourceCode
      .replace('int sum = 0;', 'int[] dp = new int[3];')
      .replace('sum += i;', 'dp[i] = i + 1;')
      .replace('System.out.println(sum);', 'System.out.println(dp[i]);');
    const body = analysis.astRoot!.children![0].children![0].children![0];
    body.children![0].sourceText = 'int[] dp = new int[3];';
    body.children![0].children![0].sourceText = 'int[] dp = new int[3];';
    const loopBody = body.children![1].children!.find(child => child.type === 'BlockStmt')!;
    loopBody.children![0].sourceText = 'dp[i] = i + 1;';
    loopBody.children![1].sourceText = 'System.out.println(dp[i]);';

    const engine = new FrontendExecutionEngine();
    engine.init(analysis, new Set());
    await engine.run();

    const writes = engine.getSnapshots().filter(snapshot => snapshot.currentLine === 5);
    expect(writes.map(snapshot => snapshot.dpArrays[0]?.values1D)).toEqual([[1, 0, 0], [1, 2, 0], [1, 2, 3]]);
    expect(writes.at(-1)?.dpArrays[0]?.lastChangedIndex).toEqual({ index: 2 });
  });

  it('captures nested recursive calls and their returned values', async () => {
    const sourceCode = `public class Main {
  static int fib(int n) { if (n <= 1) return n; return fib(n - 1) + fib(n - 2); }
  public static void main(String[] args) { Main solver = new Main(); System.out.println(solver.fib(3)); }
}`;
    const parameter = { id: 'parameter', type: 'Parameter', label: 'int n', sourceText: 'int n', range: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 } };
    const returnBase = { id: 'return-base', type: 'ReturnStmt', label: 'return n', sourceText: 'return n;', range: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 } };
    const fib = { id: 'fib', type: 'MethodDeclaration', label: 'fib', range: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 }, children: [parameter, { id: 'fib-body', type: 'BlockStmt', label: 'body', children: [{ id: 'if', type: 'IfStmt', label: 'if', sourceText: 'if (n <= 1)', children: [{ id: 'condition', type: 'Condition', label: 'n <= 1', sourceText: 'n <= 1' }, returnBase] }, { id: 'return-recurse', type: 'ReturnStmt', label: 'return fib', sourceText: 'return fib(n - 1) + fib(n - 2);', range: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 1 } }] }] };
    const main = { id: 'main', type: 'MethodDeclaration', label: 'main', range: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 1 }, children: [{ id: 'main-body', type: 'BlockStmt', label: 'body', children: [{ id: 'print', type: 'ExpressionStmt', label: 'print', sourceText: 'System.out.println(solver.fib(3));', range: { startLine: 3, startColumn: 1, endLine: 3, endColumn: 1 } }] }] };
    const analysis = createLoopAnalysis();
    analysis.sourceCode = sourceCode;
    analysis.astRoot = { id: 'root', type: 'CompilationUnit', label: 'root', children: [{ id: 'class', type: 'ClassDeclaration', label: 'Main', children: [fib, main] }] };

    const engine = new FrontendExecutionEngine();
    engine.init(analysis, new Set());
    await engine.run();

    expect(engine.getSnapshots().some(snapshot => snapshot.callStack.length >= 3)).toBe(true);
    expect(engine.getSnapshots().at(-1)?.consoleOutput.trim()).toBe('2');
  });

  it('runs backend-shaped method signatures and keeps loop, DP, and collection snapshots', async () => {
    const analysis = createLoopAnalysis();
    analysis.sourceCode = `import java.util.ArrayList;
import java.util.List;
public class Main {
  static int fib(int n) { if (n <= 1) return n; return fib(n - 1) + fib(n - 2); }
  public static void main(String[] args) {
    int[] dp = new int[2];
    int[] memo = new int[2];
    List<Integer> values = new ArrayList<>();
    for (int i = 0; i < 2; i++) { dp[i] = i + 1; memo[i] = dp[i]; values.add(dp[i]); }
    System.out.println(fib(2));
  }
}`;
    const line = (startLine: number) => ({ startLine, startColumn: 1, endLine: startLine, endColumn: 1 });
    const loop = {
      id: 'real-loop', type: 'ForStmt', label: 'for (int i = 0; i < 2; i++)', sourceText: 'for (int i = 0; i < 2; i++)', range: line(8), children: [
        { id: 'init', type: 'ForInit', label: 'init: [int i = 0]', sourceText: 'for (int i = 0; i < 2; i++) { dp[i] = i + 1; }', range: line(8) },
        { id: 'condition', type: 'ForCondition', label: 'i < 2', sourceText: 'i < 2', range: line(8) },
        { id: 'update', type: 'ForUpdate', label: 'update: [i++]', sourceText: 'for (int i = 0; i < 2; i++) { dp[i] = i + 1; }', range: line(8) },
        { id: 'body', type: 'BlockStmt', label: 'block', children: [
          { id: 'dp-write', type: 'ExpressionStmt', label: 'dp[i] = i + 1;', sourceText: 'dp[i] = i + 1;', range: line(8) },
          { id: 'memo-write', type: 'ExpressionStmt', label: 'memo[i] = dp[i];', sourceText: 'memo[i] = dp[i];', range: line(8) },
          { id: 'list-add', type: 'ExpressionStmt', label: 'values.add(dp[i]);', sourceText: 'values.add(dp[i]);', range: line(8) },
        ], range: line(8) },
      ],
    };
    analysis.astRoot = {
      id: 'root', type: 'CompilationUnit', label: 'Compilation Unit', children: [{
        id: 'class', type: 'ClassDeclaration', label: 'class Main', children: [
          { id: 'fib', type: 'MethodDeclaration', label: 'int fib(int n)', sourceText: 'static int fib(int n) {}', range: line(4), children: [{ id: 'fib-body', type: 'BlockStmt', label: 'body', children: [{ id: 'return', type: 'ReturnStmt', label: 'return', sourceText: 'return n;', range: line(4) }] }] },
          { id: 'main', type: 'MethodDeclaration', label: 'void main(String[] args)', sourceText: 'public static void main(String[] args) {}', range: line(5), children: [{ id: 'main-body', type: 'BlockStmt', label: 'body', children: [
            { id: 'dp', type: 'VariableDeclaration', label: 'int[] dp', sourceText: 'int[] dp = new int[2];', range: line(6) },
            { id: 'memo', type: 'VariableDeclaration', label: 'int[] memo', sourceText: 'int[] memo = new int[2];', range: line(7) },
            { id: 'values', type: 'VariableDeclaration', label: 'List<Integer> values', sourceText: 'List<Integer> values = new ArrayList<>();', range: line(7) },
            loop,
            { id: 'print', type: 'ExpressionStmt', label: 'print', sourceText: 'System.out.println(fib(2));', range: line(9) },
          ] }] },
        ],
      }],
    };

    const engine = new FrontendExecutionEngine();
    engine.init(analysis, new Set());
    await engine.run();

    const snapshots = engine.getSnapshots();
    expect(snapshots.some(snapshot => snapshot.dpArrays.some(array => array.name === 'dp' && array.values1D?.[1] === 2))).toBe(true);
    expect(snapshots.some(snapshot => snapshot.memoCache.entries.get('1')?.value === 2)).toBe(true);
    expect(snapshots.some(snapshot => snapshot.collections.find(collection => collection.name === 'values')?.elements.length === 2)).toBe(true);
  });

  it('evaluates indented backend statement text instead of leaving DP cells at zero', async () => {
    const analysis = createLoopAnalysis();
    const loopBody = analysis.astRoot!.children![0].children![0].children![0].children![1].children!
      .find(child => child.type === 'BlockStmt')!;
    loopBody.children![0].sourceText = '      sum += i;';
    loopBody.children![1].sourceText = '      dp[i] = i + 1;';
    loopBody.children![1].label = 'dp[i] = i + 1;';
    analysis.sourceCode = analysis.sourceCode
      .replace('int sum = 0;', 'int[] dp = new int[3];')
      .replace('sum += i;', 'dp[i] = i + 1;')
      .replace('System.out.println(sum);', 'System.out.println(dp[i]);');
    const body = analysis.astRoot!.children![0].children![0].children![0];
    body.children![0].sourceText = '    int[] dp = new int[3];';

    const engine = new FrontendExecutionEngine();
    engine.init(analysis, new Set());
    await engine.run();

    expect(engine.getSnapshots().at(-1)?.dpArrays.find(array => array.name === 'dp')?.values1D).toEqual([1, 2, 3]);
  });

  it('fills a 2D coin-change table from parser-shaped expression declarations', async () => {
    const line = (startLine: number) => ({ startLine, startColumn: 1, endLine: startLine, endColumn: 1 });
    const declaration = (id: string, sourceText: string, startLine: number) => ({
      id, type: 'ExpressionStmt', label: sourceText, sourceText, range: line(startLine),
      children: [{ id: `${id}-decl`, type: 'VariableDeclaration', label: sourceText.replace(';', ''), sourceText: sourceText.replace(';', ''), range: line(startLine) }],
    });
    const assignment = (id: string, sourceText: string, startLine: number) => ({ id, type: 'ExpressionStmt', label: sourceText, sourceText, range: line(startLine) });
    const loop = (id: string, init: string, condition: string, update: string, children: object[], startLine: number) => ({
      id, type: 'ForStmt', label: 'for (...)', sourceText: `for (${init}; ${condition}; ${update})`, range: line(startLine), children: [
        { id: `${id}-init`, type: 'ForInit', label: `init: [${init}]`, sourceText: '', range: line(startLine) },
        { id: `${id}-condition`, type: 'ForCondition', label: `condition: ${condition}`, sourceText: condition, range: line(startLine) },
        { id: `${id}-update`, type: 'ForUpdate', label: `update: [${update}]`, sourceText: '', range: line(startLine) },
        { id: `${id}-body`, type: 'BlockStmt', label: 'body: { Block }', sourceText: '', range: line(startLine), children },
      ],
    });
    const conditional = {
      id: 'if', type: 'IfStmt', label: 'if', sourceText: 'if (coins[i - 1] <= j)', range: line(8), children: [
        { id: 'condition', type: 'Condition', label: 'coins[i - 1] <= j', sourceText: 'coins[i - 1] <= j', range: line(8) },
        { id: 'then', type: 'BlockStmt', label: 'then: { Block }', sourceText: '', range: line(8), children: [assignment('take', 'dp[i][j] = dp[i][j - coins[i - 1]] + // take coin\n dp[i - 1][j];', 8)] },
        { id: 'else', type: 'BlockStmt', label: 'else: { Block }', sourceText: '', range: line(9), children: [assignment('skip', 'dp[i][j] = dp[i - 1][j];', 9)] },
      ],
    };
    const method = {
      id: 'change', type: 'MethodDeclaration', label: 'change', sourceText: 'int change(int amount, int[] coins) {}', range: line(2), children: [
        { id: 'amount-parameter', type: 'Parameter', label: 'int amount', sourceText: 'int amount', range: line(2) },
        { id: 'coins-parameter', type: 'Parameter', label: 'int[] coins', sourceText: 'int[] coins', range: line(2) },
        { id: 'change-body', type: 'BlockStmt', label: 'body', sourceText: '', children: [
          declaration('n', 'int n = coins.length;', 3), declaration('dp', 'int[][] dp = new int[n + 1][amount + 1];', 4),
          loop('base', 'int i = 0', 'i <= n', 'i++', [assignment('base-write', 'dp[i][0] = 1;', 5)], 5),
          loop('outer', 'int i = 1', 'i <= n', 'i++', [loop('inner', 'int j = 1', 'j <= amount', 'j++', [conditional], 7)], 7),
          { id: 'return', type: 'ReturnStmt', label: 'return dp[n][amount]', sourceText: 'return dp[n][amount];', range: line(11) },
        ] },
      ],
    };
    const main = {
      id: 'main', type: 'MethodDeclaration', label: 'main', sourceText: 'void main(String[] args) {}', range: line(13), children: [{ id: 'main-body', type: 'BlockStmt', label: 'body', children: [
        declaration('coins', 'int[] coins = {1, 2, 5};', 14), declaration('amount', 'int amount = 5;', 15),
        declaration('solver', 'Main solver = new Main();', 16), declaration('answer', 'int answer = change(amount, coins);', 17),
      ] }],
    };
    const analysis = createLoopAnalysis();
    analysis.astRoot = { id: 'root', type: 'CompilationUnit', label: 'root', children: [{ id: 'class', type: 'ClassDeclaration', label: 'Main', children: [method, main] }] } as any;

    const engine = new FrontendExecutionEngine();
    engine.init(analysis, new Set());
    await engine.run();

    expect(engine.getSnapshots().at(-1)?.dpArrays.find(array => array.name === 'dp')?.values2D?.[3]?.[5]).toBe(4);
    expect(engine.getSnapshots().at(-1)?.variables.answer).toBe(4);
  });
});
