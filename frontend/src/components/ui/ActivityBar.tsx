import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Search, GitBranch, Play, 
  Box, Settings, ChevronLeft, ChevronRight,
  Terminal, AlertTriangle, Zap, BarChart2
} from 'lucide-react';

interface ActivityBarProps {
  activeActivity: string;
  onActivityChange: (activity: string) => void;
}

const ACTIVITY_ITEMS = [
  { id: 'explorer', icon: FileText, title: 'Explorer (Ctrl+Shift+E)', badge: 0 },
  { id: 'search', icon: Search, title: 'Search (Ctrl+Shift+F)', badge: 0 },
  { id: 'source-control', icon: GitBranch, title: 'Source Control (Ctrl+Shift+G)', badge: 0 },
  { id: 'run-debug', icon: Play, title: 'Run and Debug (Ctrl+Shift+D)', badge: 0 },
  { id: 'terminal', icon: Terminal, title: 'Terminal (Ctrl+`)', badge: 0 },
  { id: 'problems', icon: AlertTriangle, title: 'Problems (Ctrl+Shift+M)', badge: 0 },
  { id: 'output', icon: BarChart2, title: 'Output', badge: 0 },
  { id: 'extensions', icon: Box, title: 'Extensions (Ctrl+Shift+X)', badge: 0 },
  { id: 'settings', icon: Settings, title: 'Settings (Ctrl+,)', badge: 0 },
];

export function ActivityBar({ activeActivity, onActivityChange }: ActivityBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  return (
    <div className="activity-bar" style={{
      width: collapsed ? '48px' : '72px',
      height: '100%',
      background: '#161b22',
      borderRight: '1px solid #21262d',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 0',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Top activities */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        width: '100%',
        padding: '0 8px',
      }}>
        {ACTIVITY_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeActivity === item.id;
          
          return (
            <button
              key={item.id}
              className={`activity-item ${isActive ? 'active' : ''}`}
              onClick={() => onActivityChange(item.id)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={!collapsed ? item.title : undefined}
              style={{
                width: '100%',
                height: '44px',
                border: 'none',
                background: isActive ? '#0d1117' : 'transparent',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: collapsed ? '0' : '0 8px',
                color: isActive ? '#7c3aed' : '#8b949e',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
                borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
              }}
            >
              <Icon 
                size={20} 
                style={{ 
                  flexShrink: 0,
                  color: isActive ? '#7c3aed' : '#8b949e',
                }} 
              />
              {!collapsed && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}>
                  {item.id.charAt(0).toUpperCase() + item.id.slice(1).replace('-', ' ')}
                </span>
              )}
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  background: '#f85149',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}>
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Collapse/Expand button */}
      <div style={{ marginTop: 'auto', paddingBottom: '8px' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%',
            height: '32px',
            border: 'none',
            background: 'transparent',
            color: '#6e7681',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '8px',
            padding: collapsed ? '0' : '0 8px',
            transition: 'all 0.15s ease',
          }}
          title={collapsed ? 'Expand Activity Bar' : 'Collapse Activity Bar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span style={{ fontSize: '11px', textTransform: 'uppercase' }}>Activity Bar</span>}
        </button>
      </div>
      
      {/* Accounts / Profiles */}
      <div style={{ paddingTop: '8px', borderTop: '1px solid #21262d', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button style={{
          width: '32px',
          height: '32px',
          border: 'none',
          background: 'transparent',
          borderRadius: '6px',
          color: '#6e7681',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }} title="Accounts">
          <span style={{ fontSize: '16px' }}>👤</span>
        </button>
      </div>
    </div>
  );
}