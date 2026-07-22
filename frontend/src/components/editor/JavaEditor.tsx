import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import MonacoEditor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as MonacoTypes from 'monaco-editor';
import { useIdeStore } from '../../store/ideStore';
import { organizeJavaImports, replaceIdentifier } from '../../utils/javaEditorCommands';

export function JavaEditor() {
  const {
    sourceCode, setSourceCode, setCursorPosition,
    analysisResult, highlightedRange, activeFile,
    breakpoints, toggleBreakpoint, currentExecutionLine,
    isExecuting,
  } = useIdeStore();

  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Separate decoration collections for different types
  const executionDecorationsRef = useRef<string[]>([]);
  const diagnosticDecorationsRef = useRef<string[]>([]);
  const breakpointDecorationsRef = useRef<string[]>([]);
  const scopeDecorationsRef = useRef<string[]>([]);
  const highlightDecorationsRef = useRef<string[]>([]);

  const clearDecorations = useCallback((editor: MonacoTypes.editor.IStandaloneCodeEditor, ref: React.RefObject<string[]>) => {
    if (ref.current.length > 0) {
      ref.current = editor.deltaDecorations(ref.current, []);
    }
  }, []);

  const setDecorations = useCallback((editor: MonacoTypes.editor.IStandaloneCodeEditor, ref: React.RefObject<string[]>, decorations: MonacoTypes.editor.IModelDeltaDecoration[]) => {
    ref.current = editor.deltaDecorations(ref.current, decorations);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.register({ id: 'java' });

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        if (e.target.position) {
          const file = useIdeStore.getState().activeFile?.path || 'Main.java';
          useIdeStore.getState().toggleBreakpoint(file, e.target.position.lineNumber);
        }
      }
    });

    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontLigatures: true,
      lineHeight: 22,
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      smoothScrolling: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      renderLineHighlight: 'all',
      glyphMargin: true,
      padding: { top: 8, bottom: 8 },
      wordWrap: 'off',
      folding: true,
      foldingHighlight: true,
      showFoldingControls: 'mouseover',
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showMethods: true,
        showVariables: true,
      },
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
    });

    registerJavaCompletions(monaco);
    registerJavaHoverProvider(monaco, editorRef, monacoRef);

    editor.addAction({
      id: 'codesmart.save-java-file', label: 'CodeSmart: Save Java File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: async () => {
        const state = useIdeStore.getState();
        const saved = await window.electronAPI?.saveJavaFile({ 
          path: state.activeFile?.path.startsWith('/') ? undefined : state.activeFile?.path, 
          content: state.sourceCode 
        });
        if (saved) state.setActiveFile({ id: saved.path, name: saved.name, path: saved.path, type: 'file', language: 'java' });
      },
    });

    editor.addAction({
      id: 'codesmart.format-java-document',
      label: 'CodeSmart: Format Java Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: () => editor.getAction('editor.action.formatDocument')?.run(),
    });

    editor.addAction({
      id: 'codesmart.go-to-line',
      label: 'CodeSmart: Go to Line',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      run: () => editor.getAction('editor.action.gotoLine')?.run(),
    });

    editor.addAction({
      id: 'codesmart.find-in-file',
      label: 'CodeSmart: Find in File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => editor.getAction('actions.find')?.run(),
    });

    editor.addAction({
      id: 'codesmart.find-in-project',
      label: 'CodeSmart: Find in Project',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => useIdeStore.getState().setActiveBottomTab('search'),
    });

    editor.addAction({
      id: 'codesmart.organize-java-imports',
      label: 'CodeSmart: Organize Java Imports',
      run: () => replaceEditorContents(editor, organizeJavaImports(editor.getValue())),
    });

    editor.addAction({
      id: 'codesmart.rename-java-identifier',
      label: 'CodeSmart: Rename Identifier in File',
      keybindings: [monaco.KeyCode.F2],
      run: () => {
        const position = editor.getPosition();
        const word = position ? editor.getModel()?.getWordAtPosition(position)?.word : undefined;
        if (!word) return;
        const replacement = window.prompt(`Rename ${word} in this file`, word)?.trim();
        if (replacement && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(replacement)) {
          replaceEditorContents(editor, replaceIdentifier(editor.getValue(), word, replacement));
        }
      },
    });

    updateAllDecorations(editor, monaco);
  }, []);

  const updateAllDecorations = useCallback((editor: MonacoTypes.editor.IStandaloneCodeEditor, monaco: Monaco) => {
if (!analysisResult) return;
     
     const state = useIdeStore.getState();
     const currentBreakpoints = state.breakpoints;
     const currentExecutionLine = state.currentExecutionLine;

     // 1. Diagnostic decorations
     const diagnosticDecs: MonacoTypes.editor.IModelDeltaDecoration[] = [];
     for (const diag of analysisResult.diagnostics) {
       if (!diag.range) continue;
       const { startLine, startColumn, endLine, endColumn } = diag.range;
       diagnosticDecs.push({
         range: new monaco.Range(startLine, startColumn, endLine, endColumn),
         options: {
           className: diag.severity === 'ERROR' ? 'cs-error-decoration' : 'cs-warning-decoration',
           hoverMessage: {
             value: `**${diag.severity}**: ${diag.humanMessage}${diag.suggestion ? '\n\n💡 ' + diag.suggestion : ''}`,
             isTrusted: true,
           },
           glyphMarginClassName: diag.severity === 'ERROR' ? 'cs-error-glyph' : 'cs-warning-glyph',
           overviewRuler: {
             color: diag.severity === 'ERROR' ? '#f85149' : '#d29922',
             position: monaco.editor.OverviewRulerLane.Right,
           },
         }
       });
     }
     setDecorations(editor, diagnosticDecorationsRef, diagnosticDecs);

     // 2. Scope decorations
     const scopeDecs: MonacoTypes.editor.IModelDeltaDecoration[] = [];
     for (const scope of analysisResult.scopes) {
       if (!scope.range || scope.depth === 0) continue;
       const { startLine, endLine } = scope.range;
       const colors = ['#7c3aed08', '#06b6d408', '#10b98108', '#f59e0b08'];
       const color = colors[scope.depth % colors.length];
       scopeDecs.push({
         range: new monaco.Range(startLine, 1, endLine, 1),
         options: {
           isWholeLine: true,
           className: 'cs-scope-decoration',
           linesDecorationsClassName: `cs-scope-line-${scope.depth % 4}`,
         }
       });
     }
     setDecorations(editor, scopeDecorationsRef, scopeDecs);

     // 3. Breakpoint decorations
     const bpDecs: MonacoTypes.editor.IModelDeltaDecoration[] = [];
     for (const bp of currentBreakpoints) {
       bpDecs.push({
         range: new monaco.Range(bp, 1, bp, 1),
         options: {
           isWholeLine: true,
           className: 'cs-breakpoint-line',
           glyphMarginClassName: 'cs-breakpoint-glyph',
         }
       });
     }
     setDecorations(editor, breakpointDecorationsRef, bpDecs);

     // 4. Current execution line (only when executing)
     if (currentExecutionLine !== null && isExecuting) {
       const execDecs: MonacoTypes.editor.IModelDeltaDecoration[] = [{
         range: new monaco.Range(currentExecutionLine, 1, currentExecutionLine, 1),
         options: {
           isWholeLine: true,
           className: 'cs-current-line',
           glyphMarginClassName: 'cs-current-line-glyph',
         }
       }];
       setDecorations(editor, executionDecorationsRef, execDecs);
     } else {
       clearDecorations(editor, executionDecorationsRef);
     }
   }, [analysisResult, breakpoints, currentExecutionLine, isExecuting]);

  // Update decorations when state changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateAllDecorations(editorRef.current, monacoRef.current);
    }
  }, [analysisResult, breakpoints, currentExecutionLine, isExecuting, updateAllDecorations]);

  // Highlight range when selection changes (flash effect)
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !highlightedRange) return;
    const monaco = monacoRef.current;
    const editor = editorRef.current;

    const { startLine, startColumn, endLine, endColumn } = highlightedRange;
    const range = new monaco.Range(startLine, startColumn, endLine, endColumn);

    editor.revealRangeInCenterIfOutsideViewport(range);
    editor.setSelection(range);

    highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, [{
      range,
      options: {
        className: 'cs-highlight-flash',
        isWholeLine: false,
        overviewRuler: { color: '#7c3aed', position: monaco.editor.OverviewRulerLane.Full },
      }
    }]);

    const timer = setTimeout(() => {
      highlightDecorationsRef.current = editor.deltaDecorations(highlightDecorationsRef.current, []);
    }, 1500);
    return () => clearTimeout(timer);
  }, [highlightedRange]);

  // Clear execution highlight when execution stops/finishes
  useEffect(() => {
    if (!isExecuting && currentExecutionLine === null && executionDecorationsRef.current.length > 0) {
      executionDecorationsRef.current = editorRef.current?.deltaDecorations(executionDecorationsRef.current, []) ?? [];
    }
  }, [isExecuting, currentExecutionLine]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div className="tab-bar" style={{
        display: 'flex',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
        padding: '0 8px',
        height: '32px',
        alignItems: 'center',
      }}>
        {activeFile && (
          <div className="tab active" key={activeFile.id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 12px',
            background: '#0d1117',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px',
            border: '1px solid #21262d',
            borderBottom: 'none',
            marginRight: '4px',
          }}>
            <span style={{ color: '#06b6d4', fontSize: '11px', marginRight: '6px' }}>●</span>
            {activeFile.name}
            <button 
              onClick={() => {}}
              style={{ marginLeft: '8px', background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer' }}
              title="Close"
            >×</button>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" style={{ marginRight: '8px' }} title="New File">
          +
        </button>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MonacoEditor
          height="100%"
          language="java"
          theme="codesmart-dark"
          value={sourceCode}
          onChange={(value) => setSourceCode(value ?? '')}
          onMount={handleMount}
          beforeMount={defineCodeSmartTheme}
          options={{
            automaticLayout: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
}

function replaceEditorContents(editor: MonacoTypes.editor.IStandaloneCodeEditor, nextValue: string): void {
  if (nextValue !== editor.getValue()) editor.setValue(nextValue);
}

// ============================================================
// Theme Definition
// ============================================================

function defineCodeSmartTheme(monaco: Monaco) {
  monaco.editor.defineTheme('codesmart-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c792ea', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: 'c792ea', fontStyle: 'bold' },
      { token: 'type', foreground: 'ffcb6b' },
      { token: 'type.identifier', foreground: 'ffcb6b' },
      { token: 'string', foreground: 'c3e88d' },
      { token: 'string.escape', foreground: 'f07178' },
      { token: 'number', foreground: 'f78c6c' },
      { token: 'comment', foreground: '546e7a', fontStyle: 'italic' },
      { token: 'comment.doc', foreground: '546e7a', fontStyle: 'italic' },
      { token: 'identifier', foreground: 'eeffff' },
      { token: 'delimiter', foreground: '89ddff' },
      { token: 'delimiter.bracket', foreground: 'c792ea' },
      { token: 'annotation', foreground: 'ffd580' },
      { token: 'variable', foreground: 'f8f8f2' },
      { token: 'variable.parameter', foreground: 'fd971f' },
      { token: 'constant', foreground: 'f78c6c' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editor.lineHighlightBackground': '#161b2280',
      'editor.selectionBackground': '#264f7840',
      'editor.inactiveSelectionBackground': '#264f7820',
      'editorLineNumber.foreground': '#444c56',
      'editorLineNumber.activeForeground': '#8b949e',
      'editorGutter.background': '#0d1117',
      'editorCursor.foreground': '#7c3aed',
      'editor.findMatchBackground': '#7c3aed40',
      'editor.findMatchHighlightBackground': '#7c3aed20',
      'editorWidget.background': '#161b22',
      'editorSuggestWidget.background': '#161b22',
      'editorSuggestWidget.border': '#30363d',
      'editorSuggestWidget.selectedBackground': '#21262d',
      'editorHoverWidget.background': '#161b22',
      'editorHoverWidget.border': '#30363d',
      'editorBracketMatch.background': '#7c3aed20',
      'editorBracketMatch.border': '#7c3aed',
      'minimap.background': '#0d1117',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#30363d60',
      'scrollbarSlider.hoverBackground': '#30363d90',
      'editorIndentGuide.background': '#21262d',
      'editorIndentGuide.activeBackground': '#30363d',
      // Custom decoration colors
      'editorOverviewRuler.currentContentForeground': '#7c3aed',
      'editorOverviewRuler.errorForeground': '#f85149',
      'editorOverviewRuler.warningForeground': '#d29922',
    }
  });
}

// ============================================================
// Java Completions
// ============================================================

function registerJavaCompletions(monaco: Monaco) {
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: (model: MonacoTypes.editor.ITextModel, position: MonacoTypes.Position) => {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber, word.startColumn,
        position.lineNumber, word.endColumn
      );

      const suggestions: MonacoTypes.languages.CompletionItem[] = [
        {
          label: 'main',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'public static void main(String[] args) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Java main method',
          range,
        },
        {
          label: 'sout',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'System.out.println($0);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'System.out.println',
          range,
        },
        {
          label: 'fori',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:length}; ${1:i}++) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'for loop with index',
          range,
        },
        {
          label: 'foreach',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Enhanced for loop',
          range,
        },
        {
          label: 'try',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'try {\n\t$0\n} catch (${1:Exception} e) {\n\te.printStackTrace();\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'try-catch block',
          range,
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'public class ${1:ClassName} {\n\t$0\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Class declaration',
          range,
        },
        ...['public', 'private', 'protected', 'static', 'final', 'abstract', 'void',
            'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short',
            'String', 'new', 'return', 'if', 'else', 'while', 'for', 'switch', 'case',
            'break', 'continue', 'throw', 'throws', 'try', 'catch', 'finally',
            'class', 'interface', 'extends', 'implements', 'import', 'package',
            'this', 'super', 'null', 'true', 'false'
        ].map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range,
        })),
        ...['ArrayList', 'HashMap', 'HashSet', 'LinkedList', 'List', 'Map', 'Set',
            'Optional', 'Stream', 'Iterator', 'Comparable', 'Iterable',
            'StringBuilder', 'StringBuffer', 'Object', 'Thread', 'Runnable'
        ].map(cls => ({
          label: cls,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: cls,
          range,
        })),
      ];

      return { suggestions };
    }
  });
}

