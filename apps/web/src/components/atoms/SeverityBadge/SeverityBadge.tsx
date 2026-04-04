import React from 'react';
import { Tag } from 'antd';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export const SEVERITY_CONFIG: Record<SeverityLevel, {
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'Critical' },
  high:     { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'High'     },
  medium:   { color: '#eab308', bg: '#fefce8', border: '#fde68a', label: 'Medium'   },
  low:      { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', label: 'Low'      },
  info:     { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'Info'     },
};

interface SeverityBadgeProps {
  severity: SeverityLevel;
  /** Optional size variant — defaults to 'sm' */
  size?: 'sm' | 'md';
}

/**
 * Atom — displays a severity level as a coloured tag.
 * Used in NotificationPanel, SystemActivityPage, and anywhere severity needs to be shown.
 */
const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'sm' }) => {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  return (
    <Tag
      style={{
        fontSize: size === 'md' ? 12 : 10,
        padding: size === 'md' ? '2px 10px' : '1px 6px',
        margin: 0,
        borderRadius: 10,
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </Tag>
  );
};

export default SeverityBadge;
