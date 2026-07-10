import React, { useState } from 'react';
import { useIdeStore } from '../../store/ideStore';

type SymbolFilter = 'all' | 'variables' | 'methods' | 'classes';

export function SymbolTablePanel() {
  const { analysisResult, selectVariable, highlightRange } = useIdeStore();
  const [filter, setFilter] = useState<SymbolFilter>('all');
  const [search, setSearch] = useState('');

  const symbols = analysisResult?.symbolTable;
  if (!symbols) {
    return <div style={{ padding: '12px', color: '#6e7681', fontSize: '12px' }}>No symbols yet</div>;
  }

  const variables = Object.values(symbols.variables ?? {}).filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase())
  );
  const methods = Object.values(symbols.methods ?? {}).filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );
  const classes = Object.values(symbols.classes ?? {}).filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Search + filter bar */}
      <div style={{ padding: '6px 10px', borderBottom: '1px solid #21262d',
        display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Filter symbols..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, background: '#161b22', border: '1px solid #30363d',
            borderRadius: '4px', padding: '4px 8px', fontSize: '11px',
            color: '#e6edf3', outline: 'none', fontFamily: 'monospace',
          }}
        />
        {(['all', 'variables', 'methods', 'classes'] as SymbolFilter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '3px 8px', borderRadius: '4px', fontSize: '10px',
            background: filter === f ? 'rgba(124,58,237,0.2)' : 'transparent',
            border: `1px solid ${filter === f ? '#7c3aed' : '#30363d'}`,
            color: filter === f ? '#a78bfa' : '#6e7681',
            cursor: 'pointer',
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* Symbol table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Variables section */}
        {(filter === 'all' || filter === 'variables') && variables.length > 0 && (
          <>
            <SectionHeader title="Variables" count={variables.length} icon="📦" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#161b22', fontSize: '10px', color: '#6e7681' }}>
                  <Th>Name</Th><Th>Type</Th><Th>Storage</Th><Th>Value</Th><Th>Line</Th>
                </tr>
              </thead>
              <tbody>
                {variables.map(v => (
                  <tr key={v.id}
                    onClick={() => { selectVariable(v.id); if (v.declarationRange) highlightRange(v.declarationRange); }}
                    style={{ borderBottom: '1px solid #21262d', cursor: 'pointer', fontSize: '11px' }}
                    className="hover:bg-[#161b22]"
                  >
                    <Td><span style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 600 }}>{v.name}</span></Td>
                    <Td><span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{v.type}</span></Td>
                    <Td><StorageTag kind={v.storageKind} /></Td>
                    <Td><span style={{ color: '#3fb950', fontFamily: 'monospace' }}>{v.staticValue ?? '—'}</span></Td>
                    <Td><span style={{ color: '#6e7681' }}>{v.declarationRange?.startLine ?? '—'}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Methods section */}
        {(filter === 'all' || filter === 'methods') && methods.length > 0 && (
          <>
            <SectionHeader title="Methods" count={methods.length} icon="⚙️" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#161b22', fontSize: '10px', color: '#6e7681' }}>
                  <Th>Name</Th><Th>Return</Th><Th>Params</Th><Th>Modifiers</Th><Th>Line</Th>
                </tr>
              </thead>
              <tbody>
                {methods.map(m => (
                  <tr key={m.id}
                    style={{ borderBottom: '1px solid #21262d', cursor: 'pointer', fontSize: '11px' }}
                  >
                    <Td>
                      <span style={{ fontFamily: 'monospace', color: '#f59e0b', fontWeight: 600 }}>
                        {m.name}
                        {m.isRecursive && <span style={{ color: '#e879f9', marginLeft: '4px' }}>⟲</span>}
                      </span>
                    </Td>
                    <Td><span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{m.returnType}</span></Td>
                    <Td><span style={{ color: '#8b949e' }}>{m.parameters.length}</span></Td>
                    <Td><span style={{ color: '#6e7681', fontSize: '10px' }}>{m.modifiers.join(' ')}</span></Td>
                    <Td><span style={{ color: '#6e7681' }}>{m.range?.startLine ?? '—'}</span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Classes section */}
        {(filter === 'all' || filter === 'classes') && classes.length > 0 && (
          <>
            <SectionHeader title="Classes" count={classes.length} icon="📐" />
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#161b22', fontSize: '10px', color: '#6e7681' }}>
                  <Th>Name</Th><Th>Kind</Th><Th>Extends</Th><Th>Implements</Th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d', fontSize: '11px' }}>
                    <Td><span style={{ fontFamily: 'monospace', color: '#06b6d4', fontWeight: 600 }}>{c.name}</span></Td>
                    <Td><span style={{ color: '#6e7681' }}>{c.kind}</span></Td>
                    <Td><span style={{ color: '#8b949e' }}>{c.superclassName ?? '—'}</span></Td>
                    <Td><span style={{ color: '#8b949e', fontSize: '10px' }}>
                      {c.interfaceNames?.join(', ') ?? '—'}
                    </span></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Imports */}
        {filter === 'all' && symbols.imports.length > 0 && (
          <>
            <SectionHeader title="Imports" count={symbols.imports.length} icon="📥" />
            <div style={{ padding: '4px 10px' }}>
              {symbols.imports.map(imp => (
                <div key={imp.id} style={{ fontSize: '11px', fontFamily: 'monospace',
                  color: '#6e7681', lineHeight: '1.8' }}>
                  <span style={{ color: '#c792ea' }}>import</span>{' '}
                  {imp.isStatic && <span style={{ color: '#c792ea' }}>static </span>}
                  <span style={{ color: '#e6edf3' }}>{imp.importDeclaration}</span>
                  {imp.isAsterisk && <span style={{ color: '#8b949e' }}>.*</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, count, icon }: { title: string; count: number; icon: string }) {
  return (
    <div style={{ padding: '5px 10px', background: '#161b22', borderBottom: '1px solid #21262d',
      fontSize: '10px', fontWeight: 700, color: '#6e7681', textTransform: 'uppercase',
      letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      <span>{icon}</span>
      {title}
      <span style={{ background: '#21262d', borderRadius: '10px', padding: '0 6px', fontWeight: 600 }}>
        {count}
      </span>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: '4px 8px' }}>{children}</td>;
}

function StorageTag({ kind }: { kind: string }) {
  const tags: Record<string, { label: string; class: string }> = {
    PRIMITIVE_STACK: { label: 'stack', class: 'tag-primitive' },
    REFERENCE_STACK: { label: 'ref', class: 'tag-reference' },
    STRING_POOL: { label: 'pool', class: 'tag-string' },
    ARRAY_HEAP: { label: 'array', class: 'tag-array' },
    STATIC_AREA: { label: 'static', class: 'tag-stack' },
    UNKNOWN: { label: '?', class: 'tag-reference' },
  };
  const t = tags[kind] ?? { label: kind, class: '' };
  return <span className={`tag ${t.class}`}>{t.label}</span>;
}
