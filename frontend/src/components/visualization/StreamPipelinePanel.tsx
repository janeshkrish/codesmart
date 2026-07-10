import React from 'react';
import { motion } from 'framer-motion';
import { useIdeStore } from '../../store/ideStore';
import type { StreamPipeline, StreamStage } from '../../types';

// ============================================================
// Stream Pipeline Panel
// Shows animated pipeline: Source → Filter → Map → Collect
// ============================================================

const STAGE_COLORS: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  SOURCE:     { bg: 'rgba(63,185,80,0.12)', border: '#3fb950', color: '#3fb950', icon: '🌊' },
  FILTER:     { bg: 'rgba(248,81,73,0.12)', border: '#f85149', color: '#f85149', icon: '🔍' },
  MAP:        { bg: 'rgba(6,182,212,0.12)', border: '#06b6d4', color: '#06b6d4', icon: '🔄' },
  FLAT_MAP:   { bg: 'rgba(6,182,212,0.10)', border: '#06b6d4', color: '#06b6d4', icon: '🔀' },
  DISTINCT:   { bg: 'rgba(167,139,250,0.12)', border: '#a78bfa', color: '#a78bfa', icon: '✨' },
  SORTED:     { bg: 'rgba(210,153,34,0.12)', border: '#d29922', color: '#d29922', icon: '📊' },
  PEEK:       { bg: 'rgba(139,148,158,0.12)', border: '#8b949e', color: '#8b949e', icon: '👁️' },
  LIMIT:      { bg: 'rgba(124,58,237,0.12)', border: '#7c3aed', color: '#7c3aed', icon: '🔢' },
  SKIP:       { bg: 'rgba(124,58,237,0.10)', border: '#7c3aed', color: '#7c3aed', icon: '⏭️' },
  COLLECT:    { bg: 'rgba(240,136,62,0.12)', border: '#f0883e', color: '#f0883e', icon: '🗑️' },
  FOR_EACH:   { bg: 'rgba(240,136,62,0.10)', border: '#f0883e', color: '#f0883e', icon: '⚡' },
  REDUCE:     { bg: 'rgba(232,121,249,0.12)', border: '#e879f9', color: '#e879f9', icon: '⊕' },
  COUNT:      { bg: 'rgba(59,130,246,0.12)', border: '#3b82f6', color: '#3b82f6', icon: '🔢' },
  ANY_MATCH:  { bg: 'rgba(16,185,129,0.10)', border: '#10b981', color: '#10b981', icon: '?' },
  ALL_MATCH:  { bg: 'rgba(16,185,129,0.10)', border: '#10b981', color: '#10b981', icon: '✓' },
  FIND_FIRST: { bg: 'rgba(16,185,129,0.10)', border: '#10b981', color: '#10b981', icon: '1️⃣' },
  MIN:        { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', color: '#3b82f6', icon: '↓' },
  MAX:        { bg: 'rgba(59,130,246,0.10)', border: '#3b82f6', color: '#3b82f6', icon: '↑' },
  TO_LIST:    { bg: 'rgba(240,136,62,0.12)', border: '#f0883e', color: '#f0883e', icon: '📋' },
};

export function StreamPipelinePanel() {
  const { analysisResult } = useIdeStore();
  const pipelines = analysisResult?.streamPipelines ?? [];

  if (pipelines.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', color: '#6e7681' }}>
        <div style={{ fontSize: '32px' }}>🌊</div>
        <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '220px' }}>
          Use Stream API to visualize the pipeline
        </div>
        <div style={{ fontSize: '11px', color: '#444c56', fontFamily: 'monospace',
          background: '#161b22', padding: '8px 12px', borderRadius: '6px', textAlign: 'left' }}>
          list.stream()<br />
          &nbsp;&nbsp;.filter(n -&gt; n &gt; 0)<br />
          &nbsp;&nbsp;.map(n -&gt; n * 2)<br />
          &nbsp;&nbsp;.collect(toList())
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {pipelines.map((pipeline, pi) => (
        <PipelineViz key={pipeline.id} pipeline={pipeline} pipelineIndex={pi} />
      ))}
    </div>
  );
}

