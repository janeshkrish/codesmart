import type { FileNode } from '../types';

export function createJavaClass(className: string): { node: FileNode; content: string } {
  const safeName = className.replace(/\.java$/i, '').trim();
  const node: FileNode = {
    id: `new-${Date.now()}`,
    name: `${safeName}.java`,
    path: `/src/main/java/${safeName}.java`,
    type: 'file',
    language: 'java',
  };
  return { node, content: `public class ${safeName} {\n    \n}\n` };
}

export function renameJavaFile(nodes: FileNode[], id: string, nextName: string): FileNode[] {
  const className = nextName.replace(/\.java$/i, '').trim();
  return nodes.map(node => {
    if (node.id === id && node.type === 'file') {
      const extension = node.name.endsWith('.java') ? '.java' : '';
      const fileName = `${className}${extension}`;
      const slash = node.path.lastIndexOf('/');
      return { ...node, name: fileName, path: `${node.path.slice(0, slash + 1)}${fileName}` };
    }
    return node.children ? { ...node, children: renameJavaFile(node.children, id, nextName) } : node;
  });
}

export function removeFileNode(nodes: FileNode[], id: string): FileNode[] {
  return nodes
    .filter(node => node.id !== id)
    .map(node => node.children ? { ...node, children: removeFileNode(node.children, id) } : node);
}
