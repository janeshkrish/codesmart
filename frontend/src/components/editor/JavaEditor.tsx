import React, { useRef, useEffect, useCallback } from 'react';
import MonacoEditor, { type Monaco, type OnMount } from '@monaco-editor/react';
import type * as MonacoTypes from 'monaco-editor';
import { useIdeStore } from '../../store/ideStore';

export function JavaEditor() {
  const {
    sourceCode, setSourceCode, setCursorPosition,
    analysisResult, highlightedRange, activeFile,
    breakpoints, toggleBreakpoint, currentExecutionLine
  } = useIdeStore();

  const editorRef = useRef<MonacoTypes.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<MonacoTypes.editor.IEditorDecorationsCollection | null>(null);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure Java language features
    monaco.languages.register({ id: 'java' });

    // Cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({ line: e.position.lineNumber, column: e.position.column });
    });

    // Breakpoint toggling on gutter click
    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        if (e.target.position) {
          useIdeStore.getState().toggleBreakpoint(e.target.position.lineNumber);
        }
      }
    });

    // Configure editor
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

    // Add Java completions
    registerJavaCompletions(monaco);

    // Add Java hover provider (for types/explanations)
    registerJavaHoverProvider(monaco, editorRef, monacoRef);

    // Initial decoration
    updateDecorations(editor, monaco, analysisResult, useIdeStore.getState().breakpoints, useIdeStore.getState().currentExecutionLine);
  }, []); // eslint-disable-line

  // Update decorations when analysis or execution state changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      updateDecorations(editorRef.current, monacoRef.current, analysisResult, breakpoints, currentExecutionLine);
    }
  }, [analysisResult, breakpoints, currentExecutionLine]);

  // Highlight range when selection changes
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !highlightedRange) return;
    const monaco = monacoRef.current;
    const editor = editorRef.current;

    const { startLine, startColumn, endLine, endColumn } = highlightedRange;
    const range = new monaco.Range(startLine, startColumn, endLine, endColumn);

    // Reveal and select
    editor.revealRangeInCenterIfOutsideViewport(range);
    editor.setSelection(range);

    // Flash highlight decoration
    if (decorationsRef.current) decorationsRef.current.clear();
    decorationsRef.current = editor.createDecorationsCollection([{
      range,
      options: {
        className: 'cs-highlight-flash',
        isWholeLine: false,
        overviewRuler: { color: '#7c3aed', position: monaco.editor.OverviewRulerLane.Full },
      }
    }]);

    // Clear flash after 1.5s
    const timer = setTimeout(() => decorationsRef.current?.clear(), 1500);
    return () => clearTimeout(timer);
  }, [highlightedRange]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div className="tab-bar">
        {activeFile && (
          <div className="tab active" key={activeFile.id}>
            <span style={{ color: '#06b6d4', fontSize: '11px' }}>●</span>
            {activeFile.name}
          </div>
        )}
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
    }
  });
}

// ============================================================
// Decorations (errors, scope highlights)
// ============================================================

function updateDecorations(
  editor: MonacoTypes.editor.IStandaloneCodeEditor,
  monaco: Monaco,
  analysisResult: ReturnType<typeof useIdeStore.getState>['analysisResult'],
  breakpoints: Set<number>,
  currentExecutionLine: number | null
) {
  const decorations: MonacoTypes.editor.IModelDeltaDecoration[] = [];

  if (analysisResult) {

  // Error/warning underlines
  for (const diag of analysisResult.diagnostics) {
    if (!diag.range) continue;
    const { startLine, startColumn, endLine, endColumn } = diag.range;
    decorations.push({
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

  // Scope highlights
  for (const scope of analysisResult.scopes) {
    if (!scope.range || scope.depth === 0) continue;
    const { startLine, endLine } = scope.range;
    // Subtle background tint per scope depth
    const colors = ['#7c3aed08', '#06b6d408', '#10b98108', '#f59e0b08'];
    const color = colors[scope.depth % colors.length];
    decorations.push({
      range: new monaco.Range(startLine, 1, endLine, 1),
      options: {
        isWholeLine: true,
        className: 'cs-scope-decoration',
        linesDecorationsClassName: `cs-scope-line-${scope.depth % 4}`,
      }
    });
  }
  }

  // Breakpoints
  for (const bp of breakpoints) {
    decorations.push({
      range: new monaco.Range(bp, 1, bp, 1),
      options: {
        isWholeLine: true,
        className: 'cs-breakpoint-line',
        glyphMarginClassName: 'cs-breakpoint-glyph',
      }
    });
  }

  // Current Execution Line
  if (currentExecutionLine !== null) {
    decorations.push({
      range: new monaco.Range(currentExecutionLine, 1, currentExecutionLine, 1),
      options: {
        isWholeLine: true,
        className: 'cs-current-line',
        glyphMarginClassName: 'cs-current-line-glyph',
      }
    });
  }

  // Apply all decorations
  editor.createDecorationsCollection(decorations);
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
        // Snippets
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
        // Keywords
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
        // Common types
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

      // Find matching variable
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

      // Find matching method
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
