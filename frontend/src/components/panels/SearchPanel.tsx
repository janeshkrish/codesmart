import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

export function SearchPanel() {
  const { sourceCode, highlightRange } = useIdeStore();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return sourceCode.split('\n').flatMap((line, index) => {
      const column = line.toLowerCase().indexOf(needle);
      return column < 0 ? [] : [{ line: index + 1, column: column + 1, text: line.trim() || '(blank line)' }];
    }).slice(0, 100);
  }, [query, sourceCode]);

  return <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', gap: '8px', color: '#e6edf3' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #30363d', borderRadius: '5px', padding: '5px 8px', background: '#161b22' }}>
      <Search size={13} color="#8b949e" />
      <input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder="Find in current Java file" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: '#e6edf3', fontSize: '12px' }} />
    </label>
    <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {query && results.length === 0 && <span style={{ color: '#6e7681', padding: '8px' }}>No matches</span>}
      {results.map(result => <button key={`${result.line}-${result.column}`} onClick={() => highlightRange({ startLine: result.line, startColumn: result.column, endLine: result.line, endColumn: result.column + query.length })} style={{ textAlign: 'left', border: 0, borderRadius: '4px', background: 'transparent', color: '#8b949e', padding: '6px 8px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
        <span style={{ color: '#06b6d4' }}>Ln {result.line}</span> {result.text}
      </button>)}
    </div>
  </div>;
}
