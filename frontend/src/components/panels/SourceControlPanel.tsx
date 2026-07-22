import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, RefreshCw, ChevronDown, ChevronRight, Copy, Download, Trash2, AlertTriangle, Info, CheckCircle, XCircle, FileText, FolderOpen, GitBranch, ArrowUp, ArrowDown, Plus, Minus } from 'lucide-react';
import { useIdeStore } from '../../store/ideStore';

export function SourceControlPanel() {
  const [message, setMessage] = useState('');
  const [showChanges, setShowChanges] = useState(true);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117' }}>
      <div className="panel-header" style={{ padding: '8px', background: '#161b22', borderBottom: '1px solid #21262d' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitBranch size={14} color="#7c3aed" />
            <span className="panel-title">Source Control</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn btn-ghost btn-icon" title="Refresh" style={{ padding: '4px' }}>
              <RefreshCw size={12} />
            </button>
            <button className="btn btn-ghost btn-icon" title="New Repository" style={{ padding: '4px' }}>
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Message (press Ctrl+Enter to commit)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{
                flex: 1,
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '4px',
                color: '#e6edf3',
                fontSize: '12px',
                padding: '8px',
                outline: 'none',
              }}
              onKeyDown={e => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && false}
            />
            <button className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <CheckCircle size={14} />
              <span style={{ marginLeft: '4px' }}>Commit</span>
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>
            No changes staged
          </div>
        </div>

        <div style={{ borderTop: '1px solid #21262d', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ChevronDown size={12} onClick={() => setShowChanges(!showChanges)} style={{ cursor: 'pointer' }} />
            <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '11px', color: '#8b949e' }}>
              Changes (0)
            </span>
          </div>
          {showChanges && (
            <div style={{ paddingLeft: '16px', color: '#8b949e', fontSize: '12px' }}>
              No changes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}