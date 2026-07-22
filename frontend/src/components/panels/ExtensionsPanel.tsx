import React, { useState, useMemo } from 'react';
import { Search, X, ChevronDown, Plus, Package, Check, AlertCircle, Download, Settings, Trash2, Star } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

const mockExtensions = [
  {
    id: 'codesmart.java',
    name: 'CodeSmart Java Support',
    version: '1.0.0',
    publisher: 'CodeSmart',
    description: 'Java language support with visualization',
    installed: true,
    enabled: true,
    categories: ['Language Packs', 'Debuggers'],
    downloads: 15420,
    rating: 4.8,
    icon: '☕',
  },
  {
    id: 'codesmart.python',
    name: 'CodeSmart Python',
    version: '1.0.0',
    publisher: 'CodeSmart',
    description: 'Python language support with visualization',
    installed: true,
    enabled: true,
    categories: ['Language Packs'],
    downloads: 23100,
    rating: 4.9,
    icon: '🐍',
  },
  {
    id: 'codesmart.cpp',
    name: 'CodeSmart C/C++',
    version: '1.0.0',
    publisher: 'CodeSmart',
    description: 'C/C++ language support',
    installed: false,
    enabled: false,
    categories: ['Language Packs'],
    downloads: 8900,
    rating: 4.5,
    icon: '⚙️',
  },
  {
    id: 'codesmart.debugger',
    name: 'CodeSmart Debugger',
    version: '1.2.0',
    publisher: 'CodeSmart',
    description: 'Advanced debugging with visualization',
    installed: true,
    enabled: true,
    categories: ['Debuggers'],
    downloads: 12300,
    rating: 4.7,
    icon: '🐛',
  },
  {
    id: 'codesmart.viz',
    name: 'CodeSmart Visualizer',
    version: '2.0.0',
    publisher: 'CodeSmart',
    description: 'DP Table, Recursion Tree, Loop Trace visualizers',
    installed: true,
    enabled: true,
    categories: ['Visualizers'],
    downloads: 9800,
    rating: 4.9,
    icon: '📊',
  },
  {
    id: 'vscode.gitlens',
    name: 'GitLens',
    version: '14.0.0',
    publisher: 'GitKraken',
    description: 'Supercharge Git capabilities',
    installed: false,
    enabled: false,
    categories: ['SCM', 'Other'],
    downloads: 4500000,
    rating: 4.8,
    icon: '🔍',
  },
  {
    id: 'vscode.prettier',
    name: 'Prettier',
    version: '10.0.0',
    publisher: 'Prettier',
    description: 'Code formatter',
    installed: false,
    enabled: false,
    categories: ['Formatters'],
    downloads: 3200000,
    rating: 4.6,
    icon: '✨',
  },
];

