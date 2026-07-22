// ============================================================
// Language Configurations - Multi-Language Support
// ============================================================

import type { LanguageConfig, LanguageId } from './coreServices';

export const LANGUAGE_CONFIGS: Record<LanguageId, LanguageConfig> = {
  java: {
    id: 'java',
    name: 'Java',
    extensions: ['.java'],
    monacoLanguage: 'java',
    runner: {
      compile: ['javac', '--enable-preview', '--release', '23', '-d', '${workspaceFolder}/out', '${file}'],
      execute: ['java', '--enable-preview', '-cp', '${workspaceFolder}/out', '${fileBasenameNoExtension}'],
      env: { JAVA_HOME: '${env:JAVA_HOME}' },
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
      customExtractors: ['dpTableExtractor', 'recursionTraceExtractor', 'loopTraceExtractor'],
    },
    lsp: {
      command: ['java', '-jar', '${lsp:jdtls}/plugins/org.eclipse.equinox.launcher_*.jar'],
      initializationOptions: {
        bundles: ['${lsp:jdtls}/plugins/org.eclipse.jdt.ls_*.jar'],
      },
    },
    formatter: {
      command: ['clang-format', '--style=Google', '-i', '${file}'],
    },
  },

  python: {
    id: 'python',
    name: 'Python',
    extensions: ['.py', '.pyw', '.pyi'],
    monacoLanguage: 'python',
    runner: {
      execute: ['python3', '-u', '${file}'],
      args: [],
      env: { PYTHONPATH: '${workspaceFolder}' },
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
      customExtractors: ['dpTableExtractor', 'recursionTraceExtractor'],
    },
    lsp: {
      command: ['pylsp'],
    },
    formatter: {
      command: ['black', '--line-length', '100', '${file}'],
    },
  },

  c: {
    id: 'c',
    name: 'C',
    extensions: ['.c', '.h'],
    monacoLanguage: 'c',
    runner: {
      compile: ['gcc', '-std=c11', '-O2', '-Wall', '-Wextra', '-g', '-o', '${workspaceFolder}/out/${fileBasenameNoExtension}', '${file}'],
      execute: ['${workspaceFolder}/out/${fileBasenameNoExtension}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['clangd', '--background-index', '--clang-tidy'],
    },
    formatter: {
      command: ['clang-format', '--style=Google', '-i', '${file}'],
    },
  },

  cpp: {
    id: 'cpp',
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx', '.hh'],
    monacoLanguage: 'cpp',
    runner: {
      compile: ['g++', '-std=c++20', '-O2', '-Wall', '-Wextra', '-g', '-o', '${workspaceFolder}/out/${fileBasenameNoExtension}', '${file}'],
      execute: ['${workspaceFolder}/out/${fileBasenameNoExtension}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['clangd', '--background-index', '--clang-tidy'],
    },
    formatter: {
      command: ['clang-format', '--style=Google', '-i', '${file}'],
    },
  },

  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    extensions: ['.js', '.mjs', '.cjs'],
    monacoLanguage: 'javascript',
    runner: {
      execute: ['node', '--trace-uncaught', '${file}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['typescript-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    monacoLanguage: 'typescript',
    runner: {
      compile: ['tsc', '--noEmit', '${file}'],
      execute: ['ts-node', '--transpile-only', '${file}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['typescript-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },

  go: {
    id: 'go',
    name: 'Go',
    extensions: ['.go'],
    monacoLanguage: 'go',
    runner: {
      execute: ['go', 'run', '${file}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['gopls'],
    },
    formatter: {
      command: ['gofmt', '-w', '${file}'],
    },
  },

  rust: {
    id: 'rust',
    name: 'Rust',
    extensions: ['.rs'],
    monacoLanguage: 'rust',
    runner: {
      execute: ['cargo', 'run', '--manifest-path', '${workspaceFolder}/Cargo.toml'],
      compile: ['cargo', 'build', '--manifest-path', '${workspaceFolder}/Cargo.toml'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['rust-analyzer'],
    },
    formatter: {
      command: ['rustfmt', '--edition', '2021', '${file}'],
    },
  },

  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    monacoLanguage: 'kotlin',
    runner: {
      compile: ['kotlinc', '${file}', '-include-runtime', '-d', '${workspaceFolder}/out/${fileBasenameNoExtension}.jar'],
      execute: ['java', '-jar', '${workspaceFolder}/out/${fileBasenameNoExtension}.jar'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['kotlin-language-server'],
    },
    formatter: {
      command: ['ktlint', '-F', '${file}'],
    },
  },

  php: {
    id: 'php',
    name: 'PHP',
    extensions: ['.php', '.phtml'],
    monacoLanguage: 'php',
    runner: {
      execute: ['php', '${file}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['phpactor', 'language-server'],
    },
    formatter: {
      command: ['php-cs-fixer', 'fix', '${file}'],
    },
  },

  csharp: {
    id: 'csharp',
    name: 'C#',
    extensions: ['.cs'],
    monacoLanguage: 'csharp',
    runner: {
      compile: ['dotnet', 'build', '${workspaceFolder}'],
      execute: ['dotnet', 'run', '--project', '${workspaceFolder}'],
    },
    visualizer: {
      supportsDP: true,
      supportsRecursion: true,
      supportsLoops: true,
    },
    lsp: {
      command: ['csharp-language-server'],
    },
    formatter: {
      command: ['dotnet', 'format', '${workspaceFolder}'],
    },
  },

  html: {
    id: 'html',
    name: 'HTML',
    extensions: ['.html', '.htm', '.xhtml'],
    monacoLanguage: 'html',
    runner: {
      execute: ['npx', 'serve', '${workspaceFolder}'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['vscode-html-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },

  css: {
    id: 'css',
    name: 'CSS',
    extensions: ['.css', '.scss', '.sass', '.less'],
    monacoLanguage: 'css',
    runner: {
      execute: ['npx', 'stylelint', '${file}'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['vscode-css-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },

  sql: {
    id: 'sql',
    name: 'SQL',
    extensions: ['.sql'],
    monacoLanguage: 'sql',
    runner: {
      execute: ['sqlite3', '${file}'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['sql-language-server', 'up', '--method', 'stdio'],
    },
    formatter: {
      command: ['sql-formatter', '--language', 'postgresql', '${file}'],
    },
  },

  shell: {
    id: 'shell',
    name: 'Shell',
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    monacoLanguage: 'shell',
    runner: {
      execute: ['bash', '${file}'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['bash-language-server', 'start'],
    },
    formatter: {
      command: ['shfmt', '-w', '${file}'],
    },
  },

  json: {
    id: 'json',
    name: 'JSON',
    extensions: ['.json', '.jsonc'],
    monacoLanguage: 'json',
    runner: {
      execute: ['jq', '.', '${file}'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['vscode-json-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },

  markdown: {
    id: 'markdown',
    name: 'Markdown',
    extensions: ['.md', '.markdown', '.mdown'],
    monacoLanguage: 'markdown',
    runner: {
      execute: ['pandoc', '${file}', '-o', '${workspaceFolder}/out/${fileBasenameNoExtension}.html'],
    },
    visualizer: {
      supportsDP: false,
      supportsRecursion: false,
      supportsLoops: false,
    },
    lsp: {
      command: ['markdown-language-server', '--stdio'],
    },
    formatter: {
      command: ['prettier', '--write', '${file}'],
    },
  },
};

export function getLanguageConfig(id: LanguageId): LanguageConfig | undefined {
  return LANGUAGE_CONFIGS[id];
}

export function getLanguageForFile(fileName: string): LanguageId | undefined {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  for (const [id, config] of Object.entries(LANGUAGE_CONFIGS)) {
    if (config.extensions.includes(ext)) {
      return id as LanguageId;
    }
  }
  return undefined;
}

export function getLanguageForPath(path: string): LanguageId | undefined {
  const fileName = path.split('/').pop() || path.split('\\').pop() || '';
  return getLanguageForFile(fileName);
}

export function getAllLanguageConfigs(): LanguageConfig[] {
  return Object.values(LANGUAGE_CONFIGS);
}

export function getSupportedLanguages(): LanguageId[] {
  return Object.keys(LANGUAGE_CONFIGS) as LanguageId[];
}

export function getVisualizerCapabilities(language: LanguageId) {
  return LANGUAGE_CONFIGS[language]?.visualizer;
}

export function getRunnerConfig(language: LanguageId) {
  return LANGUAGE_CONFIGS[language]?.runner;
}

export function getLSPConfig(language: LanguageId) {
  return LANGUAGE_CONFIGS[language]?.lsp;
}

export function getFormatterConfig(language: LanguageId) {
  return LANGUAGE_CONFIGS[language]?.formatter;
}

// ============================================================
// Interpolation Helpers
// ============================================================

export function interpolateCommand(
  command: string[],
  context: {
    file: string;
    workspaceFolder: string;
    fileBasename: string;
    fileBasenameNoExtension: string;
    fileDirname: string;
    fileExtname: string;
    env: Record<string, string>;
  }
): string[] {
  return command.map(arg => {
    let result = arg;
    result = result.replace(/\$\{file\}/g, context.file);
    result = result.replace(/\$\{workspaceFolder\}/g, context.workspaceFolder);
    result = result.replace(/\$\{fileBasename\}/g, context.fileBasename);
    result = result.replace(/\$\{fileBasenameNoExtension\}/g, context.fileBasenameNoExtension);
    result = result.replace(/\$\{fileDirname\}/g, context.fileDirname);
    result = result.replace(/\$\{fileExtname\}/g, context.fileExtname);
    
    // Environment variables
    result = result.replace(/\$\{env:([^}]+)\}/g, (_, key) => context.env[key] || '');
    
    return result;
  });
}