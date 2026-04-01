import React from 'react';
import { Drawer, Badge, Typography, Button, Empty, Tag } from 'antd';
import {
  BellOutlined, DeleteOutlined,
  WifiOutlined, DisconnectOutlined,
} from '@ant-design/icons';
import type { AppNotification } from '../../../hooks/useWebSocket';

const { Text } = Typography;

// ─── Severity config ──────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AppNotification['severity'], { color: string; bg: string; label: string }> = {
  critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critical' },
  high:     { color: '#f97316', bg: '#fff7ed', label: 'High'     },
  medium:   { color: '#eab308', bg: '#fefce8', label: 'Medium'   },
  low:      { color: '#3b82f6', bg: '#eff6ff', label: 'Low'      },
  info:     { color: '#22c55e', bg: '#f0fdf4', label: 'Info'     },
};

// ─── Time formatting ──────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-IE', { day: '2-digit', month: 'short' });
}

// ─── Single notification row ──────────────────────────────────────────────────

const NotificationRow: React.FC<{
  notification: AppNotification;
  onClick: (n: AppNotification) => void;
}> = ({ notification: n, onClick }) => {
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
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: sev.color,
        flexShrink: 0,
        marginTop: 6,
      }} />

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
          <Tag style={{
            fontSize: 10, padding: '1px 6px', margin: 0, borderRadius: 10,
            color: sev.color, background: sev.bg, border: `1px solid ${sev.color}22`,
          }}>
            {sev.label}
          </Tag>
        </div>
      </div>

      {/* Unread indicator */}
      {!n.read && (
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#7c3aed', flexShrink: 0, marginTop: 8,
        }} />
      )}
    </div>
  );
};

// ─── Panel component ──────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (n: AppNotification) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  open, onClose, notifications, unreadCount, connected, onMarkAllRead, onClearAll, onNotificationClick,
}) => {
  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BellOutlined style={{ fontSize: 16, color: '#7c3aed' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <Badge
              count={unreadCount}
              style={{ background: '#7c3aed', fontSize: 11 }}
            />
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {connected ? (
              <WifiOutlined style={{ fontSize: 12, color: '#22c55e' }} title="Connected" />
            ) : (
              <DisconnectOutlined style={{ fontSize: 12, color: '#ef4444' }} title="Disconnected" />
            )}
            <Text style={{ fontSize: 11, color: connected ? '#22c55e' : '#ef4444' }}>
              {connected ? 'Live' : 'Offline'}
            </Text>
          </div>
        </div>
      }
      placement="right"
      width={380}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 0 }, header: { borderBottom: '1px solid #f3f4f6', padding: '14px 16px' } }}
      footer={
        notifications.length > 0 ? (
          <div style={{ padding: '8px 0' }}>
            <Button
              size="small" icon={<DeleteOutlined />}
              onClick={onClearAll} danger block
              style={{ fontSize: 12 }}
            >
              Clear all
            </Button>
          </div>
        ) : null
      }
    >
      {notifications.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ fontSize: 13, color: '#9ca3af' }}>
                No notifications yet.<br />
                {connected ? '' : ''}
              </span>
            }
          />
        </div>
      ) : (
        <div style={{ overflowY: 'auto', height: '100%' }}>
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} onClick={onNotificationClick} />
          ))}
        </div>
      )}
    </Drawer>
  );
};

export default NotificationPanel;