// ============================================================
// Hover Provider
// ============================================================

function registerJavaHoverProvider(
  monaco: Monaco,
  editorRef: React.RefObject<MonacoTypes.editor.IStandaloneCodeEditor | null>,
  monacoRef: React.RefObject<Monaco | null>
) {
  monaco.languages.registerHoverProvider('java', {
    provideHover: (model: MonacoTypes.editor.ITextModel, position: MonacoTypes.Position) => {
      const { analysisResult } = useIdeStore.getState();
      if (!analysisResult) return null;

      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const variables = Object.values(analysisResult.symbolTable.variables);
      const match = variables.find(v => v.name === word.word);

      if (match) {
        const storageLabels: Record<string, string> = {
          PRIMITIVE_STACK: '📦 Stack (primitive)',
          REFERENCE_STACK: '🔗 Stack → Heap',
          STRING_POOL: '🔤 String Pool',
          ARRAY_HEAP: '📊 Heap (array)',
          STATIC_AREA: '⚙️ Static Area',
          UNKNOWN: '❓ Unknown',
        };

        return {
          range: new monaco.Range(
            position.lineNumber, word.startColumn,
            position.lineNumber, word.endColumn
          ),
          contents: [
            { value: `**${match.name}** : \`${match.type}\``, isTrusted: true },
            { value: `**Storage**: ${storageLabels[match.storageKind] ?? match.storageKind}` },
            match.staticValue ? { value: `**Value**: \`${match.staticValue}\`` } : null,
            match.parameter ? { value: `*Method parameter*` } : null,
            match.finalVar ? { value: `*final — cannot be reassigned*` } : null,
            match.explanation ? { value: match.explanation } : null,
          ].filter(Boolean) as MonacoTypes.IMarkdownString[],
        };
      }

      const methods = Object.values(analysisResult.symbolTable.methods);
      const methodMatch = methods.find(m => m.name === word.word);
      if (methodMatch) {
        return {
          range: new monaco.Range(
            position.lineNumber, word.startColumn,
            position.lineNumber, word.endColumn
          ),
          contents: [
            { value: `**${methodMatch.name}** : \`${methodMatch.returnType}\``, isTrusted: true },
            { value: `Modifiers: ${methodMatch.modifiers.join(' ') || 'none'}` },
            methodMatch.isRecursive ? { value: `⚠️ *Recursive method*` } : null,
            methodMatch.explanation ? { value: methodMatch.explanation } : null,
          ].filter(Boolean) as MonacoTypes.IMarkdownString[],
        };
      }

      return null;
    }
  });
}