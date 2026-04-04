import React from 'react';
import { Tag, Typography } from 'antd';
import type { AppNotification } from '../../../hooks/useWebSocket';
import { SEVERITY_CONFIG } from '../../atoms/SeverityBadge';

const { Text } = Typography;

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IE', { day: '2-digit', month: 'short' });
}

interface NotificationRowProps {
  notification: AppNotification;
  onClick: (n: AppNotification) => void;
}

/**
 * Molecule — a single notification list item.
 * Composes: severity dot (from SEVERITY_CONFIG atom), title, description, SeverityBadge tag, unread dot.
 * Used in NotificationPanel.
 */
const NotificationRow: React.FC<NotificationRowProps> = ({ notification: n, onClick }) => {
  const sev = SEVERITY_CONFIG[n.severity];

  return (
    <div
      onClick={() => onClick(n)}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
        background: n.read ? '#fff' : '#fafaf9',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ff')}
      onMouseLeave={(e) => (e.currentTarget.style.background = n.read ? '#fff' : '#fafaf9')}
    >
      {/* Severity dot */}
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: sev.color,
          flexShrink: 0,
          marginTop: 6,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: '#111827', lineHeight: 1.4 }}>
            {n.title}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {formatTime(n.timestamp)}
          </Text>
        </div>
        <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginTop: 2, lineHeight: 1.5 }}>
          {n.description}
        </Text>
        <div style={{ marginTop: 6 }}>
          <Tag
            style={{
              fontSize: 10,
              padding: '1px 6px',
              margin: 0,
              borderRadius: 10,
              color: sev.color,
              background: sev.bg,
              border: `1px solid ${sev.color}22`,
            }}
          >
            {sev.label}
          </Tag>
        </div>
      </div>

      {/* Unread indicator */}
      {!n.read && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#7c3aed',
            flexShrink: 0,
            marginTop: 8,
          }}
        />
      )}
    </div>
  );
};

export default NotificationRow;
