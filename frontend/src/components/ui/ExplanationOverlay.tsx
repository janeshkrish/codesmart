import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';

export function ExplanationOverlay() {
  const { showExplanation, explanationTitle, explanationText, hideExplanationPanel, setActiveBottomTab } = useIdeStore();

  const handleViewInPanel = () => {
    setActiveBottomTab('explanation');
  };

  return (
    <AnimatePresence>
      {showExplanation && explanationText && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: '36px',  // above status bar
            right: '16px',
            zIndex: 1000,
            width: '320px',
            maxHeight: '280px',
            background: '#1c2128',
            border: '1px solid #7c3aed',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(124,58,237,0.3), 0 0 0 1px rgba(124,58,237,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            background: 'rgba(124,58,237,0.15)',
            borderBottom: '1px solid rgba(124,58,237,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💡</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3',
                fontFamily: 'JetBrains Mono, monospace' }}>
                {explanationTitle}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleViewInPanel}
                style={{ background: 'transparent', border: 'none', color: '#7c3aed',
                  cursor: 'pointer', fontSize: '10px' }}
                title="View in panel"
              >
                expand
              </button>
              <button
                onClick={hideExplanationPanel}
                style={{ background: 'transparent', border: 'none', color: '#8b949e',
                  cursor: 'pointer', fontSize: '14px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '10px 12px',
            fontSize: '12px',
            color: '#c9d1d9',
            lineHeight: '1.65',
            overflowY: 'auto',
            maxHeight: '220px',
          }}>
            {explanationText}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
