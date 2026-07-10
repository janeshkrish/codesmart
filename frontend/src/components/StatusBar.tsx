import React from 'react';
import { useIdeStore } from '../store/ideStore';

export function StatusBar() {
  const { wsConnected, analysisResult, cursorPosition, isAnalyzing, activeFile } = useIdeStore();

  const errors = analysisResult?.diagnostics.filter(d => d.severity === 'ERROR').length ?? 0;
  const warnings = analysisResult?.diagnostics.filter(d => d.severity === 'WARNING').length ?? 0;

  return (
    <div style={{
      height: '22px',
      background: '#7c3aed',
      display: 'flex',
      alignItems: 'center',
      padding: '0 10px',
      gap: '12px',
      fontSize: '11px',
      color: 'rgba(255,255,255,0.85)',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {/* WS connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: wsConnected ? '#3fb950' : '#f85149',
        }} />
        {wsConnected ? 'Live Analysis' : 'Disconnected'}
      </div>

      <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Active file */}
      {activeFile && (
        <span>{activeFile.name}</span>
      )}

      <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Errors / Warnings */}
      {errors > 0 && (
        <span style={{ color: '#fca5a5' }}>❌ {errors} error{errors !== 1 ? 's' : ''}</span>
      )}
      {warnings > 0 && (
        <span style={{ color: '#fde68a' }}>⚠️ {warnings} warning{warnings !== 1 ? 's' : ''}</span>
      )}
      {errors === 0 && warnings === 0 && analysisResult && (
        <span style={{ color: '#86efac' }}>✓ No issues</span>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>⟳ Analyzing...</span>
      )}

      <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Cursor position */}
      <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>

      <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

      {/* Language */}
      <span>Java 21</span>

      <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.2)' }} />

      <span>UTF-8</span>
    </div>
  );
}
