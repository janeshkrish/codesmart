const IMPORT_LINE = /^\s*import\s+(?:static\s+)?[\w.*]+\s*;\s*$/;

/** Sort and deduplicate a contiguous Java import block while preserving the rest of the document. */
export function organizeJavaImports(source: string): string {
  const lines = source.split('\n');
  const importIndexes = lines
    .map((line, index) => IMPORT_LINE.test(line) ? index : -1)
    .filter(index => index >= 0);

  if (importIndexes.length < 2) return source;

  const first = importIndexes[0];
  const last = importIndexes[importIndexes.length - 1];
  const imports = [...new Set(lines.slice(first, last + 1).filter(line => IMPORT_LINE.test(line)))].sort((a, b) => a.localeCompare(b));
  return [...lines.slice(0, first), ...imports, ...lines.slice(last + 1)].join('\n');
}

/** Rename lexical identifier occurrences without changing Java strings, characters, or comments. */
export function replaceIdentifier(source: string, from: string, to: string): string {
  if (!from || from === to) return source;
  let result = '';
  let index = 0;
  let mode: 'code' | 'string' | 'character' | 'lineComment' | 'blockComment' = 'code';

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (mode === 'code') {
      if (char === '"') mode = 'string';
      else if (char === "'") mode = 'character';
      else if (char === '/' && next === '/') { mode = 'lineComment'; result += '//'; index += 2; continue; }
      else if (char === '/' && next === '*') { mode = 'blockComment'; result += '/*'; index += 2; continue; }

      if (source.startsWith(from, index) && !isIdentifierPart(source[index - 1]) && !isIdentifierPart(source[index + from.length])) {
        result += to;
        index += from.length;
        continue;
      }
    } else if ((mode === 'string' || mode === 'character') && char === '\\') {
      result += source.slice(index, index + 2);
      index += 2;
      continue;
    } else if (mode === 'string' && char === '"') {
      mode = 'code';
    } else if (mode === 'character' && char === "'") {
      mode = 'code';
    } else if (mode === 'lineComment' && char === '\n') {
      mode = 'code';
    } else if (mode === 'blockComment' && char === '*' && next === '/') {
      result += '*/';
      index += 2;
      mode = 'code';
      continue;
    }

    result += char;
    index += 1;
  }

  return result;
}

function isIdentifierPart(value: string | undefined): boolean {
  return Boolean(value && /[A-Za-z0-9_$]/.test(value));
}
