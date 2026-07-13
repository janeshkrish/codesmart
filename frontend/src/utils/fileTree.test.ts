import { describe, expect, it } from 'vitest';
import type { FileNode } from '../types';
import { createJavaClass, removeFileNode, renameJavaFile } from './fileTree';

const tree: FileNode[] = [{
  id: 'src', name: 'src', path: '/src', type: 'folder', children: [
    { id: 'Main', name: 'Main.java', path: '/src/Main.java', type: 'file', language: 'java' },
  ],
}];

describe('file tree operations', () => {
  it('creates a Java class file with a matching starter class', () => {
    expect(createJavaClass('Student').content).toContain('public class Student');
    expect(createJavaClass('Student').node.name).toBe('Student.java');
  });

  it('renames a Java file while keeping its extension and path consistent', () => {
    const renamed = renameJavaFile(tree, 'Main', 'App');
    expect(renamed[0].children?.[0]).toMatchObject({ id: 'Main', name: 'App.java', path: '/src/App.java' });
  });

  it('removes only the chosen node from the tree', () => {
    expect(removeFileNode(tree, 'Main')[0].children).toEqual([]);
  });
});
