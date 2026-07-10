import React from 'react';
import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import ReactMarkdown from 'react-markdown';

export function ExplanationPanel() {
  const { explanationTitle, explanationText, showExplanation, hideExplanationPanel,
    analysisResult, selectedAstNodeId } = useIdeStore();

  // If nothing is selected, show a prompt
  if (!showExplanation || !explanationText) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px' }}>
        <div style={{ fontSize: '32px' }}>💡</div>
        <div style={{ fontSize: '13px', color: '#6e7681', textAlign: 'center', lineHeight: '1.6' }}>
          Click on any variable, method, AST node, or scope to get a plain-English explanation
        </div>
        <div style={{ fontSize: '11px', color: '#444c56', textAlign: 'center' }}>
          Hover over variables in the editor to see type and memory info
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ height: '100%', overflowY: 'auto', padding: '12px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>💡</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3',
            fontFamily: 'JetBrains Mono, monospace' }}>
            {explanationTitle}
          </span>
        </div>
        <button onClick={hideExplanationPanel} style={{
          background: 'transparent', border: 'none', color: '#6e7681',
          cursor: 'pointer', fontSize: '14px', padding: '2px 6px',
          borderRadius: '4px',
        }}>×</button>
      </div>

      {/* Explanation content */}
      <div style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        color: '#e6edf3',
        lineHeight: '1.7',
      }}>
        <ExplanationContent text={explanationText} />
      </div>
    </motion.div>
  );
}

function ExplanationContent({ text }: { text: string }) {
  // Parse markdown-like bold/code in the text
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, i) => {
        if (!line) return <div key={i} style={{ height: '4px' }} />;

        // Parse **bold** and `code` inline
        const parts = parseInline(line);
        return (
          <div key={i} style={{ lineHeight: '1.7' }}>
            {parts.map((part, pi) => {
              if (part.type === 'bold') {
                return <strong key={pi} style={{ color: '#06b6d4' }}>{part.text}</strong>;
              }
              if (part.type === 'code') {
                return (
                  <code key={pi} style={{
                    background: '#21262d', border: '1px solid #30363d',
                    borderRadius: '3px', padding: '1px 5px',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '11px', color: '#f78c6c',
                  }}>{part.text}</code>
                );
              }
              return <span key={pi}>{part.text}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

type InlinePart = { type: 'text' | 'bold' | 'code'; text: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldStart = remaining.indexOf('**');
    const codeStart = remaining.indexOf('`');

    const nextSpecial = Math.min(
      boldStart >= 0 ? boldStart : Infinity,
      codeStart >= 0 ? codeStart : Infinity,
    );

    if (nextSpecial === Infinity) {
      parts.push({ type: 'text', text: remaining });
      break;
    }

    if (nextSpecial > 0) {
      parts.push({ type: 'text', text: remaining.substring(0, nextSpecial) });
      remaining = remaining.substring(nextSpecial);
    }

    if (remaining.startsWith('**')) {
      const end = remaining.indexOf('**', 2);
      if (end === -1) { parts.push({ type: 'text', text: remaining }); break; }
      parts.push({ type: 'bold', text: remaining.substring(2, end) });
      remaining = remaining.substring(end + 2);
    } else if (remaining.startsWith('`')) {
      const end = remaining.indexOf('`', 1);
      if (end === -1) { parts.push({ type: 'text', text: remaining }); break; }
      parts.push({ type: 'code', text: remaining.substring(1, end) });
      remaining = remaining.substring(end + 1);
    }
  }

  return parts;
}