function PipelineViz({ pipeline, pipelineIndex }: { pipeline: StreamPipeline; pipelineIndex: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: pipelineIndex * 0.1 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
    >
      <div style={{ fontSize: '11px', color: '#6e7681', marginBottom: '12px', fontFamily: 'monospace' }}>
        Pipeline {pipelineIndex + 1} — {pipeline.stages.length} stages
      </div>

      {/* Pipeline stages */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0' }}>
        {pipeline.stages.map((stage, si) => (
          <React.Fragment key={stage.id}>
            <StageCard stage={stage} stageIndex={si} />
            {si < pipeline.stages.length - 1 && (
              <PipelineArrow />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Data flow animation */}
      <DataFlowAnimation stages={pipeline.stages} />
    </motion.div>
  );
}

function StageCard({ stage, stageIndex }: { stage: StreamStage; stageIndex: number }) {
  const config = STAGE_COLORS[stage.type] ?? { bg: '#21262d', border: '#30363d', color: '#8b949e', icon: '●' };
  const isTerminal = ['COLLECT', 'FOR_EACH', 'REDUCE', 'COUNT', 'ANY_MATCH', 'ALL_MATCH', 'FIND_FIRST',
    'MIN', 'MAX', 'TO_LIST'].includes(stage.type);
  const isIntermediate = !isTerminal && stage.type !== 'SOURCE';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: stageIndex * 0.08, type: 'spring', stiffness: 300 }}
      style={{
        background: config.bg,
        border: `2px solid ${config.border}`,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '110px',
        textAlign: 'center',
        position: 'relative',
        boxShadow: `0 0 12px ${config.border}20`,
      }}
    >
      {/* Badge */}
      <div style={{
        position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
        background: config.border, borderRadius: '10px',
        padding: '1px 6px', fontSize: '9px', color: '#0d1117', fontWeight: 700,
      }}>
        {isTerminal ? 'TERMINAL' : isIntermediate ? 'INTERMEDIATE' : 'SOURCE'}
      </div>

      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{config.icon}</div>
      <div style={{ color: config.color, fontWeight: 700, fontSize: '11px', fontFamily: 'monospace' }}>
        {stage.type.replace(/_/g, ' ')}
      </div>
      {stage.label && stage.label !== stage.type && (
        <div style={{ color: '#8b949e', fontSize: '10px', marginTop: '2px', fontFamily: 'monospace' }}>
          {stage.label.substring(0, 20)}
        </div>
      )}
      {stage.inputType && stage.outputType && (
        <div style={{ fontSize: '9px', color: '#444c56', marginTop: '3px' }}>
          {stage.inputType} → {stage.outputType}
        </div>
      )}
    </motion.div>
  );
}

function PipelineArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
      <svg width="40" height="20" viewBox="0 0 40 20">
        <defs>
          <marker id="sa" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#06b6d4" />
          </marker>
        </defs>
        <line x1="0" y1="10" x2="34" y2="10"
          stroke="#06b6d4" strokeWidth="2"
          markerEnd="url(#sa)"
          strokeDasharray="4 2"
        >
          <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
        </line>
      </svg>
    </div>
  );
}

function DataFlowAnimation({ stages }: { stages: StreamStage[] }) {
  return (
    <div style={{
      marginTop: '16px',
      padding: '10px 12px',
      background: '#0d1117',
      borderRadius: '6px',
      fontSize: '11px',
      color: '#8b949e',
      lineHeight: '1.8',
    }}>
      <div style={{ color: '#06b6d4', fontWeight: 600, marginBottom: '4px' }}>📖 How this pipeline works:</div>
      {stages.map((stage, i) => (
        <div key={stage.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <span style={{ color: '#444c56', fontFamily: 'monospace', fontSize: '10px', marginTop: '1px', flexShrink: 0 }}>
            {i + 1}.
          </span>
          <span>{getStageExplanation(stage)}</span>
        </div>
      ))}
    </div>
  );
}

function getStageExplanation(stage: StreamStage): string {
  switch (stage.type) {
    case 'SOURCE': return 'Creates a stream from the data source';
    case 'FILTER': return 'Keeps only elements that match the predicate (lazy)';
    case 'MAP': return 'Transforms each element to a new value (lazy)';
    case 'FLAT_MAP': return 'Maps each element to a stream, then flattens all streams into one';
    case 'DISTINCT': return 'Removes duplicate elements using equals() and hashCode()';
    case 'SORTED': return 'Sorts elements — requires buffering all elements (stateful)';
    case 'PEEK': return 'Performs an action on each element without modifying the stream';
    case 'LIMIT': return 'Truncates stream after N elements';
    case 'SKIP': return 'Skips the first N elements';
    case 'COLLECT': return 'Terminal: consumes all elements and builds a collection result';
    case 'FOR_EACH': return 'Terminal: performs an action on each element, returns void';
    case 'REDUCE': return 'Terminal: combines all elements into a single result';
    case 'COUNT': return 'Terminal: counts all elements';
    case 'ANY_MATCH': return 'Terminal: returns true if any element matches the predicate';
    case 'ALL_MATCH': return 'Terminal: returns true if all elements match the predicate';
    case 'FIND_FIRST': return 'Terminal: returns Optional of first matching element';
    case 'MIN': return 'Terminal: returns Optional minimum element';
    case 'MAX': return 'Terminal: returns Optional maximum element';
    case 'TO_LIST': return 'Terminal: collects to an unmodifiable List';
    default: return stage.label ?? '';
  }
}
