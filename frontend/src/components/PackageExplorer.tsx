import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, FolderOpen, Folder, Plus, RefreshCw } from 'lucide-react';
import { useIdeStore } from '../store/ideStore';
import type { FileNode } from '../types';

// Let's add a global window type for electron API
declare global {
  interface Window {
    electronAPI?: {
      openFile: () => Promise<string | null>;
      saveFile: (content: string) => Promise<boolean>;
    }
  }
}

const SAMPLE_FILES: FileNode[] = [
  {
    id: 'src', name: 'src', path: '/src', type: 'folder', isOpen: true,
    children: [
      {
        id: 'main', name: 'main', path: '/src/main', type: 'folder', isOpen: true,
        children: [
          {
            id: 'java', name: 'java', path: '/src/main/java', type: 'folder', isOpen: true,
            children: [
              { id: 'Main', name: 'Main.java', path: '/src/main/java/Main.java', type: 'file', language: 'java' },
              { id: 'Student', name: 'Student.java', path: '/src/main/java/Student.java', type: 'file', language: 'java' },
              { id: 'Node', name: 'Node.java', path: '/src/main/java/Node.java', type: 'file', language: 'java' },
            ]
          }
        ]
      }
    ]
  }
];

export function PackageExplorer() {
  const { activeFile, setActiveFile, setSourceCode } = useIdeStore();
  const [files, setFiles] = useState<FileNode[]>(SAMPLE_FILES);
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, node: FileNode | null } | null>(null);

  // Close context menu on window click
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const toggleFolder = (node: FileNode) => {
    const toggle = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n => n.id === node.id
        ? { ...n, isOpen: !n.isOpen }
        : { ...n, children: n.children ? toggle(n.children) : undefined }
      );
    setFiles(toggle(files));
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleNewFile = () => {
    const newFile: FileNode = {
      id: 'new-' + Date.now(),
      name: 'NewFile.java',
      path: '/src/main/java/NewFile.java',
      type: 'file',
      language: 'java'
    };
    
    // Simple mock insertion into first folder
    const insert = (nodes: FileNode[]): FileNode[] => {
      if (nodes.length === 0) return nodes;
      if (nodes[0].id === 'src' && nodes[0].children?.[0]?.children?.[0]?.children) {
        const copy = [...nodes];
        copy[0].children![0].children![0].children = [...copy[0].children![0].children![0].children!, newFile];
        return copy;
      }
      return nodes;
    };
    
    setFiles(insert(files));
    setActiveFile(newFile);
    setSourceCode('public class NewFile {\n    \n}');
  };

  const handleDelete = (id: string) => {
    const removeNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(n => n.id !== id).map(n => ({
        ...n,
        children: n.children ? removeNode(n.children) : undefined
      }));
    };
    setFiles(removeNode(files));
    if (activeFile?.id === id) {
      setActiveFile(null);
      setSourceCode('');
    }
  };

  const renderNode = (node: FileNode, depth = 0): React.ReactNode => {
    const isActive = activeFile?.id === node.id;
    const indent = depth * 12;

    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-1 cursor-pointer select-none group"
            style={{
              padding: `3px 8px 3px ${indent + 8}px`,
              color: '#8b949e',
              fontSize: '12px',
            }}
            onClick={() => toggleFolder(node)}
            onContextMenu={(e) => handleContextMenu(e, node)}
          >
            <span className="text-[#444c56] group-hover:text-[#8b949e] transition-colors">
              {node.isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
            {node.isOpen
              ? <FolderOpen size={13} style={{ color: '#d29922' }} />
              : <Folder size={13} style={{ color: '#d29922' }} />
            }
            <span className="group-hover:text-[#e6edf3] transition-colors">{node.name}</span>
          </div>
          {node.isOpen && node.children?.map(child => renderNode(child, depth + 1))}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className="flex items-center gap-1 cursor-pointer select-none group transition-colors"
        style={{
          padding: `3px 8px 3px ${indent + 8}px`,
          fontSize: '12px',
          background: isActive ? 'rgba(124,58,237,0.15)' : 'transparent',
          borderLeft: isActive ? '2px solid #7c3aed' : '2px solid transparent',
          color: isActive ? '#e6edf3' : '#8b949e',
        }}
        onClick={() => setActiveFile(node)}
        onContextMenu={(e) => handleContextMenu(e, node)}
      >
        <FileCode size={13} style={{ color: '#06b6d4', flexShrink: 0 }} />
        <span className={isActive ? '' : 'group-hover:text-[#e6edf3] transition-colors'}>
          {node.name}
        </span>
      </div>
    );
  };

  return (
    <div style={{
      height: '100%',
      background: '#0d1117',
      borderRight: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="panel-header" style={{ justifyContent: 'space-between' }}>
        <div className="flex items-center gap-2">
          <FolderOpen size={12} />
          <span className="panel-title">Explorer</span>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-icon" title="New File" style={{ padding: '2px' }} onClick={handleNewFile}>
            <Plus size={11} />
          </button>
          <button className="btn btn-ghost btn-icon" title="Refresh" style={{ padding: '2px' }} onClick={() => setFiles([...files])}>
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Project name */}
      <div style={{
        padding: '6px 12px',
        fontSize: '11px',
        fontWeight: 700,
        color: '#6e7681',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '1px solid #21262d',
        flexShrink: 0,
      }}>
        codesmart-project
      </div>

      {/* File tree */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }} onContextMenu={(e) => handleContextMenu(e, null)}>
        {files.map(f => renderNode(f))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => { handleNewFile(); setContextMenu(null); }}>
            New File
          </div>
          {contextMenu.node && (
            <>
              <div className="context-menu-item" onClick={() => setContextMenu(null)}>Rename</div>
              <div className="context-menu-separator"></div>
              <div className="context-menu-item danger" onClick={() => { handleDelete(contextMenu.node!.id); setContextMenu(null); }}>
                Delete
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
