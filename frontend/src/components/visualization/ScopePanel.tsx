import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import type { ScopeInfo } from '../../types';

// ============================================================
// Scope Panel — nested scope visualization
// ============================================================

export function ScopePanel() {
  const { analysisResult, selectedScopeId, selectScope } = useIdeStore();
  const scopes: ScopeInfo[] = analysisResult?.scopes ?? [];

  const rootScopes = scopes.filter(s => !s.parentScopeId);

  if (scopes.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>🔭</div>
        <div style={{ fontSize: '13px' }}>Write code with nested scopes to visualize them</div>
      </div>
    );
  }

  const scopeMap = new Map(scopes.map(s => [s.id, s]));

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px' }}>
      <div style={{ fontSize: '11px', color: '#6e7681', marginBottom: '12px' }}>
        Click a scope to highlight the corresponding code in the editor
      </div>
      {rootScopes.map(scope => (
        <ScopeBlock
          key={scope.id}
          scope={scope}
          scopeMap={scopeMap}
          selectedId={selectedScopeId}
          onSelect={selectScope}
        />
      ))}
    </div>
  );
}

function ScopeBlock({ scope, scopeMap, selectedId, onSelect, depth = 0 }: {
  scope: ScopeInfo;
  scopeMap: Map<string, ScopeInfo>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  depth?: number;
}) {
  const isSelected = selectedId === scope.id;
  const childScopes: ScopeInfo[] = scope.childScopeIds
    .map((id: string) => scopeMap.get(id))
    .filter((s): s is ScopeInfo => s != null);

  const typeIcons: Record<string, string> = {
    CLASS: '📦', INTERFACE: '📐', METHOD: '⚙️', CONSTRUCTOR: '🔨',
    BLOCK: '{}', FOR_STMT: '🔄', WHILE_STMT: '🔁', DO_STMT: '🔁',
    TRY_STMT: '🛡️', CATCH_CLAUSE: '🚨', LAMBDA: 'λ',
    COMPILATION_UNIT: '📄', SWITCH: '⇨',
  };
  const icon = typeIcons[scope.type] ?? '●';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.05 }}
      style={{ marginLeft: depth > 0 ? '16px' : '0', marginBottom: '6px' }}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onSelect(isSelected ? null : scope.id)}
        style={{
          background: isSelected
            ? `${scope.color?.replace('20', '40') ?? 'rgba(124,58,237,0.2)'}`
            : scope.color ?? 'rgba(22,27,34,0.5)',
          border: `1px solid ${isSelected ? '#7c3aed' : '#30363d'}`,
          borderLeft: `3px solid ${isSelected ? '#7c3aed' : scope.color?.replace('20', '80') ?? '#30363d'}`,
          borderRadius: '6px',
          padding: '6px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#e6edf3' }}>{scope.name}</span>
            <span style={{ fontSize: '10px', color: '#6e7681', background: '#21262d',
              padding: '0 4px', borderRadius: '3px' }}>
              {scope.type}
            </span>
            <span style={{ fontSize: '10px', color: '#444c56' }}>depth: {scope.depth}</span>
          </div>
          {scope.range && (
            <div style={{ fontSize: '10px', color: '#6e7681', marginTop: '1px' }}>
              Lines {scope.range.startLine}–{scope.range.endLine}
            </div>
          )}
        </div>

        {/* Variable count */}
        {scope.variables.length > 0 && (
          <div style={{
            background: '#21262d', borderRadius: '10px', padding: '1px 8px',
            fontSize: '10px', color: '#8b949e', flexShrink: 0,
          }}>
            {scope.variables.length} var{scope.variables.length !== 1 ? 's' : ''}
          </div>
        )}
      </motion.div>

      {/* Variables in this scope */}
      {isSelected && scope.variables.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginLeft: '16px', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}
        >
          {scope.variables.slice(0, 10).map((v: import('../../types').VariableInfo) => (
            <div key={v.id} style={{
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: '4px', padding: '3px 8px',
              fontSize: '10px', fontFamily: 'monospace', color: '#06b6d4',
            }}>
              {v.type} <span style={{ color: '#e6edf3' }}>{v.name}</span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Child scopes */}
      {childScopes.map((child: ScopeInfo) => (
        <ScopeBlock
          key={child.id}
          scope={child}
          scopeMap={scopeMap}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </motion.div>
  );
}
