import { describe, expect, it } from 'vitest';
import { organizeJavaImports, replaceIdentifier } from './javaEditorCommands';

describe('organizeJavaImports', () => {
  it('sorts and deduplicates standalone imports without moving code', () => {
    const source = `package demo;

import java.util.List;
import java.io.File;
import java.util.List;

public class Main {}`;

    expect(organizeJavaImports(source)).toBe(`package demo;

import java.io.File;
import java.util.List;

public class Main {}`);
  });
});

describe('replaceIdentifier', () => {
  it('replaces whole identifiers while leaving longer names and strings unchanged', () => {
    const source = 'int count = 1; int counter = count + 1; String label = "count";';

    expect(replaceIdentifier(source, 'count', 'total')).toBe(
      'int total = 1; int counter = total + 1; String label = "count";'
    );
  });
});
