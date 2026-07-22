import React from 'react';
import { Search, X, Filter, RefreshCw, ChevronDown, ChevronRight, Copy, Download, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

export function ProblemsPanel() {
  const { diagnostics, clearDiagnostics } = useIdeStore();
  
  const [filter, setFilter] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [groupBy, setGroupBy] = React.useState<'file' | 'severity'>('file');

  const filtered = React.useMemo(() => {
    return diagnostics
      .filter(d => {
        if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
        if (filter && !d.message.toLowerCase().includes(filter.toLowerCase()) && 
            !d.file.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }, [diagnostics, filter, severityFilter]);

  const grouped = React.useMemo(() => {
    if (groupBy === 'severity') {
      const groups: Record<string, typeof diagnostics> = { error: [], warning: [], info: [], hint: [] };
      filtered.forEach(d => groups[d.severity].push(d));
      return Object.entries(groups).filter(([, v]) => v.length > 0);
    }
    const groups: Record<string, typeof diagnostics> = {};
    filtered.forEach(d => {
      const key = d.file;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return Object.entries(groups);
  }, [filtered, groupBy]);

  const counts = React.useMemo(() => ({
    error: diagnostics.filter(d => d.severity === 'error').length,
    warning: diagnostics.filter(d => d.severity === 'warning').length,
    info: diagnostics.filter(d => d.severity === 'info').length,
    hint: diagnostics.filter(d => d.severity === 'hint').length,
  }), [diagnostics]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#0d1117', borderLeft: '1px solid #21262d', borderTop: '1px solid #21262d',
    }}>
      {/* Header */}
      <div className="panel-header" style={{ 
        justifyContent: 'space-between', 
        padding: '0 8px',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} color="#d29922" />
          <span className="panel-title">Problems</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Severity badges */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{
              padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
              fontWeight: 600, background: '#f8514920', color: '#f85149',
              border: '1px solid #f8514940',
            }}>
              {counts.error}
            </span>
            <span style={{
              padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
              fontWeight: 600, background: '#d2992220', color: '#d29922',
              border: '1px solid #d2992240',
            }}>
              {counts.warning}
            </span>
            <span style={{
              padding: '2px 6px', borderRadius: '3px', fontSize: '10px',
              fontWeight: 600, background: '#7c3aed20', color: '#7c3aed',
              border: '1px solid #7c3aed40',
            }}>
              {counts.info}
            </span>
          </div>
          
          <div style={{ width: '1px', height: '16px', background: '#30363d', margin: '0 8px' }} />
          
          {/* Filter input */}
          <div style={{ 
            display: 'flex', alignItems: 'center', background: '#0d1117', 
            border: '1px solid #30363d', borderRadius: '4px', padding: '2px 8px', gap: '4px'
          }}>
            <Search size={12} color="#8b949e" />
            <input 
              type="text" 
              placeholder="Filter problems..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: '#e6edf3',
                fontSize: '11px', width: '140px', outline: 'none',
              }}
            />
          </div>
          
          <button className="btn btn-ghost btn-icon" onClick={() => clearDiagnostics()} title="Clear All">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {grouped.length === 0 ? (
          <div style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center',
            color: '#6e7681', textAlign: 'center', padding: '24px'
          }}>
            <CheckCircle size={32} style={{ color: '#3fb950', marginBottom: '8px' }} />
            <span>No problems! 🎉</span>
            <p style={{ fontSize: '11px', marginTop: '4px', maxWidth: '200px' }}>
              {filter ? 'Try clearing the filter' : 'Your code is clean'}
            </p>
          </div>
        ) : (
          grouped.map(([key, items]) => (
            <div key={key} style={{ marginBottom: '8px' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '4px 8px', background: '#161b22', borderRadius: '4px',
                fontSize: '11px', fontWeight: 600, color: '#8b949e',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <span>{groupBy === 'severity' ? key.toUpperCase() : key}</span>
                <span style={{ 
                  padding: '1px 6px', borderRadius: '8px', fontSize: '9px',
                  background: '#30363d', color: '#e6edf3',
                }}>{items.length}</span>
              </div>
              {items.map((diag, idx) => (
                <div 
                  key={`${diag.file}-${diag.range.startLine}-${idx}`}
                  style={{ 
                    display: 'flex', gap: '8px', padding: '6px 8px',
                    marginTop: '2px', borderRadius: '4px',
                    background: idx % 2 === 0 ? 'transparent' : '#161b22',
                    borderLeft: `3px solid ${
                      diag.severity === 'error' ? '#f85149' :
                      diag.severity === 'warning' ? '#d29922' :
                      '#7c3aed'
                    }`,
                  }}
                >
                  <span style={{
                    fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                    color: diag.severity === 'error' ? '#f85149' :
                           diag.severity === 'warning' ? '#d29922' :
                           diag.severity === 'info' ? '#7c3aed' : '#8b949e',
                    marginTop: '2px',
                  }}>
                    {diag.severity[0].toUpperCase()}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      color: '#e6edf3', fontSize: '12px', lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {diag.message}
                    </div>
                    <div style={{ 
                      fontSize: '10px', color: '#8b949e', marginTop: '2px',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {diag.file}:{diag.range.startLine}:{diag.range.startColumn}
                      {diag.code && ` [${diag.code}]`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}