export function ExtensionsPanel() {
  const { installedExtensions, enabledExtensions, installExtension, uninstallExtension, enableExtension, disableExtension } = useIdeStore();
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'popular' | 'recommended'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'rating' | 'updated'>('name');
  
  const mergedExtensions = useMemo(() => {
    const installed = new Set(installedExtensions.keys());
    return mockExtensions.map(ext => ({
      ...ext,
      installed: installed.has(ext.id),
      enabled: enabledExtensions.has(ext.id),
    }));
  }, [installedExtensions, enabledExtensions]);

  const filteredExtensions = useMemo(() => {
    let result = mockExtensions.filter(ext => {
      const matchesSearch = ext.name.toLowerCase().includes(search.toLowerCase()) ||
        ext.description.toLowerCase().includes(search.toLowerCase());
      
      let matchesFilter = true;
      if (filter === 'installed') matchesFilter = installedExtensions.has(ext.id);
      if (filter === 'popular') matchesFilter = ext.downloads > 100000;
      if (filter === 'recommended') matchesFilter = ext.rating >= 4.7;
      
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'downloads') return b.downloads - a.downloads;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

    return result;
  }, [search, filter, sortBy, installedExtensions]);

  const handleInstall = async (ext: typeof mockExtensions[0]) => {
    if (ext.installed) return;
    await installExtension({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      publisher: ext.publisher,
      description: ext.description,
      main: '',
      contributes: {},
      activationEvents: [],
    });
  };

  const handleUninstall = async (extId: string) => {
    await uninstallExtension(extId);
  };

  const handleToggle = async (extId: string, enable: boolean) => {
    if (enable) await enableExtension(extId);
    else await disableExtension(extId);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div className="panel-header" style={{ 
        justifyContent: 'space-between', 
        padding: '0 8px',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={14} color="#7c3aed" />
          <span className="panel-title">Extensions</span>
          <span style={{ 
            padding: '1px 6px', borderRadius: '8px', fontSize: '9px',
            fontWeight: 600, background: '#30363d', color: '#8b949e',
            border: '1px solid #21262d',
          }}>
            {Array.from(installedExtensions.keys()).length} installed
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} color="#8b949e" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search extensions..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', 
                padding: '4px 8px 4px 28px', color: '#e6edf3', fontSize: '11px', 
                width: '200px', outline: 'none',
              }}
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '4px 8px' }}
          >
            <option value="all">All</option>
            <option value="installed">Installed</option>
            <option value="popular">Popular</option>
            <option value="recommended">Recommended</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '4px', color: '#e6edf3', fontSize: '11px', padding: '4px 8px' }}
          >
            <option value="name">Name</option>
            <option value="downloads">Downloads</option>
            <option value="rating">Rating</option>
            <option value="updated">Updated</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filteredExtensions.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6e7681', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div>No extensions found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {search ? 'Try a different search term' : 'Browse the marketplace'}
            </div>
          </div>
        ) : (
          filteredExtensions.map(ext => {
            const isInstalled = installedExtensions.has(ext.id);
            const isEnabled = enabledExtensions.has(ext.id);
            const isInstalledFlag = ext.installed;

            return (
              <div 
                key={ext.id} 
                style={{ 
                  display: 'flex', gap: '12px', padding: '12px', 
                  background: isInstalledFlag ? '#161b22' : 'transparent',
                  border: '1px solid #21262d', borderRadius: '6px',
                  marginBottom: '8px',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ fontSize: '24px', marginTop: '4px' }}>{ext.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{ext.name}</span>
                    <span style={{ 
                      fontSize: '10px', color: '#8b949e', 
                      background: '#21262d', padding: '1px 6px', borderRadius: '3px',
                    }}>
                      v{ext.version}
                    </span>
                    <span style={{ 
                      fontSize: '9px', color: '#8b949e', textTransform: 'uppercase',
                      background: '#21262d', padding: '1px 4px', borderRadius: '3px',
                    }}>
                      {ext.publisher}
                    </span>
                    <span style={{ fontSize: '10px', color: '#8b949e' }}>
                      {ext.downloads.toLocaleString()} downloads
                    </span>
                    <span style={{ 
                      display: 'flex', alignItems: 'center', gap: '2px',
                      color: '#ffd700', fontSize: '10px',
                    }}>
                      <Star size={10} fill="currentColor" /> {ext.rating}
                    </span>
                  </div>
                  <div style={{ color: '#8b949e', fontSize: '12px', marginBottom: '8px', lineHeight: 1.5 }}>
                    {ext.description}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                    {ext.categories.map(cat => (
                      <span key={cat} style={{
                        fontSize: '9px', color: '#7c3aed', background: '#7c3aed15',
                        padding: '1px 6px', borderRadius: '3px', border: '1px solid #7c3aed30',
                      }}>
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isInstalledFlag ? (
                      <>
                        <button
                          className={`btn btn-${isEnabled ? 'primary' : 'ghost'} btn-sm`}
                          onClick={() => handleToggle(ext.id, !isEnabled)}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {isEnabled ? <Check size={12} /> : <AlertCircle size={12} />}
                          <span>{isEnabled ? 'Enabled' : 'Enable'}</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleUninstall(ext.id)}
                          title="Uninstall"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleInstall(ext)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Download size={12} />
                        <span>Install</span>
                      </button>
                    )}
                    <button className="btn btn-ghost btn-icon btn-xs" title="Details">
                      <Settings size={12} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-xs" title="Star">
                      <Star size={12} style={{ color: isInstalledFlag ? '#ffd700' : '#8b949e' }} fill={isInstalledFlag ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              </div>
);
        })
      )}
      </div>
    </div>
  );
}