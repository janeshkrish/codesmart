import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';

export function TooltipOverlay() {
  const { showTooltip, tooltipContent, tooltipPosition } = useIdeStore();

  return (
    <AnimatePresence>
      {showTooltip && tooltipPosition && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 4 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999,
            background: '#1c2128',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#e6edf3',
            maxWidth: '280px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {tooltipContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
